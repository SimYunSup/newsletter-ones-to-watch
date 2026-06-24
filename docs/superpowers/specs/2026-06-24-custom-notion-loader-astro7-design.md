# Custom Notion Loader + Astro 7 Upgrade — Design

Date: 2026-06-24

## Problem

`notion-astro-loader@0.4.0` (latest) caps the project at Astro 5 (peer dep `astro ^4.14 || ^5`)
and bundles `@notionhq/client@2 → node-fetch@2`, whose gzip decoding throws "Premature close"
on Node ≥24. This blocks both the Node 24 standardization and the Astro 7 upgrade
(`@astrojs/cloudflare@14` and `@astrojs/mdx@7` require `astro ^7`).

## Goal

Replace the external loader with a repo-owned custom loader so we can:
- Drop `node-fetch@2` (use `@notionhq/client@5`, which uses native fetch).
- Remove the Astro peer-dep ceiling and upgrade to Astro 7.
- Preserve the existing rendered output exactly (headings/TOC, KaTeX, Notion bookmarks, images,
  block IDs, no slug anchors).

## Approach: fork `notion-astro-loader` into `src/lib/notion-loader/`

Vendor the package's source (it is small, ~600 lines) and adapt it:

- `format.ts`, `schemas/{file,raw-properties,transformed-properties,page,index}.ts` — copied verbatim
  (pure Zod + `astro:assets`, no Astro-version coupling).
- `render.ts` — copied, with our existing patch inlined: `notion-rehype-k` with `enableBlockId: true`
  and `rehype-slug` dropped (it was commented out by the patch and never used). Keeps
  `rehype-toc` → `rehype-katex` → user rehype plugins → `rehype-stringify`. Block fetching uses
  `iteratePaginatedAPI` / `isFullBlock` / `blocks.children.list`, all still exported by v5.
- `database-properties.ts` — **adapted for v5**: build the Zod schema from
  `client.dataSources.retrieve({ data_source_id }).properties` (v5 moved properties off the database
  object onto the data source).
- `loader.ts` — **adapted for v5**: construct `Client` from `@notionhq/client@5`, resolve the
  `data_source_id` once via `databases.retrieve({ database_id }).data_sources[0].id` (memoized), and
  query with `dataSources.query({ data_source_id, filter, sorts, filter_properties, archived })`
  (`databases.query` was removed in v5). Filter/sorts payload format is unchanged from v4.
- `index.ts` — re-export `notionLoader`, `notionPageSchema`, `propertySchema`,
  `transformedPropertySchema`, `richTextToPlainText`, `fileToUrl`, `fileToImageAsset`.

### Dependencies

- Remove `notion-astro-loader` and its `pnpm.patchedDependencies` entry + `patches/` file.
- Promote `@notionhq/client` to `dependencies` (^5.22.0) — it is now imported by the build-time loader.
- Add direct deps matching the loader's pinned ranges to preserve rendering behavior:
  `notion-rehype-k@^1.1.6`, `rehype-katex@^6.0.0`, `rehype-stringify@^10.0.0`,
  `@jsdevtools/rehype-toc@^3.0.2`, `unified@^11.0.0`. (`rehype-slug` / `slug` dropped — unused.)

### Wiring

- `src/content.config.ts`: import from `@/lib/notion-loader` instead of `notion-astro-loader`;
  drop the temporary native-fetch injection (v5 no longer uses node-fetch). Filter
  (`Status` select == "New") and schema mapping (`이름`→title/Name, `Status`→select, `날짜`→date) unchanged.

### Astro 7 bump

- `astro ^7.0.2`, `@astrojs/cloudflare ^14.0.0`, `@astrojs/mdx ^7.0.0` (`wrangler ^4.104` already
  satisfies the adapter's `^4.83`). Address any Astro 5→7 breaking changes in `astro.config.mjs`
  (adapter options, image config, vite ssr.external) and the content-layer `Loader` interface, iterating on build.

## Out of scope

- Auto-generated loader schema is preserved for parity but is overridden by the explicit
  `schema` in `content.config.ts` (Astro uses the collection schema when both are present).
- Cleaning unused `~/Projects` (separate task).

## Verification (전수분석)

Build on Node 24; dev-server smoke test of every route (`/`→`/home`, `/news/list/N`, individual
posts, `/rss.xml`, `/about`, 404); confirm Notion content renders (headings, KaTeX, bookmarks,
images); worker typecheck; both `wrangler deploy --dry-run`.
