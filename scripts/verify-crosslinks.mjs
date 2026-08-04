// verify-crosslinks.mjs — 동결 콘텐츠의 호 간 교차링크 전수 검증.
//
// 코퍼스의 모든 `…/news/post/<id>#<anchor>` 링크에 대해
//   1) 대상 엔트리(src/data/news/<id>.json|.md)가 존재하고
//   2) 대상 HTML 에 id="<anchor>" 가 실제로 있는지
// 확인한다. [slug].astro 는 대시 없는 32자 id 도 리다이렉트로 받으므로 동일 규칙으로
// 정규화한다. 실패 목록을 출력하고 하나라도 깨졌으면 exit 1.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as devalue from 'devalue';

const DIR = 'src/data/news';
const LINK_RE = /https?:\/\/ones-to-watch\.ethansup\.net\/news\/post\/([0-9a-fA-F-]+)(?:#([0-9a-fA-F-]+))?/g;

const dash = (id) =>
  id.includes('-') || id.length !== 32
    ? id.toLowerCase()
    : `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`.toLowerCase();

const htmlById = new Map();
for (const file of await readdir(DIR)) {
  if (!file.endsWith('.json')) continue;
  const entry = devalue.parse(await readFile(join(DIR, file), 'utf8'));
  htmlById.set(entry.id.toLowerCase(), entry.rendered.html);
}

let links = 0;
const broken = [];
for (const [sourceId, html] of htmlById) {
  for (const m of html.matchAll(LINK_RE)) {
    links++;
    const targetId = dash(m[1]);
    const anchor = m[2]?.toLowerCase();
    const targetHtml = htmlById.get(targetId);
    if (targetHtml === undefined) {
      broken.push(`${sourceId} → ${m[0]} (대상 페이지 없음)`);
      continue;
    }
    if (anchor && !targetHtml.includes(`id="${anchor}"`)) {
      broken.push(`${sourceId} → ${m[0]} (앵커 없음)`);
    }
  }
}

console.log(`[crosslinks] entries=${htmlById.size} links=${links} broken=${broken.length}`);
for (const b of broken) console.error(`  ✗ ${b}`);
process.exit(broken.length ? 1 : 0);
