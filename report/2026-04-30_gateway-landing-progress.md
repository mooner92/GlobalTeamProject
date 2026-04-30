# KEI Global Gateway — 개발 결과·잔여 과제·사용자 액션 정리

- **작성일:** 2026-04-30
- **상태:** 게이트웨이 랜딩 v1 구현 완료, 모든 자동 게이트 그린
- **선행 문서**
  - 계획서: [`report/2026-04-30_gateway-landing-plan.md`](./2026-04-30_gateway-landing-plan.md)
  - Phase 1–2 결과: [`report/2026-04-30_phase1-2_변경사항.md`](./2026-04-30_phase1-2_변경사항.md)
  - 결정 기록: [`report/2026-04-30_adr-002_legacy-catalog-isolation.md`](./2026-04-30_adr-002_legacy-catalog-isolation.md)

---

## 1. 한 줄 요약

> **`/index.html`은 외국인 첫 방문자를 위한 영문 게이트웨이로 새로 짜였고, 기존 363행 카탈로그/검색 UI는 `/all-projects.html`로 격리됐습니다. 모든 자동 품질 게이트(lint·format·validate:data·check:a11y·test:e2e × chromium+firefox·verify:export·verify:keyboard·verify:search-date·check:security)가 그린 상태입니다.**

이번 사이클은 "게이트웨이/콘시어지" 골격을 코드로 박아 넣은 단계입니다. 컨텐츠(카피, URL, 표지, 큐레이션)는 KEI 측에서 채워야 진짜로 외부에 공개될 수 있습니다 (§4 참조).

---

## 2. 개발된 내용 (이번 사이클에서 구현된 것)

### 2.1 새 페이지 — `/index.html` (Gateway Landing)

7개의 의미적 섹션으로 구성된 단일 랜딩 페이지입니다.

| 섹션 ID        | 역할                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| `header`       | KEI 로고 + 4개 anchor 네비(What we do / Featured / Where to go / Connect)          |
| `hero`         | "한 문장 + 서브카피 + 듀얼 CTA" — 5초 테스트의 처음 2초 책임                       |
| `areas`        | 7개 연구 영역 카드 (Climate, Air, Water, Resource, Biodiversity, Cities, Health)   |
| `featured`     | 8개 큐레이션 연구 카드 (placeholder 표지 + 메타 + 단일 외부 CTA)                   |
| `destinations` | 5개 딥링크 카드 (KEI Research / E-library / Publications / International / About)  |
| `connect`      | 국제협력실/미디어/일반 문의 메일 채널                                              |
| `footer`       | 라이선스, 업데이트 날짜, EN⇄KO 토글(이전 헤더에서 이동), 전체 카탈로그 링크(quiet) |

특징:

- **외부 링크 정책 일관성**: 모든 외부 CTA가 `target="_blank" rel="noopener"`로 새 탭, 스크린리더용 `(opens in a new tab)` 라벨 포함.
- **모션 1포인트**: Hero의 살구·세이지 그라디언트 시프트(18s, ease-in-out, alternate). `prefers-reduced-motion: reduce` 시 즉시 비활성.
- **반응형**: 720px 이하 브레이크포인트에서 네비/푸터 레이아웃 재배치.
- **i18n**: 모든 카피가 `data-i18n` 키로 렌더, 푸터 EN⇄KO 토글 작동.

### 2.2 새 데이터 파일 (코드 변경 없이 운영 가능)

| 파일                       | 항목 수 | 역할                                                               |
| -------------------------- | ------- | ------------------------------------------------------------------ |
| `data/research-areas.json` | 7       | 7개 연구 영역의 EN/KO 제목·1줄 설명·아이콘 키·외부 destination URL |
| `data/featured.json`       | 8       | 큐레이션 연구 8건의 EN/KO 제목·요약·연도·저자·외부 URL·rank        |
| `data/destinations.json`   | 5       | 외부 KEI 사이트 5건의 EN/KO 제목·설명·청자 힌트·아이콘·URL         |

각 파일은 `version`, `updated` 필드와 `items` 배열 구조이며, **코드 한 줄도 건드리지 않고** 항목을 추가/변경할 수 있습니다.

### 2.3 새 스크립트 / 도구

| 스크립트                            | 역할                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `scripts/gateway.js`                | 게이트웨이 전용 렌더러 (data 3종 fetch → 카드 렌더, i18n, smooth anchor scroll)      |
| `scripts/serve.mjs`                 | Python 의존성 제거용 Node 정적 서버 (cmd/PowerShell/Linux 동일 동작)                 |
| `scripts/validate-gateway-data.mjs` | 3개 JSON 무결성 검증 (cardinality 5–7 / 8–12 / 4–6, https:// URL 강제, ID 중복 검사) |
| `scripts/check-links.mjs`           | 외부 URL HEAD ping. `--strict` 옵션으로 dead link 시 exit 1 (분기 cron용)            |

### 2.4 격리된 레거시 — `/all-projects.html`

- 기존 `index.html`(363행 검색·필터·정렬·내보내기 UI)을 그대로 이식.
- 헤더에 "← Back to gateway" 링크 추가.
- 게이트웨이는 푸터에서만 조용히 링크(`Browse the full catalog →`).

### 2.5 자동 품질 게이트 (모두 그린)

| 게이트                                                     | 결과 / 산출물                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `npm run lint` (ESLint)                                    | ✅ 0 error                                                           |
| `npm run format:check` (Prettier)                          | ✅ All matched files use Prettier code style                         |
| `npm run validate:data`                                    | ✅ `[DATA_VALIDATION_OK]` (363 projects) + `[GATEWAY_VALIDATION_OK]` |
| `npm run check:security`                                   | ✅ HTML sink 미검출                                                  |
| `npm run check:a11y` (gateway + legacy)                    | ✅ 두 페이지 모두 critical 0건                                       |
| `npm run test:e2e:playwright`                              | ✅ chromium + firefox 합계 **84 passed**, 2 conditional skipped      |
| `verify:export` / `verify:keyboard` / `verify:search-date` | ✅ 전부 PASS                                                         |

### 2.6 신규/확장 e2e 테스트 — `tests/e2e/gateway.spec.js`

| 시나리오                                                            | 검증 내용                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `gateway loads all five sections @smoke`                            | 5개 섹션 visible, areas 5–7 / featured ≥8 / destinations 4–6                  |
| `hero exposes a single-sentence headline and dual CTA`              | 헤드라인 길이 < 240자, primary/secondary CTA 둘 다 visible, secondary는 새 탭 |
| `featured cards every CTA opens externally with new-tab affordance` | 모든 featured CTA가 `target=_blank`, `rel*=noopener`, 스크린리더 힌트         |
| `destination cards open external KEI sites in new tab`              | 모든 카드가 `https://`, 새 탭                                                 |
| `nav anchors scroll to sections`                                    | `#destinations` 클릭 후 인비포트 진입                                         |
| `EN ⇄ KO toggle in footer flips text and lang attribute`            | 헤드라인 텍스트가 영→한으로 바뀌고 `<html lang>`도 동기화                     |
| `footer holds the legacy catalog link`                              | `all-projects.html` 링크 존재                                                 |
| `destinations carry data-omc-cta tracking attributes`               | 모든 destination 카드에 `data-omc-cta` 속성                                   |

또한 기존 6개 spec(legacy)이 자동으로 `/all-projects.html`을 타겟하도록 재배선됨.

---

## 3. 잔여 과제 — 구현 측면 개선안

자동 게이트 기준으로는 **추가 구현이 필요하지 않은 상태**입니다. 다만, 다음 개선 항목은 다음 사이클(또는 KEI 사인오프 후) 우선순위로 검토 가능합니다.

### 3.1 P1 — 컨텐츠 차원 (KEI 측 입력이 필수)

§4(사용자 액션 체크리스트)에 정리.

### 3.2 P2 — 운영 자동화

| 항목                                | 권장 조치                                                                         |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `scripts/check-links.mjs` 정기 실행 | GitHub Actions cron(분기 또는 월) — 결과를 PR로 자동 리포트                       |
| 분석 도구 도입                      | GA4 또는 Plausible 도입 — `data-omc-cta` 이벤트 자동 추적 (개인정보 영향 검토 후) |
| Sitemap.xml / robots.txt            | SEO 인덱싱 정상화                                                                 |
| OG 이미지·Twitter 메타              | 게이트웨이 단일 OG 이미지 + 도메인별 메타 (외국 SNS 공유 시 카드 미리보기)        |
| 캐시 헤더                           | 정적 자산 ETag/long-cache, JSON 데이터는 short-cache 또는 SWR                     |

### 3.3 P2 — 디자인 / UX 보강

| 항목                 | 권장 조치                                                         |
| -------------------- | ----------------------------------------------------------------- |
| Hero 시그니처 비주얼 | 추상 그라디언트 외에 실사 이미지/일러스트 한 장 도입 검토 (§8.D)  |
| Featured 표지 자동화 | OpenAlex / OG 이미지 추출로 cover_url 자동 채움 (Phase 1–2 §10.4) |
| 다국어 검수          | EN 카피의 원어민 검수, 한·영 톤 일관성 점검                       |
| 다크모드             | 이번 사이클은 보류. 차기 사이클에서 토큰 도입 후 검토             |
| 모바일 480px 이하    | 현재 720px / 640px 분기. 더 좁은 폭에서 카드 리듬 점검 필요       |

### 3.4 P3 — 코드 / 테스트 차원

| 항목                                   | 권장 조치                                                             |
| -------------------------------------- | --------------------------------------------------------------------- |
| `data-omc-cta` 클릭 이벤트 단위 테스트 | 분석 도구 도입 후 클릭 이벤트가 정확히 발사되는지 e2e로 검증          |
| Lighthouse CI                          | Mobile Performance/A11y/SEO/BestPractices ≥90 자동 측정 (현재 수동)   |
| 외부 5초 테스트 자동화 불가능 영역     | 외국인 정성 인터뷰는 사람이 직접(§4.E)                                |
| `featured.json` 스키마 파일 분리       | `featured.schema.json` (JSON Schema 2020-12)로 IDE 자동완성 지원 가능 |

---

## 4. KEI 사용자(스태프)가 직접 확인·결정해야 할 것 — 액션 체크리스트

> **이 섹션이 가장 중요합니다.** 코드는 다 짜여 있고 자동 검증도 통과합니다. 그러나 다음 항목들은 **반드시 KEI 측에서 직접 결정·조사·승인**해야 게이트웨이가 진짜 외부에 공개될 수 있습니다. 각 항목 옆 우선순위는 **P0=차단요인 / P1=출시 전 권장 / P2=출시 후 가능**.

### 4.1 컨텐츠 큐레이션 — 가장 시급 ⚠️

#### A. 7개 연구 영역 라벨·카피 검수 (P0) — `data/research-areas.json`

현재 다음 7개로 채워둠 (placeholder 후보입니다):

| ID                       | 제목 (EN)                | 제목 (KO)         |
| ------------------------ | ------------------------ | ----------------- |
| `climate-carbon`         | Climate & Carbon         | 기후·탄소         |
| `air-quality`            | Air Quality              | 대기 환경         |
| `water-watershed`        | Water & Watershed        | 물·유역           |
| `resource-circulation`   | Resource Circulation     | 자원순환          |
| `biodiversity-ecosystem` | Biodiversity & Ecosystem | 생물다양성·생태계 |
| `sustainable-cities`     | Sustainable Cities       | 지속가능한 도시   |
| `environmental-health`   | Environmental Health     | 환경 보건         |

**확인 필요**:

- KEI 내부 부서/연구실 구분과 일치하는가?
- 외국인이 이해하기 쉬운 영문 라벨인가?
- 7개가 너무 많거나 부족한가? (계획서는 5–7 권장)
- 각 영역의 1줄 영문 설명(`blurb_en`)이 정확하고 매력적인가?
- 각 영역의 `destination` URL이 KEI Research 사이트의 **해당 영역 페이지**로 정확히 연결되는가? (현재는 KEI 메인 영문 페이지로 임시 연결)

#### B. Featured 8건 — `data/featured.json` (P0)

현재 8건의 가상 큐레이션 시드가 들어 있습니다. KEI 측에서 **실제 발간물로 교체**해야 합니다. 각 항목별로 다음을 채워주세요:

| 필드         | 설명                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `id`         | 발간물 고유 식별자 (E-library의 `c_id` 등 활용 가능)                         |
| `rank`       | 1–8(또는 12) 노출 순서 (낮을수록 상단)                                       |
| `title_en`   | 영문 정식 제목                                                               |
| `title_ko`   | 국문 정식 제목 (선택, 없으면 KO 토글 시 영문 제목 사용)                      |
| `summary_en` | 2–3줄 영문 요약 (외국인 검수 권장)                                           |
| `summary_ko` | 2–3줄 국문 요약 (선택)                                                       |
| `year`       | 발간 연도                                                                    |
| `authors`    | 저자 표기 (예: "KEI Climate Policy Research Group")                          |
| `doi`        | DOI (있는 경우)                                                              |
| `area`       | §4.1.A에서 정한 영역 ID 중 하나                                              |
| `url`        | **필수.** 외부 원문 URL (KEI E-library `https://...` 또는 KEI 사이트 페이지) |
| `cover_url`  | 표지 이미지 URL (없으면 빈 문자열, placeholder 자동 표시)                    |

**선정 기준 (계획서 §8.A 기반 — KEI 측에서 최종 확정)**:

- ✅ 영문 원문 제공 여부
- ✅ 최근 3년 (2023–2025)
- ✅ 국제 협력 결과물 또는 외국인 관심도 높은 주제
- ✅ DOI 등 인용 가능 식별자 보유
- ✅ 인용 임팩트 또는 정책 임팩트

**선정 위원회/큐레이터를 누가 맡을지**도 결정 필요.

#### C. 5개 딥링크 URL 검증 — `data/destinations.json` (P0)

현재 다음 URL로 임시 채워둠:

| ID                  | URL (현재)                                           |
| ------------------- | ---------------------------------------------------- |
| `kei-research`      | `https://www.kei.re.kr/eng/sub.es?mid=a30203000000`  |
| `kei-elibrary`      | `https://www.kei.re.kr/elib/main.do`                 |
| `kei-publications`  | `https://www.kei.re.kr/eng/sub.es?mid=a30201010000`  |
| `kei-international` | `https://www.kei.re.kr/eng/sub.es?mid=a30206000000`  |
| `kei-about`         | `https://www.kei.re.kr/eng/main.es?mid=a10101000000` |

**확인 필요**:

- 각 URL이 외국인 친화적 영문 페이지로 가는가?
- 더 적절한 진입점이 있는가? (예: E-library의 영문 검색 페이지가 따로 있다면 그것으로 교체)
- URL 변경 시 알림 받을 담당자/메일 채널 (이게 없으면 dead link 발생 시 게이트웨이가 깨짐)

#### D. 큐레이션 갱신 주기·책임자 (P1)

- 분기? 반기? 정적 (한 번 박고 끝)?
- 단일 큐레이터 vs 위원회?
- 갱신 시 PR 워크플로 (직접 JSON 수정? 사내 admin UI 필요?)

---

### 4.2 컨택 채널 — 메일 주소 확정 (P1)

`index.html`의 Connect 섹션에 다음 임시 주소가 들어 있습니다. **반드시 실제 운영 채널로 교체** 필요:

| 채널        | 현재 임시값              | 확인 필요                    |
| ----------- | ------------------------ | ---------------------------- |
| 국제 협력   | `mailto:intl@kei.re.kr`  | 국제협력실 대표 메일/담당자  |
| 미디어 문의 | `mailto:media@kei.re.kr` | 홍보팀 또는 미디어 전담 메일 |
| 일반 문의   | `mailto:info@kei.re.kr`  | 일반 문의 라우팅 메일        |

**부수 결정**:

- 외부 폼(Google Form 등)을 메일 대신 또는 병행해서 쓸 것인가?
- KEI 공식 SNS(LinkedIn/X 등) 1–2개를 푸터에 추가할 것인가? (현재는 없음)

---

### 4.3 브랜드 / 비주얼 자산 (P1)

| 항목                 | 현재 상태                                            | 확인 필요                                                         |
| -------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| KEI 로고             | `data/CI_logos/KEI_English_1.jpg` 사용 중            | SVG 최신본으로 교체할 수 있는가? (현재 jpg)                       |
| 브랜드 컬러          | `#007a63` (KEI 그린) + 살구·세이지 액센트            | KEI 공식 브랜드 가이드와 정확히 일치하는가?                       |
| Hero 시그니처 비주얼 | 추상 그라디언트 (이미지 없음)                        | 실사/일러스트 1–2장으로 교체할 것인가?                            |
| Featured 표지        | 8건 모두 placeholder (KEI 그린 그라디언트 + 첫 글자) | 실제 표지 이미지를 cover_url에 채울 것인가? (P3 자동화 옵션 있음) |
| 표지 이미지 라이선스 | n/a (placeholder)                                    | KEI E-library 이미지 hotlink 가능 여부 (저작권/약관 확인)         |

---

### 4.4 도메인 / 배포 / 분석 (P0)

| 항목               | 결정 필요                                                                        |
| ------------------ | -------------------------------------------------------------------------------- |
| **배포 도메인**    | `global.kei.re.kr` / `kei.re.kr/en` / 별도 마이크로사이트 / 다른 도메인 중 무엇? |
| HTTPS 인증서       | KEI 인프라 팀과의 협의 (Let's Encrypt? 공인 인증서?)                             |
| 호스팅 환경        | KEI 자체 인프라? GitHub Pages? Vercel/Netlify? (정적 사이트라 옵션 다양)         |
| 분석 도구          | GA4 / Plausible / 도입 안 함 — 정책 결정                                         |
| 쿠키/개인정보 배너 | 분석 도구 도입 시 필요 (한국 개인정보보호법 + GDPR 양쪽 검토)                    |
| 외부 CTA 클릭 추적 | `data-omc-cta` 속성은 이미 박혀 있음. 추적 활성화 여부만 결정                    |
| 사내 네트워크 정책 | KEI 사내에서 게이트웨이 접근 가능한지 (프록시/방화벽)                            |

---

### 4.5 카피 / i18n 검수 (P1)

| 항목                  | 현재 상태                                                                                                | 확인 필요                         |
| --------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Hero 한 문장 (EN)     | "South Korea's national environmental policy think tank."                                                | 외국인 검수, 후보 3개 중 1개 확정 |
| Hero 서브카피 (EN)    | "Independent research that shapes climate, air, water, and sustainability policy in Korea — and beyond." | 동일                              |
| 7개 영역 1줄 설명     | placeholder                                                                                              | 원어민/외국인 스태프 검수         |
| 5개 destination blurb | placeholder                                                                                              | 동일                              |
| 8개 featured summary  | 가상 큐레이션                                                                                            | 실제 발간물로 교체 + 영문 검수    |
| KO 톤                 | 기본형(평어 + 명사형)                                                                                    | 존댓말 적용 여부 결정             |

---

### 4.6 거버넌스 / 사인오프 (P1)

| 항목                                                | 결정 필요                                                  |
| --------------------------------------------------- | ---------------------------------------------------------- |
| 본 게이트웨이의 승인권자                            | 국제협력실장? 기획조정실? 누가 PR 머지/배포 승인을 하는가? |
| 게이트웨이 = KEI 공식 자산 vs 실험적 마이크로사이트 | 정책 결정에 따라 도메인·브랜드 노출 강도 달라짐            |
| Phase 단위 리뷰                                     | 매 Phase 종료 시 리뷰 vs 전체 1회                          |
| 레거시 `/all-projects.html` 향후                    | 격리 유지(현재) vs 30/60/90일 후 폐기 (ADR-002 follow-up)  |

---

### 4.7 외부 API · 데이터 자동화 (P2 — Phase 1–2 §10에서 이미 정리)

게이트웨이 자체에는 영향 없지만, 큐레이션 운영을 자동화하려면 다음을 사내에서 답해야 합니다 (Phase 1–2 보고서 §10 참조):

- KEI E-library 자체 API 제공 여부 (정보전산팀)
- KEI DOI 발급 이력 및 prefix (CrossRef? DataCite?) (연구지원팀)
- 사내 발간물 DB(RIMS 등)의 export 가능 여부 (정보전산팀)
- LLM(Anthropic/OpenAI) API 사용 가능 여부 — 영문 요약 자동화에 사용 (보안/법무)

---

### 4.8 폴리시 / 법무 (P2)

| 항목                                   | 누구에게                                |
| -------------------------------------- | --------------------------------------- |
| 데이터 라이선스 표기 문구              | 법무 — `gateway.footer.license` 키 교체 |
| 외부 링크 면책 문구 필요 여부          | 법무                                    |
| 쿠키/개인정보 배너 (분석 도구 도입 시) | 법무 + 정보전산팀                       |
| KEI E-library 표지 이미지 hotlink      | 법무 + E-library 운영팀                 |
| 외국 사용자 상대 GDPR 적용 여부        | 법무                                    |

---

## 5. 즉시 가능한 운영 작업 (코드 변경 없음)

다음 작업은 **JSON 파일만 수정**하면 즉시 반영됩니다. 코드 빌드/배포 파이프라인 불필요.

### 5.1 영역 카드 한 개 교체

```bash
# 1. data/research-areas.json 수정
# 2. 검증
npm run validate:gateway
# 3. 새로고침
```

### 5.2 Featured 항목 추가/교체

```bash
# 1. data/featured.json의 items[] 수정
#    - rank: 1–12 사이 정수, 중복 금지
#    - url: https://로 시작 필수
#    - cover_url: https:// 또는 비워두기 (placeholder 자동)
# 2. 검증
npm run validate:gateway
# 3. 외부 URL 죽었는지 ping (선택)
npm run check:links
```

### 5.3 딥링크 URL 변경

```bash
# 1. data/destinations.json의 items[].url 수정
# 2. 검증
npm run validate:gateway
npm run check:links
```

### 5.4 i18n 키 추가/수정

`scripts/i18n/dict.js`의 `ko` / `en` 객체에 키 추가. 양쪽 모두 채워야 폴백이 동작.

---

## 6. 빌드/배포 명령 요약

| 명령                       | 용도                                                     |
| -------------------------- | -------------------------------------------------------- |
| `npm run dev`              | 로컬 정적 서버 (`http://127.0.0.1:4173/`)                |
| `npm run lint`             | ESLint                                                   |
| `npm run format`           | Prettier 자동 수정                                       |
| `npm run format:check`     | Prettier 검증만                                          |
| `npm run validate:data`    | xlsx + 게이트웨이 JSON 둘 다 검증                        |
| `npm run validate:gateway` | 게이트웨이 JSON만                                        |
| `npm run check:a11y`       | 두 페이지(gateway + all-projects) axe-core               |
| `npm run check:security`   | HTML sink 패턴 정적 검사                                 |
| `npm run check:links`      | 외부 URL HEAD ping (advisory). `--strict`로 실패 시 종료 |
| `npm run test:e2e`         | 전체 e2e + verify 스크립트 묶음 (chromium + firefox)     |

---

## 7. 알려진 제약 / Known Issues

1. **표지 자동화 미구현** — Featured 표지는 모두 placeholder. 실제 표지를 띄우려면 cover_url을 채우거나 향후 OpenAlex/OG 자동화 도입.
2. **외부 URL 무결성은 사람이 추적해야 함** — `check-links.mjs`는 advisory. KEI 본 사이트가 URL 구조를 바꾸면 자동 알림이 없음 (분기 cron 권장).
3. **5초 테스트(외국인 정성)는 자동화 불가** — Phase H의 핵심 정성 평가는 사람이 직접 해야 함.
4. **다크모드 미지원** — 차기 사이클 검토 (계획서 §5.3).
5. **Lighthouse 자동 측정 미설정** — 수동으로 Chrome DevTools에서 측정 권장.
6. **Featured.json은 xlsx와 별개** — Phase 1–2의 `featured_rank` xlsx 컬럼은 사용하지 않음. 큐레이션 운영은 JSON 직접 편집 (운영자 친화도 차이는 KEI 측 결정).

---

## 8. 다음 사이클 추천 (KEI 사인오프 후)

우선순위 순서:

1. **§4.1.A–C 실 컨텐츠 채우기** (영역 라벨, Featured 8건, 딥링크 5건)
2. **외국인 5명 정성 5초 테스트** (계획서 §11.1, §11.2)
3. **배포 도메인·인프라 결정** (§4.4)
4. **분석 도구 도입 + 쿠키 배너** (§4.4)
5. **큐레이션 SOP 1장 작성** (계획서 ADR-001 follow-up)
6. **dead-link checker GitHub Actions cron**
7. **Lighthouse CI 도입**
8. **OpenAlex/OG로 표지 자동 채움 PoC** (Phase 1–2 §10.4)
9. **다크모드 도입** (디자인 토큰부터)

---

## 9. 파일 매니페스트 — 이번 사이클에서 추가/수정된 파일

### 신규

- `index.html` (게이트웨이로 전면 재작성)
- `all-projects.html` (이전 index.html을 격리 — 헤더에 back-link 추가)
- `scripts/gateway.js`
- `scripts/serve.mjs`
- `scripts/validate-gateway-data.mjs`
- `scripts/check-links.mjs`
- `data/research-areas.json`
- `data/destinations.json`
- `data/featured.json`
- `tests/e2e/gateway.spec.js`
- `report/2026-04-30_adr-002_legacy-catalog-isolation.md`
- `report/2026-04-30_gateway-landing-progress.md` (이 문서)

### 수정

- `package.json` — `dev`, `validate:data`, `validate:gateway`, `check:links`, `test:e2e:playwright` 갱신
- `playwright.config.js` — `webServer.command`를 Node 서버로 교체
- `styles/main.css` — 게이트웨이 섹션 스타일 일괄 추가 (~520 라인)
- `scripts/i18n/dict.js` — gateway.\* 키 + legacy.back 추가 (KO/EN 양쪽)
- `scripts/check-a11y.mjs` — 두 페이지 멀티 타겟 검사로 확장
- `scripts/ci-local.mjs` / `verify-export-flow.mjs` / `verify-keyboard-accessibility.mjs` / `verify-search-date-filter.mjs` / `verify-manual-qa.mjs` / `perf-export.mjs` — `python3` → `node scripts/serve.mjs`
- `tests/e2e/baseline.spec.js`, `i18n.spec.js`, `facets.spec.js`, `project-detail.spec.js`, `contract.spec.js`, `thumbnails.spec.js`, `failure-evidence.spec.js` — `/index.html` → `/all-projects.html` (격리에 따른 자동 재배선)
- `.eslintrc.json` — `scripts/gateway.js` override 추가

### 변경 없음

- `data/projects.xlsx` (Phase 1–2 결과 그대로)
- `scripts/app.js` (레거시, 그대로)
- `scripts/data/contract.js` (Phase 1–2 결과 그대로)

---

## 10. 한 페이지로 요약 — KEI 측이 가장 빨리 해야 할 5가지

1. **§4.1.A** — 7개 연구 영역 라벨·1줄 카피 최종 확정 (외국인 검수 포함)
2. **§4.1.B** — Featured 8건 실제 발간물 선정 + 영문 요약·외부 URL 수집
3. **§4.1.C** — 5개 destination URL 외국인 친화 영문 페이지로 검증
4. **§4.2** — 3개 컨택 메일(국제협력/미디어/일반) 실제 주소로 교체
5. **§4.4** — 배포 도메인 결정 (`global.kei.re.kr` 등)

이 5가지가 끝나면 **외부 공개 가능한 v1**이 됩니다.

---

_작성: 2026-04-30 / KEI AI Data Team — Implementor: Claude Opus 4.7_
