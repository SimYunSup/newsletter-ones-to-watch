import type { APIContext } from 'astro';
import rss from '@astrojs/rss';

import type { PaginationData } from '@/typescript/KVData';

export async function GET(context: APIContext) {
  const runtime = context.locals.runtime;
  const response = await runtime.env.CRAWLER_KV.get<PaginationData[]>(
    'pagination',
    'json',
  );
  const posts = response?.slice(0, 12);
  return rss({
    title: 'Ones To Watch For FrontEnd',
    description: '프론트엔드에 대한 정보들을 매주 큐레이션해드립니다.',
    // Pull in your project "site" from the endpoint context
    // https://docs.astro.build/en/reference/api-reference/#contextsite
    site: context.site!,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: posts?.map((post) => ({
      title: post.title,
      pubDate: new Date(post.date),
      // Compute RSS link from post `slug`
      // This example assumes all posts are rendered as `/blog/[slug]` routes
      link: `/news/post/${post.id}`,
    })) ?? [],
    // (optional) inject custom xml
    customData: `<language>ko-kr</language>`,
  });
}
