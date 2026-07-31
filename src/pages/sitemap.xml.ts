import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

const STATIC_PATHS = ['/', '/home/', '/about/'];

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function GET(context: APIContext) {
  const site = context.site!;
  const collection = await getCollection('news');

  const entries = [
    ...STATIC_PATHS.map((path) => ({ loc: new URL(path, site).href, lastmod: undefined as string | undefined })),
    ...collection
      .sort((a, b) => (b.data.properties.날짜?.start.getTime() ?? 0) - (a.data.properties.날짜?.start.getTime() ?? 0))
      .map((post) => ({
        loc: new URL(`/news/post/${post.id}/`, site).href,
        lastmod: post.data.properties.날짜?.start.toISOString().slice(0, 10),
      })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(({ loc, lastmod }) =>
      `<url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`,
    ),
    '</urlset>',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
