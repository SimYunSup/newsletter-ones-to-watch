![thumbnail](./public/images/thumbnail.png)

# Ones To Watch For FrontEnd (KR)

**Ones to Watch for FE**는 주목할 만한 블로그를 모아두는 웹사이트입니다.
개인적인 관심과 기록의 의미로 시작했으며, 프론트엔드 개발자에게 인사이트가 될 수 있을만한 글을 소개합니다.

대부분은 기술적인 깊이가 있거나, 방향성을 고민하게 만드는 글들입니다. 선정 기준은 완전히 주관적이며, 주 1회 아카이브에 가까운 형태로 운영됩니다.

## Contribution

### 코드 실행

Node.js(fnm 권장)가 설치되어야 합니다.

```bash
corepack enable # 만약 pnpm이 없다면

pnpm i

pnpm dev
```

### 컨텐츠

직접적인 컨텐츠 기여는 [심윤섭](https://github.com/SimYunSup)이나 이슈를 통해 제안주시면 감사하겠습니다!

## License

MIT License
## 컨텐츠 소스 (2026-08 Notion 마이그레이션)

정본은 이 레포의 `src/data/news/` 입니다. Notion은 읽기전용 백업으로 동결됐습니다.

- `src/data/news/<uuid>.json` — 레거시 호(123개). 마지막 Notion 렌더 결과를
  `scripts/freeze-content.mjs` 로 동결한 것(devalue 인코딩). **불변 아카이브 취급** —
  기존 URL(`/news/post/<uuid>`)과 교차링크 앵커(Notion H2 블록ID)가 그대로 보존됩니다.
- `src/data/news/<slug>.md` — 신규 호. 파일명이 곧 URL 슬러그(`/news/post/<slug>`)입니다.

### 신규 호 작성 형식

```md
---
title: 2026-08-08 호 제목
date: 2026-08-08
---

## 글 제목            <!-- h2 id = 제목 슬러그 (교차링크 앵커) -->

🔖 https://example.com/article   <!-- 단독 문단 → 북마크 카드(bookmark-link) -->

요약 문단.

> 큐레이터 코멘트.
```

발행 = 커밋 후 `pnpm deploy`. 별도 서버·CMS 없음.

### 유지보수 스크립트

- `node scripts/verify-crosslinks.mjs` — 호 간 교차링크(대상 페이지·앵커) 전수 검증.
- 레거시 호를 부득이 고칠 때: Notion 백업에서 수정 →
  `CONTENT_SOURCE=notion npx astro sync && node scripts/freeze-content.mjs` 로 재동결.
  (`CONTENT_SOURCE=notion` 이 아니면 빌드는 Notion에 일절 접근하지 않습니다.)
