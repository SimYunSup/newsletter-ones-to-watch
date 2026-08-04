// freeze-content.mjs — Notion 로더가 채운 Astro 콘텐츠 스토어를 파일로 동결한다.
//
// 마이그레이션 원칙: 레거시 호(123개)는 "다시 렌더"하지 않는다. 현행 notion-loader가
// 만든 rendered.html·data를 바이트 그대로 src/data/news/<id>.json 에 얼려서
// file-loader 가 그대로 store.set 한다 → 렌더 파이프라인 차이로 인한 패리티 리스크 0.
//
// 사용:
//   1) CONTENT_SOURCE=notion npx astro sync   # Notion에서 마지막 로드(스토어 갱신)
//   2) node scripts/freeze-content.mjs        # 스토어 → src/data/news/*.json
//
// 인코딩은 devalue(스토어와 동일) — 날짜(Date) 등 비-JSON 타입이 그대로 보존된다.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as devalue from 'devalue';

const STORE_CANDIDATES = ['node_modules/.astro/data-store.json', '.astro/data-store.json'];
const OUT_DIR = 'src/data/news';

async function loadStore() {
  for (const path of STORE_CANDIDATES) {
    try {
      const raw = JSON.parse(await readFile(path, 'utf8'));
      return { store: devalue.unflatten(raw), path };
    } catch {
      /* next candidate */
    }
  }
  throw new Error(`데이터 스토어가 없습니다(${STORE_CANDIDATES.join(', ')}) — 먼저 CONTENT_SOURCE=notion npx astro sync`);
}

const { store, path } = await loadStore();
const news = store.get('news');
if (!news?.size) throw new Error(`'news' 컬렉션이 비어 있습니다 (${path})`);

await mkdir(OUT_DIR, { recursive: true });
const keep = new Set();
let written = 0;
for (const entry of news.values()) {
  if (!entry.rendered?.html) {
    console.error(`[freeze] skip ${entry.id}: rendered.html 없음`);
    continue;
  }
  const file = `${entry.id}.json`;
  keep.add(file);
  const body = devalue.stringify({ id: entry.id, data: entry.data, digest: entry.digest, rendered: entry.rendered });
  await writeFile(join(OUT_DIR, file), body, 'utf8');
  written++;
}
// 스토어에서 사라진 페이지의 동결 파일 정리(.md 신규 호는 건드리지 않는다).
for (const file of await readdir(OUT_DIR)) {
  if (file.endsWith('.json') && !keep.has(file)) {
    await rm(join(OUT_DIR, file));
    console.error(`[freeze] removed stale ${file}`);
  }
}
console.log(`[freeze] ${written} entries → ${OUT_DIR} (source: ${path})`);
