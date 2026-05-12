# Seed Reconcile Report — KEI Global Gateway

> **3-way merge**: 현재 코드 (`index.html` + `styles/main.css`) × Seed Design System × KEI 도메인 요구
> 분석일: 2026-05-08
> 분석 도구: `/daangn-seed-ai:reconcile` (read-only)
> 분석 범위: `index.html` (294L) + `styles/main.css` (1993L)
> 출력: `.reconcile/detected.json` · `.reconcile/plan.json` · 본 문서
> 적용: 본 보고서는 코드를 수정하지 않음. 실제 적용은 `/daangn-seed-ai:reconcile-apply` 또는 사용자 직접

---

## 0. Executive Summary

| 분류              | 건수 | 의미                                                                       |
| ----------------- | ---- | -------------------------------------------------------------------------- |
| **Keep**          | 6    | 이미 Seed 정신과 정합 — 그대로 유지                                        |
| **Refactor**      | 14   | 토큰·anatomy로 정렬 필요                                                   |
| **Drop**          | 9    | 시각 AI-slop / 의미 없는 장식 / dead code — 제거                           |
| **Import**        | 3    | Seed semantic 토큰 레이어, 아이콘 라이브러리, lang 동기화 로직 — 신규 도입 |
| **needsDecision** | 4    | 사용자 판단 필요 (§2 Conflict Table)                                       |
| **합계**          | 32   |                                                                            |

### Detected Stack

| 항목            | 값                                            | 신뢰도 |
| --------------- | --------------------------------------------- | ------ |
| Framework       | vanilla-static (HTML+CSS+JS)                  | high   |
| Style system    | plain CSS (single file)                       | high   |
| Seed adoption   | none (no `@seed-design/*`, `@karrotmarket/*`) | high   |
| Build / runtime | Playwright + Node 18                          | —      |

### 한 줄 요약

> 현재 코드는 "Tailwind 풍 hand-rolled CSS + KEI 그린 팔레트"이지 Seed가 아니다. 시맨틱 골격(skip link, aria-labelledby)은 양호하지만 시각 레이어(애니메이션 그라디언트·버튼 그림자·라운드 카오스·폰트 사이즈 20종)가 "AI가 만든 think-tank 랜딩"의 전형적 시그니처를 보인다. **flat + neutral-dominant + 4px 그리드 + r3/full + t1–t10**로 정리하면 "차분한 정책 연구기관 게이트웨이"로 인상이 바뀐다.

### 예상 작업 규모

| Stage | 범위                      | 예상 변경 라인            | 시각 영향               | 위험   |
| ----- | ------------------------- | ------------------------- | ----------------------- | ------ |
| P0    | dead CSS 분리 + a11y 후크 | 1262줄 분리 + 5–10줄 추가 | 없음                    | low    |
| P1    | 시각 슬롭 제거            | ~40줄 삭제·수정           | **명확한 인상 변화**    | low    |
| P2    | 토큰 일괄 치환            | ~120줄 치환               | 미세 (간격·폰트 정합화) | medium |
| P3    | anatomy 정렬              | 선택적, ~80줄 + JS        | 컴포넌트 톤 통일        | medium |

---

## 1. 3-way 입력 요약

### Current (코드 측 관용구)

- `:root --kei-*` 변수 8개 (1267–1284L) — primitive만, 사용률 ~30%
- 가운데 정렬된 hero + radial-gradient drift 애니메이션 + 그림자 CTA
- font-size 20종, border-radius 6종, line-height 7종, 4px 그리드 밖 spacing 다수
- 카드 hover 효과 3종(`translateY(-2px)` + box-shadow 강화) 반복
- 시맨틱 HTML5 + skip link + aria-labelledby ✅
- 외부 링크에 텍스트 hint "(opens in a new tab)"
- `<html lang="en">` 정적
- legacy catalog CSS 1262줄 dead code

### Seed (기준)

- semantic 토큰 우선 (`bg.brand-solid`, `fg.neutral`, `--seed-dimension-x{n}`, `--seed-radius-r{n}`)
- flat + neutral-dominant + 정돈된 그리드
- 한 페이지에 brandSolid 1개
- r3 (12px) + full 두 개로 90% 커버
- t1–t10 10단 typo + 동일 인덱스 line-height 페어링
- 한국어 라인 하이트 내장
- 아이콘 슬롯 API (`Icon`/`PrefixIcon`/`SuffixIcon`), 한 라이브러리만
- 모션은 의미 있을 때만, 무한 모션 금지

### Domain (KEI 정당한 일탈)

| 항목                               | 결정               | 근거                                                                                                                                                                      |
| ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 브랜드 컬러 `#007a63` (KEI green)  | **Keep as domain** | KEI는 환경정책 think tank로 자체 브랜드. 당근 오렌지로 교체하지 않고 Seed semantic 토큰의 값으로 KEI green을 **바인딩** (`--seed-color-bg-brand-solid: var(--kei-green)`) |
| 영문 우선 + 한국어 토글            | Keep               | KEI Global Gateway라는 페이지 정체성 — 영문 1차, 한국어 2차                                                                                                               |
| KEI 로고 자산(`data/CI_logos/...`) | Keep               | 브랜드 자산 그대로                                                                                                                                                        |
| 폰트 fallback 순서                 | **Refactor** (r8)  | "글로벌"이라도 Korean 글리프 우선 — Pretendard가 Inter보다 먼저                                                                                                           |

---

## 2. Conflict Table — 사용자 결정 필요

| ID      | 항목                    | 옵션 A                                          | 옵션 B                                  | 권장                                               |
| ------- | ----------------------- | ----------------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| **r9**  | `<html lang>` 동적 갱신 | 이미 `gateway.js`에서 갱신 중이면 keep으로 강등 | 미구현이면 i3과 함께 핸들러 추가        | **B** (검증 후 결정)                               |
| **r10** | CTA anatomy 적용 방식   | BEM 클래스로만 anatomy 정렬 (vanilla 유지)      | React/Vue 도입 후 ActionButton 컴포넌트 | **A** (현 스택 유지)                               |
| **r11** | 언어 토글 컴포넌트      | Switch (즉시 적용 토글)                         | SegmentedControl 2-item                 | **A** (현재 단일 라벨 표시 = Switch 의도에 가까움) |
| **i2**  | 아이콘 라이브러리       | Lucide CDN sprite                               | 직접 inline SVG                         | **B** (vanilla 정적 사이트 + 1–2개 아이콘만 필요)  |

> 위 4건이 결정되면 plan.json의 해당 `needsDecision` 플래그를 false로 갱신하고 `reconcile-apply`로 진행 가능.

---

## 3. By Category — 4분류 상세

### 3.1 Keep (6) — 그대로 유지

| ID                            | 위치                                  | 근거                                                               |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `k1-semantic-html-skeleton`   | `index.html` 30–281L                  | header/main/section×4/footer + role="list" — Seed의 의미 우선 정합 |
| `k2-skip-link`                | `index.html:23` + `main.css:14, 1293` | Seed 공식 패턴과 동등                                              |
| `k3-aria-labelledby-sections` | `index.html:63, 107, 134, 160, 189`   | 스크린리더 섹션 라벨링                                             |
| `k4-prefers-reduced-motion`   | `main.css:1983`                       | 접근성 가드. d1 적용 후 더 단순                                    |
| `k5-single-solid-cta`         | `index.html:81` + `main.css:1465`     | Seed 룰 부합 (페이지당 brandSolid 1개)                             |
| `k6-root-css-variables-seed`  | `main.css:1266–1284`                  | 토큰화 출발점 — i1으로 확장                                        |

### 3.2 Refactor (14) — 토큰/anatomy로 정렬

#### Token 정렬 (8)

| ID                                  | 현재                              | Seed 타깃                                                    |
| ----------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `r3-radius-chaos-to-r3`             | radius 6종 (4/6/7/8/10/14px)      | `r2`(8) + `r3`(12, 기본) + `r4`(16) + `full` 4종             |
| `r4-spacing-off-4px-grid`           | 13/14/17/18/22/26/36/38px 등      | `x{n}` 토큰 인접값 흡수                                      |
| `r5-typography-20-sizes-collapse`   | font-size 20종                    | t4–t10 7단으로 흡수, clamp() 제거                            |
| `r6-line-height-hardcoded`          | 1.12/1.35/1.4/1.45/1.5/1.55/1.6   | 동일 인덱스 t-line-height 페어링                             |
| `r7-eyebrow-letter-spacing`         | 0.16em uppercase                  | 0.06–0.08em                                                  |
| `r8-fontfamily-pretendard-priority` | Inter, Segoe UI, Pretendard, sans | **Pretendard 1순위**, Inter, system-ui, sans                 |
| `r13-error-banner-tokens`           | `#fff3f3 / #ffcdd2 / #b71c1c`     | `bg.critical-weak` / `stroke.critical-solid` / `fg.critical` |
| `r14-footer-rgba-white-collapse`    | `rgba(255,255,255, X)` 알파 6종   | `fg.neutral-inverted` 3단(default/muted/subtle)으로          |

#### Anti-pattern 제거 (2)

| ID                         | 현재                                          | 타깃                                          |
| -------------------------- | --------------------------------------------- | --------------------------------------------- |
| `r1-cta-shadow-flat`       | `.gateway-cta-primary` 이중 box-shadow + lift | shadow 제거, hover는 `bg.brand-solid-pressed` |
| `r2-card-hover-translateY` | 카드 3종 hover에 `translateY(-2px)` + shadow  | border-color / bg-pressed로                   |

#### a11y / i18n (2)

| ID                               | 현재                           | 타깃                                             |
| -------------------------------- | ------------------------------ | ------------------------------------------------ |
| `r9-html-lang-static`            | `<html lang="en">` 정적        | i18n 토글 핸들러에서 `documentElement.lang` 갱신 |
| `r12-connect-mailto-as-listitem` | mailto 링크를 본문 링크 톤으로 | ActionButton variant="brandWeak" + IconExternal  |

#### Component anatomy (2, needsDecision)

| ID                                   | 현재                           | 타깃                              |
| ------------------------------------ | ------------------------------ | --------------------------------- |
| `r10-cta-anatomy-actionbutton`       | `<a class="gateway-cta">` 앵커 | ActionButton anatomy (slot/state) |
| `r11-langtoggle-switch-or-segmented` | raw `<button aria-pressed>`    | Switch 또는 SegmentedControl      |

### 3.3 Drop (9) — 제거

#### 시각 AI-slop (5)

| ID                             | 위치                            | 증상                                                          |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------- |
| `d1-hero-drift-animation`      | `main.css:1388, 1391–1404`      | 18s 무한 alternate 모션 — 의미 없는 장식                      |
| `d2-hero-radial-gradients`     | `main.css:1372–1387`            | radial(orange) + radial(sage) + linear 3중 합성 — 파스텔 슬롭 |
| `d3-destination-gradient-wash` | `main.css:1722`                 | 흰→그린 4% 알파 그라디언트 — 시각 노이즈                      |
| `d4-featured-cover-gradient`   | `main.css:1608–1612, 1633–1638` | brand-solid → brand-deep 그라디언트 (deep은 pressed 토큰)     |
| `d5-backdrop-filter-blur`      | `main.css:1313–1314`            | header `blur(10px)` — Seed에 없는 효과                        |

#### UI noise (1)

| ID                          | 위치                                      | 증상                                                            |
| --------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| `d6-external-tab-hint-text` | `index.html:95–96` + `main.css:1489–1493` | "(opens in a new tab)" inline 텍스트 → 아이콘 + visually-hidden |

#### Dead code (3)

| ID                              | 위치                        | 증상                                                                                                 |
| ------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `d7-legacy-catalog-css-1to1262` | `main.css:1–1262`           | 1262줄 catalog 스타일 — index.html 미사용. `legacy-catalog.css`로 분리 후 `all-projects.html`만 로드 |
| `d8-spinner-slideup-keyframes`  | `main.css:665–669, 766–776` | d7과 같은 레거시                                                                                     |
| `d9-double-deep-shadow-toasts`  | `main.css:736–776`          | d7과 같은 레거시                                                                                     |

### 3.4 Import (3) — 신규 도입

| ID                              | 산출물                                                                | 용도                                           |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| `i1-seed-semantic-token-layer`  | `:root`에 Seed semantic 토큰 매핑 (color/dimension/radius/typography) | 모든 Refactor 항목의 토큰 치환 기반            |
| `i2-icon-library-single-source` | Lucide(또는 Tabler) 1종, inline SVG                                   | d6의 외부 링크 / r12의 메일 / 일반 아이콘 슬롯 |
| `i3-lang-toggle-handler-update` | `gateway.js`에 `documentElement.lang` 갱신 추가                       | r9 보완 (WCAG 3.1.2)                           |

### `i1` 권장 스니펫

```css
:root {
  /* primitive (KEI 브랜드 자산) */
  --kei-green: #007a63;
  --kei-green-deep: #005a48;
  --kei-charcoal: #1f2933;

  /* Seed semantic — KEI primitive에 바인딩 */
  --seed-color-bg-brand-solid: var(--kei-green);
  --seed-color-bg-brand-solid-pressed: var(--kei-green-deep);
  --seed-color-bg-brand-weak: #e6f3ef;
  --seed-color-fg-brand: var(--kei-green);
  --seed-color-fg-brand-contrast: #ffffff;
  --seed-color-fg-neutral: #2d2d2d;
  --seed-color-fg-neutral-muted: #5a7a8a;
  --seed-color-fg-neutral-inverted: #ffffff;
  --seed-color-bg-layer-default: #fafaf7;
  --seed-color-bg-layer-floating: #ffffff;
  --seed-color-bg-critical-weak: #fff3f3;
  --seed-color-fg-critical: #b71c1c;
  --seed-color-stroke-critical-solid: #ffcdd2;
  --seed-color-stroke-neutral-weak: #e3e8eb;
  --seed-color-stroke-focus-ring: var(--kei-green);

  /* dimension (4px grid) */
  --seed-dimension-x1: 4px;
  --seed-dimension-x2: 8px;
  --seed-dimension-x3: 12px;
  --seed-dimension-x4: 16px;
  --seed-dimension-x5: 20px;
  --seed-dimension-x6: 24px;
  --seed-dimension-x7: 28px;
  --seed-dimension-x8: 32px;
  --seed-dimension-x12: 48px;
  --seed-dimension-x16: 64px;

  /* radius — r3 + full 우선 */
  --seed-radius-r2: 8px;
  --seed-radius-r3: 12px;
  --seed-radius-r4: 16px;
  --seed-radius-full: 9999px;

  /* typography (px static for marketing hero) */
  --seed-font-size-t4: 14px;
  --seed-line-height-t4: 19px;
  --seed-font-size-t5: 16px;
  --seed-line-height-t5: 22px;
  --seed-font-size-t6: 18px;
  --seed-line-height-t6: 24px;
  --seed-font-size-t7: 20px;
  --seed-line-height-t7: 27px;
  --seed-font-size-t8: 22px;
  --seed-line-height-t8: 30px;
  --seed-font-size-t9: 24px;
  --seed-line-height-t9: 32px;
  --seed-font-size-t10: 26px;
  --seed-line-height-t10: 35px;
}
```

---

## 4. Suggested Staging — 권장 적용 순서

### Stage 1 — P0: dead code 분리 + a11y 후크 (시각 변경 없음)

**목표**: 페이지 무게 감소 + 접근성 회복. 사용자 가시 변화는 거의 없음.

- `d7` `d8` `d9`: legacy CSS 1262줄을 `styles/legacy-catalog.css`로 이동. `all-projects.html`만 link.
- `r8`: `font-family` 순서 → Pretendard 1순위
- `r9` + `i3`: `<html lang>` 정적 + 토글 핸들러 검증 후 `documentElement.lang` 갱신 추가

검증: bundle size, axe-core a11y check, screen reader spot-check.

### Stage 2 — P1: 시각 AI-slop 제거 (가장 큰 인상 변화)

**목표**: "AI가 만든 티" 시각 시그니처 제거. flat + neutral 인상 확보.

- `d1` hero drift 애니메이션 + `@keyframes` 삭제
- `d2` hero 3중 그라디언트 → 단색 `bg.layer-default`
- `d3` destination gradient wash → 단색
- `d4` featured cover gradient → brand-solid 단색
- `d5` header `backdrop-filter: blur(10px)` 제거
- `r1` CTA box-shadow 제거 → `bg.brand-solid-pressed`
- `r2` 카드 hover translateY 제거 → border-color/bg-pressed

검증: Playwright visual regression 또는 Percy snapshot. prefers-reduced-motion 분기 단순화 가능.

### Stage 3 — P2: 토큰 정렬 (i1 도입 후 일괄 치환)

**목표**: 디자인 값의 의미 회복. 미세 정합성 향상.

- `i1` Seed semantic 토큰 레이어 도입 (`:root` 확장)
- `r3` radius 6종 → 4종으로 일괄 치환
- `r4` spacing off-grid → x{n} 토큰 흡수
- `r5` font-size 20종 → t4–t10 흡수
- `r6` line-height → t-pair
- `r7` eyebrow letter-spacing 0.16em → 0.08em
- `r13` error banner 토큰화
- `r14` footer rgba(255,255,255,X) 6단 → inverted 3단

검증: 시각 회귀 + 키보드 포커스 링 색 통일 확인.

### Stage 4 — P3: anatomy 정렬 (선택, 가장 큰 시각 변화)

**목표**: 컴포넌트 의도 통일.

- `d6` external-tab-hint 텍스트 → 아이콘 + visually-hidden
- `i2` 아이콘 라이브러리 1종 결정 후 도입
- `r10` CTA anatomy: BEM 클래스로 정렬 (vanilla 유지) 또는 React 도입
- `r11` lang toggle: Switch / SegmentedControl 결정
- `r12` connect mailto → ActionButton variant="brandWeak"

검증: 키보드 탐색 시퀀스, focus ring, hover/pressed 상태 머신.

---

## 5. Risk & Rollback

| Stage | 위험 항목                                        | 롤백 전략                                 |
| ----- | ------------------------------------------------ | ----------------------------------------- |
| P0    | legacy CSS 분리 시 `all-projects.html` 누락 link | git revert 또는 `<link>` 1줄 복원         |
| P1    | hero 시각 변화 큼 — 이해관계자 사전 합의 필요    | screenshot diff PR로 사전 검토            |
| P2    | 토큰 일괄 치환 시 의도치 않은 사이즈 변경        | per-component visual regression test      |
| P3    | anatomy 변경은 DOM 구조 변화 가능                | E2E 테스트 (gateway.spec.js 등) 통과 확인 |

---

## 6. Domain Exceptions — 정당한 일탈로 인정

| 항목                         | 결정 | 보존 방식                                                                         |
| ---------------------------- | ---- | --------------------------------------------------------------------------------- |
| KEI green `#007a63`          | Keep | Seed semantic 토큰 값으로 바인딩 (i1) — primitive 지키되 사용은 semantic 이름으로 |
| KEI charcoal `#1f2933`       | Keep | 동일 — `--seed-color-bg-neutral-solid` 또는 footer surface로 바인딩               |
| 영문 우선 라벨 + 한국어 보조 | Keep | KEI Global Gateway 정체성                                                         |
| 로고 PNG/JPG 자산            | Keep | 브랜드 자산 그대로                                                                |

---

## 7. Next Steps

1. **§2 Conflict Table의 4건 결정** (r9 검증 / r10 / r11 / i2)
2. 결정 후 `.reconcile/plan.json`의 `needsDecision: true` 항목 갱신
3. **`/daangn-seed-ai:reconcile-apply`** 실행 — Stage 1부터 순차 적용 (각 단계마다 gate)
   - 또는 사용자 직접 적용 시 `stagingOrder` 따라 단계별 PR
4. 각 Stage 완료 후 verify:
   - `npm run check:a11y`
   - `npm run test:e2e:playwright`
   - 시각 회귀 (스크린샷 비교)

---

## Appendix A — 출처 매핑

| 결정 근거                    | Seed 레퍼런스                                   |
| ---------------------------- | ----------------------------------------------- |
| flat·neutral 우선            | `philosophy.md` §원칙 5, `anti-patterns.md` #13 |
| 4px 그리드                   | `tokens/spacing.md`                             |
| r3 + full 90% 커버           | `tokens/radius.md` §원칙 1                      |
| t1–t10 페어링                | `tokens/typography.md` §페어링 규칙             |
| solid 1개 룰                 | `anti-patterns.md` #4                           |
| 버튼 그림자 금지             | `anti-patterns.md` #13                          |
| 한국어 line-height/lang 우선 | `philosophy.md` §4, `tokens/typography.md`      |
| primitive vs semantic        | `tokens/color.md` §Anti-patterns                |
| layout primitive             | `layout/primitives.md`                          |
| 아이콘 슬롯 1라이브러리      | `anti-patterns.md` #14                          |

## Appendix B — Inventory 통계 (gateway 영역만)

| 항목                  | 종 수           | Seed 권장 수       | 흡수 후            |
| --------------------- | --------------- | ------------------ | ------------------ |
| font-size             | ~20             | 10 (t1–t10)        | 7 (t4–t10)         |
| line-height           | 7               | 10 (t-pair)        | 7                  |
| border-radius         | 6               | 4 (r2/r3/r4/full)  | 4                  |
| box-shadow            | 5               | floating overlay만 | 1–2                |
| spacing magic numbers | ~12             | 0                  | 0 (모두 x{n} 토큰) |
| color hex literals    | ~25 (gateway만) | semantic 이름만    | semantic 토큰      |

## Appendix C — 본 보고서가 수정한 파일

`.reconcile/detected.json`, `.reconcile/plan.json`, `.reconcile/report.md`, 그리고 사용자 요청에 따라 최상위 `report.md` 동시 갱신. 그 외 소스 파일(`index.html`, `styles/main.css`)은 **건드리지 않음**.
