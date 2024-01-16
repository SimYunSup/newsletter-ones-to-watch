import rss from '@astrojs/rss';
import {notionClient} from "../lib/data.ts";

export async function GET(context) {
  const response = await notionClient.databases.query({
      database_id: import.meta.env.NOTION_DATABASE_ID,
      filter: {
        property: "Status",
        select: {
          equals: "New"
        }
      },
      sorts: [
        {
          property: "날짜",
          direction: "descending"
        }
      ],
      page_size: 12,
    },
  );
  const postData = response.results.map(v => ({
    id: v.id,
    value: {
      date: v.properties.날짜.date.start,
      name: v.properties.이름.title[0].plain_text,
    },
  }))
	return rss({
		title: 'Ones To Watch For FrontEnd',
		description: '프론트엔드에 대한 정보들을 매주 큐레이션해드립니다.',
		// Pull in your project "site" from the endpoint context
		// https://docs.astro.build/en/reference/api-reference/#contextsite
		site: context.site,
		// Array of `<item>`s in output xml
		// See "Generating items" section for examples using content collections and glob imports
		items: postData.data.map((post) => ({
			title: post.value.name,
			pubDate: post.value.date,
		// Compute RSS link from post `slug`
		// This example assumes all posts are rendered as `/blog/[slug]` routes
			link: `/news/list/${post.id}`,
		})),
		// (optional) inject custom xml
		customData: `<language>ko-kr</language>`,
	});
}
