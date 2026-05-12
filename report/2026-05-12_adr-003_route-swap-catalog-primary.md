# ADR-003: Swap `/` Route — Catalogue Promoted to Primary, Gateway Demoted to Demo

- **Status**: Accepted (2026-05-12)
- **Supersedes**: partial revision of ADR-002 (footer-only catalogue access)
- **Related**: ADR-001 (Gateway model), ADR-002 (Legacy catalogue isolation)

## Context

ADR-002 (2026-04-30) isolated the 363-row legacy catalogue at
`/all-projects.html`, kept the gateway/landing at `/`, and exposed the
catalogue only through a single quiet footer link from the gateway.

Two weeks of internal use revealed that this hierarchy inverted the actual
usage pattern:

- The catalogue is hit by **every** workflow that matters to KEI staff:
  filtering by focus area, opening project detail modals, exporting to
  PDF/Excel. The gateway is a one-time orientation surface for external
  visitors.
- KEI Global Cooperation team members report bookmarking
  `/all-projects.html` directly to skip the gateway.
- e2e coverage already weights the catalogue 6:1 over the gateway
  (`baseline / contract / facets / failure-evidence / i18n /
project-detail / thumbnails` all hit `/all-projects.html`; only
  `gateway.spec.js` hits `/index.html`).

The gateway is not being retired — it remains the right canonical surface
for first-time external visitors. But the **default URL** should serve the
heavier-used page.

## Decision

Swap the `/` server route so it serves the catalogue. Keep the gateway
directly reachable at `/index.html` and surface it from the catalogue
header via a "Try demo landing page!" CTA.

Concretely:

- `scripts/serve.mjs:38` — `/` maps to `/all-projects.html` (was `/index.html`).
- `all-projects.html` header — `legacy-back-link` repurposed as a brand-toned
  CTA ("Try demo landing page! →"), `href="index.html"`.
- `all-projects.html` logo — `href` flipped from `index.html` to `/`
  (logo = home = self under the new default route).
- `scripts/check-bundle-structure.mjs` — guardrail re-pointed from
  `index.html` to `all-projects.html` (also fixes a pre-existing failure
  introduced by ADR-002's HTML split that this ADR did not originally
  account for).
- File names are **unchanged**. No bookmark on `/all-projects.html` breaks;
  no e2e path needs rewriting.

## Drivers

1. **Match the default URL to the dominant workflow.** Bookmarks and link
   sharing default to `/`, which should land on the page people use.
2. **Zero churn on existing E2E coverage.** All 18 catalogue spec
   `page.goto('/all-projects.html')` calls keep working because the file
   still exists at that path.
3. **Reversibility.** Server-route swap is one line; rolling back if KEI
   staff disagree is trivial. File rename would be a larger blast radius.
4. **Discoverability of the gateway.** A header CTA labelled "Try demo
   landing page!" is more visible than the previous "← Back to gateway"
   wording, signalling that the gateway is a _destination_ worth visiting,
   not a place to retreat to.

## Alternatives Considered

- **Alt-1: File rename — `all-projects.html` → `index.html`, current
  `index.html` → `landing.html`.**
  - Pros: works on any static host (GitHub Pages, S3) without server
    rewrites; the `/` default-document convention does the routing.
  - Cons: breaks every `/all-projects.html` bookmark; requires updating
    18 e2e `page.goto` paths, multiple docs, every internal anchor;
    larger PR, higher review burden.
  - Why rejected: same end-user outcome with much greater short-term
    cost. File rename can still be done later as a deployment step if/when
    static hosting becomes the deploy target.

- **Alt-2: `index.html` becomes an HTTP-style redirect to
  `/all-projects.html`.**
  - Pros: works on any static host; preserves bookmarks on both URLs.
  - Cons: requires a meta-refresh or JS redirect since this is a static
    site; the gateway content has to move somewhere (e.g., `/landing.html`)
    introducing the same renames as Alt-1; redirects make the gateway
    _less_ discoverable, not more.
  - Why rejected: contradicts the goal of keeping the gateway as a
    deliberate, named destination.

- **Alt-3: Keep ADR-002 as-is, just relabel the footer link more
  prominently.**
  - Pros: zero code change.
  - Cons: doesn't address the bookmark-default mismatch; the gateway as
    `/` still implies "this is the front door" even when usage says
    otherwise.
  - Why rejected: doesn't solve the actual problem.

## Consequences

**Positive**

- Default URL now matches the default workflow.
- Gateway demo remains a first-class destination, accessible by direct URL
  and from the catalogue header CTA.
- All E2E specs pass unchanged.
- Pre-existing `check:bundle-structure` failure (introduced by ADR-002's
  HTML split, never repaired) is also fixed in this pass.

**Negative / Trade-offs**

- The server-route swap is **dev-only** (lives in `scripts/serve.mjs`).
  If/when the site is deployed to a static host (GitHub Pages, Vercel,
  Nginx), the same swap must be encoded as a rewrite rule **or** the
  file-rename alternative (Alt-1) must be executed at that point.
  Mitigation: file `.deploy/route-map.md` (TBD) will record the required
  rewrite when deploy target is chosen.
- Two URLs (`/` and `/all-projects.html`) now serve identical content.
  Slight SEO ambiguity in theory; this is an internal tool, so the cost is
  effectively zero.
- The gateway no longer pre-frames first-time visitors before they hit the
  catalogue. Mitigation: the "Try demo landing page!" CTA in the
  catalogue header is reasonably prominent (brand-toned button, header
  position); first-time external visitors who want orientation can opt
  into it.

## Validation

Verified on 2026-05-12 with `node scripts/serve.mjs 4180`:

| URL                  | Title                                              | Notes                                                      |
| -------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `/`                  | `KEI Research Project Explorer — Full Catalog`     | New default. CTA "Try demo landing page!" present in DOM.  |
| `/index.html`        | `KEI Global Gateway — Korea Environment Institute` | Direct URL preserved; gateway demo still works.            |
| `/all-projects.html` | `KEI Research Project Explorer — Full Catalog`     | Alias; identical content to `/`. All e2e specs unaffected. |
| `/landing.html`      | HTTP 404                                           | No phantom files created.                                  |

`npm run check:bundle-structure` now passes (was failing before this ADR
due to stale `index.html` references inherited from ADR-002).

## Follow-ups

- **Deploy-target routing**: when static host is chosen, encode the
  `/` → `/all-projects.html` rewrite (Nginx `try_files`, Vercel
  `rewrites`, etc.) or execute Alt-1 file rename. Track as a Phase-H
  task.
- **CTA wording validation**: ask KEI Global Cooperation team whether
  "Try demo landing page!" is the right tone for the audience or if
  something more formal ("View KEI Global Gateway") would land better.
- **Analytics (optional)**: if/when telemetry is added, measure CTA
  click-through to validate that the gateway remains discoverable under
  the new hierarchy.
- **ReadMe + ADR-002 follow-up**: ADR-002 status updated in this commit
  to note partial supersession; ReadMe Quick Start updated to point at
  `/`.
