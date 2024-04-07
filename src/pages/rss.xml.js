import rss from '@astrojs/rss';

export async function GET(context) {
  const runtime = context.locals.runtime;
  const response = await runtime.env.CRAWLER_KV.list({
    prefix: 'newsletter',
  });
  return rss({
    title: 'Ones To Watch For FrontEnd',
    description: '프론트엔드에 대한 정보들을 매주 큐레이션해드립니다.',
    // Pull in your project "site" from the endpoint context
    // https://docs.astro.build/en/reference/api-reference/#contextsite
    site: context.site,
    // Array of `<item>`s in output xml
    // See "Generating items" section for examples using content collections and glob imports
    items: response.map((post) => ({
      title: post.metadata.title,
      pubDate: post.metadata.targetDate,
      // Compute RSS link from post `slug`
      // This example assumes all posts are rendered as `/blog/[slug]` routes
      link: `/news/list/${post.name}`,
    })),
    // (optional) inject custom xml
    customData: `<language>ko-kr</language>`,
  });
}
