import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

interface Match {
  url: string;
  node: Element;
}

export default function () {
  return async function (tree: Root) {
    visit(tree, "element", function (node) {
      if (node.tagName === "h2") {
        node.properties.id = node.properties["data-notion-block-id"];
      }
      if (node.tagName === "bookmark") {
        node.tagName = "a";
        node.properties = {
          href: String(node.properties),
          class: "bookmark-link",
          target: "_blank",
          rel: "noreferrer",
        };
        node.children = [
          {
            type: "text",
            value: String(node.properties.href),
          }
        ];
      }
    });
  }
}