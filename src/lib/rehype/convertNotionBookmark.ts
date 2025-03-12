import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

interface Match {
  url: string;
  node: Element;
}
const TITLE_REGEX = /<title>(.*?)<\/title>/i;

export default function() {
  return async function (tree: Root) {
    const matches: Match[] = [];
    visit(tree, "element", function(node) {
      if (node.tagName === "bookmark") {
        node.tagName = "a";
        node.properties = {
          href: String(node.properties),
          class: "bookmark-link",
          target: "_blank",
          rel: "noreferrer",
        };
        matches.push({
          url: String(node.properties.href),
          node
        });
        node.children = [];
      }
    });
    await Promise.allSettled(matches.map(async (v) => fetch(
        v.url
      ).then(async (r) => {
        const child = {
          type: "text",
          value: "",
        } satisfies ElementContent;
        const text = await r.text();
        const match = text.match(TITLE_REGEX);
        if (match?.[1]) {
          child.value = match[1].trim() + " 🔗";
          v.node.children.push(child);
          return;
        }
        child.value = (new URL(v.url)).host + " 🔗";
        v.node.children.push(child);
      })
    ))
  }
}