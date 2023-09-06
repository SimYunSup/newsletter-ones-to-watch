import rss from '@astrojs/rss';
import {ghostClient} from "../lib/ghost.ts";

export async function GET(context) {
	const posts = await ghostClient.posts
		.browse({
			limit: 12,
			filter: 'tags:news',
			fields:
				"id,feature_image,title,html,slug,published_at,excerpt",
		})
		.fetch();
	return rss({
		title: 'Ones To Watch For FrontEnd',
		description: '프론트엔드에 대한 정보들을 매주 큐레이션해드립니다.',
		// Pull in your project "site" from the endpoint context
		// https://docs.astro.build/en/reference/api-reference/#contextsite
		site: context.site,
		// Array of `<item>`s in output xml
		// See "Generating items" section for examples using content collections and glob imports
		items: posts.data.map((post) => ({
			title: post.title,
			pubDate: post.published_at,
		// Compute RSS link from post `slug`
		// This example assumes all posts are rendered as `/blog/[slug]` routes
			link: `/news/list/${post.id}`,
		})),
		// (optional) inject custom xml
		customData: `<language>ko-kr</language>`,
	});
}