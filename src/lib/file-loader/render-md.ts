import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Element, Root, Text } from "hast";

/**
 * 신규 호(md) 렌더러 — 레거시(notion-rehype-k) HTML과 같은 계약을 지킨다:
 *  - h2 에 id 부여 (교차링크 앵커; 레거시는 Notion 블록ID, 신규는 제목 슬러그)
 *  - `🔖 <url>` 단독 문단 → `<a class="bookmark-link" href>` (KV 크롤러 치환·스타일 동일)
 */

const BOOKMARK_RE = /^🔖\s+(\S+)\s*$/;

function textOf(node: Element): string {
  let out = "";
  visit(node, "text", (t: Text) => {
    out += t.value;
  });
  return out;
}

/** 제목 → 앵커 슬러그(한글 유지 — URL fragment 로 유효). 중복은 -2, -3 …. */
function slugify(text: string, used: Set<string>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "section";
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  used.add(slug);
  return slug;
}

function rehypeNewsletter() {
  return (tree: Root) => {
    const used = new Set<string>();
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "h2" || node.tagName === "h3") {
        node.properties ??= {};
        if (!node.properties.id) node.properties.id = slugify(textOf(node), used);
      }
      if (node.tagName === "p" && node.children.length === 1 && node.children[0]?.type === "text") {
        const match = BOOKMARK_RE.exec((node.children[0] as Text).value);
        if (match) {
          node.tagName = "a";
          node.properties = {
            href: match[1],
            class: "bookmark-link",
            target: "_blank",
            rel: "noreferrer",
          };
          node.children = [{ type: "text", value: match[1]! }];
        }
      }
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeNewsletter)
  .use(rehypeStringify);

export interface RenderedMarkdown {
  html: string;
  headings: Array<{ depth: number; text: string; slug: string }>;
}

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const html = String(await processor.process(markdown));
  // 레거시 rendered.metadata.headings 와 같은 모양(h2 기준 depth 0).
  const headings: RenderedMarkdown["headings"] = [];
  for (const m of html.matchAll(/<h([23]) id="([^"]+)">(.*?)<\/h[23]>/g)) {
    headings.push({
      depth: Number(m[1]) - 2,
      text: m[3]!.replace(/<[^>]+>/g, ""),
      slug: m[2]!,
    });
  }
  return { html, headings };
}

/** `---` 프론트매터(title/date/status 만) + 본문 분리. gray-matter 의존 없이 최소 구현. */
export function parseFrontmatter(source: string): {
  meta: Record<string, string>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { meta: {}, body: source };
  const meta: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z가-힣_-]+):\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]!] = kv[2]!.replace(/^["']|["']$/g, "");
  }
  return { meta, body: source.slice(match[0].length) };
}
