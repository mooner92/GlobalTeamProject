# ADR-002: Legacy 363-row Catalog Isolated to `/all-projects.html`

- **Status**: Accepted (2026-04-30) — **partially superseded by ADR-003 (2026-05-12)**
- **Supersedes**: n/a
- **Superseded-by (partial)**: ADR-003 — the catalogue is now the **primary** surface served at `/`; the "footer-only quiet link from gateway" decision below is reversed in favor of `/` → catalogue + header CTA `/index.html` → gateway demo
- **Related**: ADR-001 (Gateway model), ADR-003 (Route swap)

## Context

The Phase G open question in `report/2026-04-30_gateway-landing-plan.md` asked
whether the legacy 363-row catalog (search + Type/Year facets + filter pipeline)
should be **isolated** behind a secondary URL or **fully retired** in favor of
KEI E-library.

Implementation reality:

- The legacy explorer represents real engineering value (deterministic date
  parsing, accessibility wiring, export pipelines, e2e coverage).
- Removing it now would break existing test scaffolding and shed institutional
  knowledge that may inform future curation tooling.
- The gateway's anti-overlap rule (§2 of the plan) bans `自由 텍스트 검색 / 다축
필터 / 363행 노출` from the **gateway** — it does not require deletion of the
  underlying explorer.

## Decision

Isolate the legacy explorer at `/all-projects.html`. Render it only via a
single, quiet footer link on the gateway. Add a "Back to gateway" affordance in
the legacy header so visitors who land directly on `/all-projects.html` can
discover the new front door.

## Drivers

1. Preserve verified engineering work (~2 350 LoC of `scripts/app.js`,
   six existing e2e specs).
2. Allow the gateway to honor the anti-overlap rule without losing the catalog
   as an internal tool.
3. Avoid blocking gateway launch on a delete-vs-keep policy decision that KEI
   staff have not yet sign-off on.

## Alternatives Considered

- **Alt-1: Full retirement** — `index.html` becomes gateway only; delete
  `app.js`, drop legacy specs.
  - Pros: smallest surface area; no two-tone confusion.
  - Cons: irreversibly drops working code; e2e regression net narrows; KEI
    staff lose an internal reference UI before they decide on the long-term
    catalog story.
  - Why rejected: premature commitment; isolation is reversible.

- **Alt-2: Render legacy as a sub-section of the gateway** — embed the
  explorer at the bottom of the landing page.
  - Pros: single URL; no hidden surface.
  - Cons: directly violates §2 anti-overlap rules; tonal mismatch (data
    dashboard inside concierge layout); 5-second test fails.
  - Why rejected: undermines the very framing this redesign exists to fix.

## Consequences

**Positive**

- Gateway ships clean. Legacy code keeps running where it always did.
- e2e suite expands (gateway specs added) without invalidating prior coverage —
  legacy specs migrate to point at `/all-projects.html` (one-line change).
- Dead-link risk on the explorer is contained: only the footer link from the
  gateway needs auditing.

**Negative / Trade-offs**

- Two tones live side-by-side. Mitigated by:
  - Footer-only quiet link from gateway (no header exposure).
  - Back-to-gateway link inside the legacy header.
- Continued maintenance cost on the legacy explorer until KEI staff decide
  retirement.

## Follow-ups

- KEI staff sign-off on long-term retirement vs. keep-isolated (§8.G in plan).
- After 60 days, review explorer analytics (if instrumented) and revisit
  retirement.
- Add `scripts/check-links.mjs` to a quarterly cron / GitHub Action so the
  five destination URLs and the eight featured URLs are pinged automatically.
