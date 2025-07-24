import type { APIContext } from 'astro';
import * as cheerio from 'cheerio';
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';

export async function GET(context: APIContext) {
  const runtime = context.locals.runtime;
  const collection = await getCollection('news');

  const response = collection.sort(
    (a, b) => (b.data.properties.날짜?.start.getTime() ?? 0) - (a.data.properties.날짜?.start.getTime() ?? 0))
    .slice(0, 12);
  const posts = response?.slice(0, 12);
  return rss({
    title: 'Ones To Watch For FrontEnd',
    description: '프론트엔드에 대한 정보들을 매주 큐레이션해드립니다.',
    // Pull in your project "site" from the endpoint context
    // https://docs.astro.build/en/reference/api-reference/#contextsite
    site: context.site!,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: posts?.map((post) => {
      const $ = cheerio.load(post.rendered?.html ?? '');
      const h2Texts = $('h2').map((i, el) => {
        return $(el).text();
      }).get();
      const description = h2Texts.join(',\n');
      return {
        title: post.data.properties.이름,
        description,
        author: "Ones To Watch For FrontEnd",
        pubDate: new Date(post.data.properties.날짜?.start ?? Date.now()),
        link: `/news/post/${post.id}`,
      }

    }) ?? [],
    // (optional) inject custom xml
    customData: `<language>ko-kr</language>`,
  });
}
