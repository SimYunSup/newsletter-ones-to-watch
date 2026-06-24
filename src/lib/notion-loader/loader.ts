import { Client, isFullPage, iteratePaginatedAPI } from "@notionhq/client";
import type { Loader } from "astro/loaders";
import { buildProcessor, NotionPageRenderer } from "./render";

/**
 * Notion loader for the Astro Content Layer API.
 *
 * Forked from `notion-astro-loader` and adapted to `@notionhq/client` v5, which
 * replaced `databases.query` with the data-source API. Pages are loaded from the
 * first data source of the given database, then rendered as collection entries.
 *
 * @param options Takes the same options as `dataSources.query` plus the `Client`
 *   constructor options (`auth`, `fetch`, ...).
 */
export function notionLoader({
  database_id,
  filter_properties,
  sorts,
  filter,
  archived,
  rehypePlugins = [],
  ...clientOptions
}: {
  database_id: string;
  filter_properties?: string[];
  sorts?: any;
  filter?: any;
  archived?: boolean;
  rehypePlugins?: any[];
  [key: string]: any;
}): Loader {
  const notionClient = new Client(clientOptions);

  // A Notion database can contain multiple data sources; query the first one.
  // Resolved lazily and memoized so both schema() and load() share one lookup.
  let dataSourceIdPromise: Promise<string> | undefined;
  const resolveDataSourceId = () => {
    dataSourceIdPromise ??= (async () => {
      const database: any = await notionClient.databases.retrieve({
        database_id,
      });
      const dataSources =
        "data_sources" in database ? database.data_sources : [];
      if (!dataSources || dataSources.length === 0) {
        throw new Error(
          `Notion database ${database_id} has no data sources to load.`
        );
      }
      return dataSources[0].id as string;
    })();
    return dataSourceIdPromise;
  };

  const resolvedRehypePlugins = Promise.all(
    rehypePlugins.map(async (config) => {
      let plugin;
      let options;
      if (Array.isArray(config)) {
        [plugin, options] = config;
      } else {
        plugin = config;
      }
      if (typeof plugin === "string") {
        plugin = (await import(/* @vite-ignore */ plugin)).default;
      }
      return [plugin, options] as const;
    })
  );
  const processor = buildProcessor(resolvedRehypePlugins);

  return {
    name: "notion-loader",
    // No `schema` here: Astro 7 ignores function schemas, and the collection in
    // content.config.ts already supplies the schema (which always took priority).
    async load({ store, logger, parseData }) {
      logger.info("Loading notion pages");
      const dataSourceId = await resolveDataSourceId();

      const existingPageIds = new Set(store.keys());
      const renderPromises: Promise<void>[] = [];

      const pages = iteratePaginatedAPI(notionClient.dataSources.query, {
        data_source_id: dataSourceId,
        filter_properties,
        sorts,
        filter,
        archived,
      });

      for await (const page of pages) {
        if (!isFullPage(page)) {
          continue;
        }
        existingPageIds.delete(page.id);
        const existingPage = store.get(page.id);
        // If the page has been updated, re-render it
        if (existingPage?.digest !== page.last_edited_time) {
          const renderer = new NotionPageRenderer(notionClient, page, logger);
          const data = await parseData(await renderer.getPageData());
          const renderPromise = renderer.render(processor).then((rendered) => {
            store.set({
              id: page.id,
              digest: page.last_edited_time,
              data,
              rendered,
            });
          });
          renderPromises.push(renderPromise);
        }
      }

      // Remove any pages that have been deleted
      for (const deletedPageId of existingPageIds) {
        store.delete(deletedPageId);
      }

      // Wait for rendering to complete
      await Promise.all(renderPromises);
    },
  };
}
