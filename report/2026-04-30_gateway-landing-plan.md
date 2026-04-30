# KEI Global Gateway — 콘시어지 랜딩 페이지 재설계 계획

> 본 계획은 `.omc/plans/integrated-library-renewal.md`(통합 라이브러리 안)을 **대체(supersede)** 합니다.
> 이전 플랜은 "KEI Research + KEI E-library를 한 화면에서 검색·열람한다"는 통합 라이브러리 모델이었으나,
> KEI는 이미 자체 사이트(Research / E-library / 국문 검색 등)를 잘 갖추고 있어 **기능 중복**을 피해야 합니다.
> 새 방향은 **게이트웨이(Gateway) / 콘시어지(Concierge) 랜딩** — 외국인 방문자가 5초 안에 KEI를 이해하고,
> 적절한 KEI 원본 사이트로 **딥링크 라우팅**되도록 돕는 "번역·안내자" 레이어입니다.

- **작성일:** 2026-04-30
- **상태:** Draft (사용자 승인 대기)
- **선행 작업:** Phase 1 + Phase 2 (데이터 컨트랙트 + 카드 그리드)는 이미 머지됨 (`report/2026-04-30_phase1-2_변경사항.md` 참고)

---

## 0. Framing Pivot — 무엇이 바뀌었는가

### 0.1 Before vs After

| 축                     | 이전(integrated-library)            | 현재(gateway-landing)                                          |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------- |
| 핵심 은유              | "통합 도서관 (Integrated Library)"  | "게이트웨이 / 콘시어지 (Gateway / Concierge)"                  |
| 1차 사용자 행동        | 검색 → 필터 → 결과 열람             | **이해 → 흥미 → 외부 KEI 사이트로 이동**                       |
| 데이터 처리            | 363행 카탈로그를 사이트 안에서 탐색 | 8–12개 큐레이션 + 5–7개 연구 영역 카드                         |
| KEI 본 사이트와의 관계 | 부분적으로 기능 중복 가능           | **중복 금지(anti-overlap)** — 본 사이트로 라우팅               |
| 성공 지표              | 검색·필터 사용량                    | 5초 이해율, 외부 KEI 사이트 클릭스루(CTR), 체류 후 이탈 방향   |
| 톤앤매너               | 데이터 대시보드                     | **차분한 권위 + 환영하는 분위기 (calm authoritative welcome)** |

### 0.2 이전 플랜의 운명 (생존/변형/폐기)

- **생존(KEEP)**
  - Phase 1: 데이터 컨트랙트 확장(9개 선택 컬럼) — 이미 머지 완료, 그대로 사용.
  - Phase 2: 카드 그리드 + 커버 이미지 + KEI 그린 그라디언트 플레이스홀더 — `Featured research` 섹션의 빌딩블록으로 재사용.
  - Playwright e2e, `validate:data`, `check:a11y`, `lint`, `test:e2e` 등 품질 게이트 — 그대로 승계.
  - i18n 사전(`scripts/i18n/dict.js`) — 키 추가하여 확장.

- **변형(MUTATE)**
  - 카드 모달(detail dialog) — 더 가볍게(요약 + "원문 보러가기" CTA 1개)로 축소.
  - 필터 UI(Type / Year facet) — 랜딩 메인에서는 **제거**. `Featured research` 섹션 내부에서만 최소 토글로 잔존(또는 완전 제거 검토).
  - 363행 리스트 뷰 — **랜딩에서는 노출하지 않음**. 보조 페이지(`/all-projects.html` 또는 `?view=all`)로 격리하거나 폐기.
  - 다국어 토글 — 푸터의 조용한 토글로 이동(현재는 헤더 prominent).

- **폐기(KILL)**
  - 통합 검색 박스(자유 텍스트 + 페이싯) — KEI E-library가 이미 함. 우리는 안 만든다.
  - 즐겨찾기/내 라이브러리 같은 개인화 기능.
  - PDF 호스팅·미리보기.
  - "전체 363건 둘러보기"를 메인 hero 가까이 배치하는 IA.
  - 데이터 export(CSV/JSON 다운로드 버튼) — 게이트웨이에는 부적절.

---

## 1. Persona & Core Scenario

### 1.1 Primary Persona — Foreign First-Time Visitor

| 페르소나                                  | 동기                              | 5초 안에 알아야 할 것                                  |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------------ |
| **해외 정책 연구자** (OECD/UNEP/대학교수) | KEI가 어떤 기관이고 협업 가능한지 | KEI = 한국 환경 정책 국책연구원, 영문 자료 어디 있는지 |
| **유학생/대학원생**                       | 한국 환경 정책 자료 인용          | 영문 publication 어디서 받는지, 인용 가능한지          |
| **외신 기자**                             | 한국의 기후/환경 입장 취재        | 미디어 컨택, 최근 영문 보도자료                        |
| **NGO/국제기구 파트너**                   | 협력 채널 탐색                    | 국제협력실 컨택, 진행 중인 국제 프로젝트               |
| **외국 정부 실무자**                      | 한국 사례 벤치마크                | 영문 정책 브리프, 면담 신청 경로                       |

### 1.2 The 5-Second Test

> 외국인이 페이지를 열고 5초 안에 다음 세 가지에 답할 수 있어야 한다:
> ① KEI가 무엇을 하는 기관인가? ② 내가 찾는 것이 여기 있는가, 아니면 다른 KEI 사이트에 있는가? ③ 어디를 클릭해야 다음 단계로 갈 수 있는가?

이 테스트가 본 프로젝트의 **유일한 북극성 지표**입니다. 모든 기능 결정은 이 질문으로 회귀합니다.

### 1.3 Core Scenario (Happy Path)

1. 구글에서 "Korea environment policy research institute"로 검색 → 본 게이트웨이 도착.
2. Hero에서 "KEI is South Korea's national environmental policy think tank" 한 문장 확인 (≤2초).
3. "What we do" 5–7장 카드 스캔 → 본인 관심 영역(기후 / 자원순환 / 생태 …) 식별 (≤3초).
4. "Featured research" 8–12개 중 1–2개에 흥미 → 클릭 시 모달 또는 외부 원문으로.
5. "Where to go next" 카드에서 적절한 KEI 본 사이트로 이동(딥링크).
6. 추가로 컨택이 필요하면 "Connect with us" 섹션에서 국제협력실/미디어/일반 문의 채널 확인.

---

## 2. Anti-Overlap Rules (하지 않을 것 명시)

> 본 게이트웨이는 KEI 본 사이트들을 **대체**하지 않습니다. 다음을 **절대 만들지 않습니다.**

1. **자유 텍스트 검색** — 사용자가 키워드를 입력해 카탈로그를 검색하는 기능. (KEI E-library가 함)
2. **전체 출판물 카탈로그(363+ rows) 노출** — 랜딩에서는 큐레이션된 8–12개만. 전체 리스트는 KEI E-library로 라우팅.
3. **고도 필터/페이싯 UI** — Type × Year × Author × Theme 다축 필터 금지. (E-library의 영역)
4. **PDF 자체 호스팅·뷰어** — 모든 원문은 KEI 원본 URL로 외부 이동.
5. **계정/즐겨찾기/북마크** — 게이트웨이는 stateless, 익명 방문자 전용.
6. **인용 매니저 통합(Zotero, Mendeley 등 깊은 통합)** — DOI 표시 정도까지만.
7. **연구자 프로필 페이지** — KEI Research 사이트가 함.
8. **국문 일반 사용자 대상 마케팅 문구** — 본 게이트웨이의 1차 청자는 **외국인**. KO 토글은 보조.
9. **데이터 대시보드(차트, KPI 위젯)** — 톤이 맞지 않음.
10. **뉴스/블로그 상시 운영** — 큐레이션 갱신 주기는 분기 단위(자세한 결정은 §8).

---

## 3. Information Architecture (IA)

### 3.1 섹션 구조 (Top → Bottom)

```
┌────────────────────────────────────────────────────┐
│ (S0) Header — KEI 로고 / 미니 네비 (5섹션 anchor)  │
├────────────────────────────────────────────────────┤
│ (S1) Hero                                          │
│      "KEI in one sentence"                         │
│      서브카피 1줄 + 부드러운 모션 1포인트          │
│      Primary CTA: "See what we do" (S2 anchor)     │
│      Secondary: "Visit KEI main site" (외부)       │
├────────────────────────────────────────────────────┤
│ (S2) What We Do — 5–7 research areas               │
│      아이콘 카드 그리드, 카드당 1줄 설명           │
│      클릭 → S3의 해당 영역 하이라이트 OR 외부 영역 페이지 │
├────────────────────────────────────────────────────┤
│ (S3) Featured Research — 8–12 hand-picked          │
│      Phase 2 카드 그리드 재사용                    │
│      각 카드: 커버 + 제목(EN) + 1줄 요약 + 연도    │
│      클릭 → 가벼운 모달 → "Read full paper" 외부링크 │
├────────────────────────────────────────────────────┤
│ (S4) Where to Go Next — Deep-link cards            │
│      4–6장 큰 카드:                                │
│        · KEI Research site (영문 연구자/주제)      │
│        · KEI E-library (전체 카탈로그/검색)        │
│        · KEI Publications (학술 논문)              │
│        · KEI International Cooperation             │
│        · KEI Main / About                          │
│      각 카드: 영어 친화 설명 + 외부 이동 아이콘    │
├────────────────────────────────────────────────────┤
│ (S5) Connect With Us                               │
│      국제협력실 컨택 / 미디어 문의 / 일반 문의     │
│      메일 + (선택) 폼링크. 소셜은 KEI 공식만.      │
├────────────────────────────────────────────────────┤
│ (S6) Footer — 조용히                               │
│      EN ⇄ KO 토글, 라이선스, 마지막 업데이트 일자  │
└────────────────────────────────────────────────────┘
```

### 3.2 라우팅 원칙

- **모든 "더 알아보기" 액션은 외부 KEI 사이트로** — 본 게이트웨이 내부 페이지는 최소화.
- 내부 페이지는 (선택) `/all-projects.html` 단 하나 — 363행 리스트가 살아남는다면 여기로 격리.
- 외부 링크는 새 탭(`target="_blank" rel="noopener"`)이 기본. 단, 메인 네비의 KEI 메인 사이트는 동일 탭(권위 강조).

---

## 4. Phase Plan (Ralph cycle 단위로 재절단)

> 각 Phase는 **단일 ralph 사이클로 닫히는 크기**(≤하루 분량). 모든 Phase 종료 시점에 `lint && test:e2e && validate:data && check:a11y` 그린이 머지 조건.

### Phase A — Framing Reset & 정보 구조 골격 (½ day)

**목표**: 새 IA 골격을 비어있는 채로라도 띄우고, 옛 framing UI를 시야에서 치운다.

- 작업
  - `index.html` 상단을 새 Hero/IA 구조로 재배치(섹션 anchor만, 컨텐츠는 placeholder).
  - 기존 검색·필터 UI 블록을 `<!-- legacy: archived in /all-projects.html -->`로 격리.
  - `styles/main.css`에 새 섹션 컨테이너 클래스 추가(.hero, .areas, .featured, .deeplinks, .connect).
  - 헤더 i18n 토글을 푸터로 이동.
- RETIRE: 헤더의 prominent 검색바, 다축 필터 사이드바.
- REUSE: 카드 컴포넌트 클래스, KEI 그린 토큰, i18n 사전.
- 산출물: 시각적으로 "랜딩처럼 보이는" 비어있는 페이지.
- DoD: 5섹션 anchor 스크롤 작동, e2e 스모크(헤더/푸터 i18n 토글) 통과.

### Phase B — Hero & "What We Do" (½ day)

**목표**: 5초 테스트의 처음 2초를 책임진다.

- 작업
  - Hero 카피 EN/KO 확정(§8 결정 후).
  - Hero 1포인트 모션(아주 잔잔한 그라디언트 시프트 또는 텍스트 페이드인).
  - 5–7개 연구 영역 카드(아이콘 + 영역명 + 1줄). 아이콘은 Lucide 또는 자체 라인 아이콘.
- 데이터: 새 정적 JSON `data/research-areas.json` 도입 — 5–7개 항목, EN/KO 필드.
- DoD: a11y 스크린리더 순서 검증, Lighthouse Mobile ≥90, e2e: 영역 카드 클릭 시 적절한 anchor/외부 이동.

### Phase C — Featured Research (1 day)

**목표**: Phase 2 카드 자산을 게이트웨이 톤으로 재단해 8–12개 큐레이션.

- 작업
  - `data/projects.xlsx`에 `featured_rank`(int) 또는 별도 `data/featured.json` 추가 — 큐레이션 순서.
  - 빌드 시 `featured_rank IS NOT NULL`인 8–12개만 Featured 섹션에 노출.
  - 모달 축소: 요약 2–3줄 + 메타(연도/저자/DOI) + **단 하나의 CTA** "Read full paper".
  - 모든 CTA는 외부 KEI 원문 URL로(없으면 카드 비노출).
- RETIRE: 모달 내 export 버튼, 인용 복사, 인접 추천.
- DoD: validate:data가 featured 항목의 외부 URL 필수성 검사 추가, e2e: featured 카드 → 모달 → 외부 이동(target=\_blank).

### Phase D — Where to Go Next (½ day)

**목표**: 게이트웨이의 핵심 — 외부 KEI 사이트로의 라우팅.

- 작업
  - `data/destinations.json` — 4–6개 딥링크 항목, 각 항목 {title_en, title_ko, blurb_en, blurb_ko, url, audience_hint}.
  - 카드 컴포넌트는 Featured와 다른 비주얼 위계(더 큼, 외부 이동 아이콘 명시).
  - 클릭 분석 훅(있으면 GA/Plausible 이벤트, 없으면 `data-omc-cta` 속성만).
- DoD: 모든 카드 외부 URL `rel="noopener"` 점검, a11y: 외부 링크 명시(스크린리더 "opens in new tab").

### Phase E — Connect With Us & Footer Polish (¼ day)

- 작업
  - 국제협력실/미디어/일반 문의 3개 채널 — 메일 표시 + (선택) 외부 폼.
  - 푸터: 라이선스 표기, 마지막 데이터 업데이트 일자, EN⇄KO 토글, KEI 공식 소셜 1–2개.
- DoD: 푸터 a11y 랜드마크 정상, 모든 메일 링크 `mailto:` 작동.

### Phase F — Motion / Visual Polish (½ day)

- 작업
  - Seed Design 토큰을 베이스로, Luma 스타일 액센트 모션 1–2 포인트(Hero 그라디언트, Featured hover).
  - 다크모드는 **이번 사이클에서 보류**(노이즈).
- DoD: prefers-reduced-motion 존중, 60fps 유지(저사양 디바이스 시뮬레이션).

### Phase G — Legacy Catalog 격리 또는 폐기 결정 (¼ day)

- 옵션 1: `/all-projects.html`로 격리(현재 검색/필터 UI 그대로, 푸터에서만 조용히 링크).
- 옵션 2: 완전 폐기, KEI E-library로 라우팅 일원화.
- 결정 주체: §8의 KEI 사인오프.
- DoD: 결정 기록을 ADR(§9)에 추가 커밋.

### Phase H — QA, 5초 테스트, 핸드오프 (½ day)

- 작업
  - 외국인 동료 3–5명에게 비공식 5초 테스트 → 정성 피드백.
  - Lighthouse(Perf/A11y/SEO ≥90), `test:e2e` full suite, `validate:data`, `check:a11y`.
  - README/배포 노트 업데이트.
- DoD: 모든 게이트 그린, 5초 테스트 결과 정리, 회고.

---

## 5. Design Direction

### 5.1 베이스 — Seed Design (seed-design.io)

- 정렬, 타이포 스케일, 컴포넌트 spacing, 폼 패턴은 Seed의 conservative한 기본을 따른다.
- 한국 기업 톤에 익숙하므로 KEI staff의 사인오프가 빠르다(가설).

### 5.2 액센트 — Luma (luma.com)

- Hero/Featured hover에서만 Luma 류의 따뜻한 그라디언트·소프트 글로우를 1–2 포인트만.
- "행사 초대장 같은 환영의 느낌"을 Hero 1구간에만.

### 5.3 컬러

- 베이스: KEI 그린(#007a63 톤, 기존 토큰 유지) + Off-white(#FAFAF7) + Charcoal text.
- 액센트: 연한 살구/세이지 그라디언트 — Hero/Featured에 한정.
- 다크모드: **보류**(이번 라운드 out of scope).

### 5.4 타이포

- 영문: Inter 또는 Geist Sans. 헤드라인은 약간의 wide tracking.
- 국문: Pretendard.
- 위계: H1(Hero) 56–72 / H2(섹션) 36–44 / Body 16–18 / Caption 13.

### 5.5 모션 원칙

- 모든 모션은 ≤300ms, ease-out.
- prefers-reduced-motion 시 즉시 비활성.
- "춤추지 않는다" — 카드 hover, anchor 스크롤, Hero 그라디언트 시프트 외 금지.

---

## 6. Quality Gates (재확인)

기존 게이트를 그대로 승계하며, 게이트웨이 특성에 맞춰 다음을 **추가**:

| 게이트          | 명령                    | 추가 항목                                               |
| --------------- | ----------------------- | ------------------------------------------------------- |
| Lint            | `npm run lint`          | (변경 없음)                                             |
| Data validation | `npm run validate:data` | `featured_rank` 있으면 외부 URL 필수 검사               |
| A11y            | `npm run check:a11y`    | 외부 링크 "opens in new tab" 라벨 검사                  |
| E2E             | `npm run test:e2e`      | 5섹션 anchor 스크롤, 외부 CTA 클릭 시 새 탭, EN⇄KO 토글 |
| Lighthouse      | (수동 또는 CI)          | Mobile Performance/A11y/SEO ≥90, BestPractices ≥90      |
| 5초 테스트      | 정성                    | 외국인 3+명 인터뷰 노트                                 |

---

## 7. Risks & Open Decisions

### 7.1 컨텐츠 큐레이션 리스크 (HIGH)

- **5–7개 연구 영역**이 무엇인가? KEI 내부 부서/연구실 구분과 외국인이 이해하기 쉬운 영역명은 다를 수 있다.
- **8–12개 Featured 논문**을 누가, 어떤 기준으로 고르는가? (인용수? 최신? 외국인 관심도? 영문 제공 여부?)
- 큐레이션 갱신 주기 — 분기? 반기? 아예 정적?
- → §8에서 KEI 사인오프 필요.

### 7.2 딥링크 신뢰성 리스크 (MEDIUM)

- KEI 본 사이트들의 URL 구조가 바뀌면 게이트웨이의 "Where to go next" 카드가 dead link가 된다.
- 완화: 분기 1회 link checker 자동 실행(`scripts/check-links.mjs`) + Slack/메일 알림.

### 7.3 도메인/배포 리스크 (MEDIUM)

- 어떤 도메인에 배포되는가? `global.kei.re.kr`? `kei.re.kr/en`? 별도 도메인?
- KEI 본 사이트와 시각적으로 구분되는가, 통합되는가?
- → §8 결정 사항.

### 7.4 5초 테스트 실패 리스크 (HIGH)

- Hero 한 문장이 KEI staff에게 자명해도 외국인에게는 모호할 수 있음.
- 완화: Phase H에서 외국인 3–5명 정성 인터뷰 → 카피 2–3차 반복.

### 7.5 i18n 톤 리스크 (LOW–MEDIUM)

- 현재 EN 카피가 한국식 영어로 흐를 위험 — 원어민 카피라이터 또는 외국인 스태프 검수 필요.

### 7.6 레거시 카탈로그 처리 리스크 (LOW)

- `/all-projects.html` 격리를 택하면 두 개의 톤이 공존 → 사용자 혼란.
- 완화: 푸터에서만 조용히 링크, 게이트웨이 헤더에는 노출 금지.

---

## 8. KEI 스태프(사용자) 액션 체크리스트

> 본 플랜의 진행을 위해 **KEI 측 사용자가 직접 결정·조사·조율**해야 하는 항목입니다. 우선순위 P0(차단요인) → P2(폴리시) 순.

### A. 컨텐츠 큐레이션 (P0)

- [ ] **5–7개 연구 영역** 최종 확정 — 후보안 3개 작성 후 내부 회람.
  - 예시 후보: `Climate & Carbon`, `Air Quality`, `Water & Watershed`, `Resource Circulation`, `Biodiversity & Ecosystem`, `Sustainable Cities`, `Environmental Health`.
  - 각 영역 1줄 영문 카피 작성(외국인 1차 검수 포함).
- [ ] **Featured 8–12개 논문/프로젝트** 선정 기준 확정.
  - 기준 후보: ① 영문 원문 제공 ② 최근 3년 ③ 국제 협력 결과물 ④ 인용 임팩트.
  - 선정 위원회 또는 단일 큐레이터 지정.
- [ ] 각 Featured 항목의 **표지 이미지 / 1–3줄 영문 요약 / DOI 또는 외부 원문 URL** 수집.
- [ ] 큐레이션 **갱신 주기와 책임자** 지정(분기 권장).

### B. 딥링크 대상 (P0)

- [ ] "Where to go next" 카드 4–6개의 **정확한 URL 목록** 확정.
  - KEI Research 영문 진입점
  - KEI E-library 영문 진입점(또는 영문 검색 가능한 페이지)
  - KEI Publications 영문 페이지
  - KEI International Cooperation 페이지
  - KEI 메인/About 영문 페이지
  - (선택) KEI 보도자료/뉴스 영문 페이지
- [ ] 각 카드의 **외국인 친화 1–2줄 영문 설명** 작성.
- [ ] URL 변경 시 알림 받을 **담당자/메일 채널** 지정.

### C. 컨택 채널 (P1)

- [ ] **국제협력실** 대표 메일 주소 / 담당자.
- [ ] **미디어 문의** 메일 주소 또는 폼 URL.
- [ ] **일반 문의** 메일 주소.
- [ ] 외부 폼(Google Form 등) 사용 여부.
- [ ] KEI 공식 SNS 계정 1–2개 확정(LinkedIn, X 등).

### D. 브랜드 / 비주얼 자산 (P1)

- [ ] KEI **공식 로고**(영문/SVG) 최신본.
- [ ] KEI **공식 컬러 팔레트**(브랜드 가이드 PDF 또는 Figma).
- [ ] 외부 사용 가능한 **사진/일러스트 라이브러리** 출처(저작권 확인된 것).
  - 후보: KEI 자체 촬영, Unsplash, KEI 발간물 표지 재활용.
- [ ] Hero용 1–2장 **시그니처 비주얼** 결정(추상 그라디언트 vs 실사 vs 일러스트).

### E. 카피 / i18n 검수 (P1)

- [ ] **Hero 한 문장**(영문) — 3개 후보 → 외국인 검수 → 1개 확정.
- [ ] 모든 영문 카피의 **원어민/외국인 스태프 검수**.
- [ ] 국문 토글 시의 톤(존댓말 / 평어) 결정.

### F. 도메인 / 배포 / 분석 (P0)

- [ ] **배포 도메인** 확정 (`global.kei.re.kr` / `kei.re.kr/en` / 기타).
- [ ] HTTPS 인증서, KEI 인프라 팀과의 배포 경로.
- [ ] **분석 도구** 도입 여부 (GA4 / Plausible / 미도입).
- [ ] 외부 CTA 클릭 이벤트 추적 정책(개인정보 영향 검토 포함).

### G. 거버넌스 / 사인오프 (P1)

- [ ] 본 플랜의 **승인권자**(국제협력실장? 기획조정실?) 확정.
- [ ] Phase 단위 리뷰 주기(매 Phase 종료 시 vs 전체 1회).
- [ ] 레거시 `/all-projects.html` **격리 vs 폐기** 결정 (Phase G 차단요인).
- [ ] 본 게이트웨이가 KEI 공식 자산으로 등재될지, 실험적 마이크로사이트로 둘지 정책 결정.

### H. 폴리시 / 법무 (P2)

- [ ] 데이터 라이선스 표기(`data/projects.xlsx` 출처).
- [ ] 외부 링크 면책 문구 필요 여부.
- [ ] 쿠키/개인정보 배너 필요 여부(분석 도구 도입 시).

---

## 9. ADR — Architecture / Direction Decision Record

### ADR-001: Gateway 모델 채택 (Library 모델 폐기)

- **Status**: Accepted (2026-04-30)
- **Context**: 초기 플랜은 KEI Research + KEI E-library를 단일 검색 UI로 통합하는 "Integrated Library" 모델이었음. 그러나 KEI는 이미 본 사이트들에서 검색·카탈로그·연구자 페이지를 잘 운영 중이며, 외국인 방문자의 1차 어려움은 "검색 기능의 부재"가 아니라 **"어디로 가야 하는지 모름 + 영문 진입점 부재"** 였다.

- **Decision**: 검색·카탈로그를 **만들지 않는다**. 대신 5초 안에 KEI를 이해시키고, 이미 존재하는 KEI 본 사이트로 라우팅하는 **Gateway / Concierge** 레이어를 구축한다.

- **Decision Drivers**
  1. KEI 본 사이트와의 **기능 중복 회피**(유지비, 데이터 동기화 리스크).
  2. 외국인 1차 사용자의 **5초 이해율**과 **외부 CTR**이 검색 사용량보다 더 가치있는 지표.
  3. 1 ralph cycle 단위 phase로 단기 출시 가능(자체 검색 엔진 구축 대비 1/5 수준의 복잡도).

- **Alternatives Considered**
  - **Alt-1: Integrated Library (검색 + 통합 카탈로그)**
    - Pros: 한 화면에서 모든 것 가능, 사용자 이탈 적음.
    - Cons: KEI 본 사이트와 기능 중복, 363행 데이터 동기화 부담, 외국인의 1차 문제(영문 진입점)는 해결 못함.
    - Why rejected: 1차 문제 해결력 부족 + 유지비.
  - **Alt-2: 단순 영문 about 페이지 1장**
    - Pros: 가장 가벼움.
    - Cons: 라우팅 가치(딥링크 카드)가 없어 5초 테스트의 ③ "어디 클릭?"에 답을 못함.
    - Why rejected: 게이트웨이 핵심 가치(라우팅) 결핍.
  - **Alt-3: KEI 본 사이트의 영문 메뉴 보강(자체 사이트 미구축)**
    - Pros: 본 사이트 일관성.
    - Cons: KEI 인프라 의존성·승인 사이클이 길어짐, 디자인 자유도 낮음, 본 task의 범위 밖.
    - Why rejected: 본 프로젝트의 권한·일정 범위 초과.

- **Consequences (Positive)**
  - 단기 출시 가능, 외국인 1차 문제(영문 진입점) 직접 타격.
  - KEI 본 사이트의 변경에 대한 결합도가 낮음(URL만 추적).
  - 큐레이션이라는 가벼운 운영 모델로 지속 가능.

- **Consequences (Negative / Trade-offs)**
  - 본 게이트웨이 자체에 깊이 있는 컨텐츠가 없으므로 "왜 이게 별도로 존재하나" 질문에 답할 카피·디자인이 강해야 함.
  - 외부 KEI 사이트 URL 변경 시 dead link 리스크 → 분기 link checker로 완화.
  - 큐레이션 자원이 지속적으로 필요(분기 1회).

- **Follow-ups**
  - Phase H 종료 후 30/60/90일 시점 5초 테스트 재측정.
  - dead-link checker 자동화 도입 (`scripts/check-links.mjs`).
  - 큐레이션 운영 매뉴얼 1장(SOP) 작성.

---

## 10. 자산 매핑 — REUSE / MUTATE / RETIRE 한눈에 보기

| 기존 자산                             | 위치                | 처리                                                                        |
| ------------------------------------- | ------------------- | --------------------------------------------------------------------------- |
| `index.html` (447)                    | Hero/네비/검색 블록 | **MUTATE** — Hero 신규, 검색 UI 격리/제거                                   |
| `scripts/app.js` (~2350)              | 필터 파이프라인     | **MUTATE** — 게이트웨이에서는 미사용, `/all-projects.html`로 격리 또는 삭제 |
| `scripts/app.js` 카드 렌더            | Featured 섹션       | **REUSE** — 컴포넌트 재사용                                                 |
| `scripts/app.js` 모달                 | 상세 모달           | **MUTATE** — 가벼운 단일 CTA 버전으로 축소                                  |
| `styles/main.css` (~1265)             | 전체 스타일         | **MUTATE** — 새 섹션 클래스 추가, 데이터 대시보드성 스타일 정리             |
| `scripts/i18n/dict.js` (425)          | EN/KO 사전          | **REUSE/EXTEND** — 새 섹션 키 추가                                          |
| `data/projects.xlsx` (363 rows)       | 데이터 소스         | **REUSE** — `featured_rank` 컬럼 추가                                       |
| Phase 1 9개 컬럼(DOI/Authors/...)     | 데이터 컨트랙트     | **REUSE** — 그대로 사용                                                     |
| Phase 2 카드 그리드 + 그린 그라디언트 | 비주얼              | **REUSE** — Featured 섹션의 빌딩블록                                        |
| Type/Year facet 필터                  | UI                  | **RETIRE** — 게이트웨이에서 제거                                            |
| 헤더의 prominent i18n 토글            | UI                  | **MUTATE** — 푸터로 이동                                                    |
| 363행 리스트 뷰                       | UI                  | **RETIRE 또는 ISOLATE** — Phase G에서 결정                                  |
| Playwright e2e                        | 테스트              | **REUSE/EXTEND** — 새 시나리오 추가                                         |
| `validate:data`, `check:a11y`         | 게이트              | **REUSE/EXTEND** — featured 외부 URL 필수성 추가                            |

---

## 11. Success Criteria — 본 플랜이 완료되었다고 말할 수 있는 조건

1. 외국인 5명 정성 테스트에서 4명 이상이 **5초 안에 KEI를 한 문장으로 설명**할 수 있다.
2. 외국인 5명 정성 테스트에서 4명 이상이 **다음에 어디 클릭할지**를 망설임 없이 지정한다.
3. Lighthouse Mobile Performance/A11y/SEO/BestPractices 모두 ≥90.
4. `lint && test:e2e && validate:data && check:a11y` 그린.
5. "Where to go next" 카드의 모든 외부 링크가 link checker에서 200 OK.
6. ADR-001이 머지되어 `.omc/plans/gateway-landing-renewal.md`와 함께 코드베이스에 기록.
7. KEI 사인오프(§8.G) 완료.

---

## 12. Open Questions (실행 전 차단요인)

- [ ] (P0) 5–7개 연구 영역의 최종 라벨과 영문 1줄 카피는 누가 확정하는가?
- [ ] (P0) Featured 8–12개의 선정 기준과 큐레이터/위원회는?
- [ ] (P0) 배포 도메인은 `global.kei.re.kr` / `kei.re.kr/en` / 별도 중 무엇인가?
- [ ] (P0) 4–6개 딥링크 카드의 정확한 URL 리스트와 영문 카피는?
- [ ] (P1) Hero 한 문장 영문 카피의 최종 후보 3개와 검수자는?
- [ ] (P1) 큐레이션 갱신 주기(분기/반기/정적)와 운영 책임자는?
- [ ] (P1) 분석 도구(GA4/Plausible/없음)와 개인정보 정책 영향?
- [ ] (P1) 레거시 363행 카탈로그를 격리(`/all-projects.html`) vs 완전 폐기 중 어느 쪽인가?
- [ ] (P2) 데이터 라이선스 표기 문구의 최종본?
- [ ] (P2) 다크모드 차기 사이클 도입 여부?

---

## 13. Handoff

본 플랜이 사용자에 의해 명시적으로 승인되면, 실행은 ralph 사이클로 핸드오프됩니다. Phase A부터 순차 진행하며, 각 Phase 종료 시점마다 quality gate 그린 + 사용자 리뷰를 거쳐 다음 Phase로 진입합니다.

---

_작성: 2026-04-30 / KEI AI Data Team — Planner: Opus_
