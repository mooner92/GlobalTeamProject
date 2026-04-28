# KEI Project Search by Research Focus

A static web app for browsing KEI research projects by research focus area, with PDF and Excel export.

## Overview

### Purpose

- Browse projects by one or more research focus areas
- Filter projects using focus, search, date range, and Type/Year facets
- Switch UI between Korean and English
- Open project detail modal with shareable deep-link
- Export selected projects to PDF or Excel
- Maintain static-only runtime for easy internal distribution

### Background

- **KEI AI Data Team**: Data management and technical implementation
- **KEI Global Cooperation Team**: Requirements and user workflow support

## Technology Stack

- **Frontend**: HTML5, CSS, JavaScript (ES6+)
- **Runtime/tooling**: Node.js scripts and Python HTTP server
- **Libraries**:
  - [SheetJS (xlsx.js)](https://github.com/SheetJS/sheetjs) - Excel parsing
  - [jsPDF](https://github.com/parallax/jsPDF) - PDF generation
  - [html2canvas](https://github.com/niklasvh/html2canvas) - PDF snapshot rendering

## Installation & Usage

### Quick Start

1. **Clone the repository**

```bash
git clone https://github.com/mooner92/GlobalTeamProject.git
cd GlobalTeamProject
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the local static runtime**

```bash
npm run dev
```

- The app is served at `http://127.0.0.1:4173/index.html`
- Keep this command running while validating the app locally

4. **Validate runtime health** (in a second terminal)

```bash
npm run health:app
```

- Checks that `/index.html` and `/data/projects.xlsx` are reachable

5. **Run quality and verification checks**

```bash
npm run ci:local
```

- Runs lint, format checks, e2e tests, data validation, and security checks in one command

### Updating Project Data

The app reads `data/projects.xlsx` directly.

1. Prepare a spreadsheet with a `List` sheet
2. Ensure these required header names are present (case-insensitive):
   - `No.`, `Type`, `Title`, `PI`, `Primary Focus`, `Secondary Focus`, `Project Start`, `Project End`
3. Optionally include any of these per-project attachment columns; leave the cell blank when not used:
   - `Thumbnail` — relative path under `data/assets/...` (e.g. `data/assets/2025-001/cover.jpg`) or a full `https://` URL
   - `PDF` — relative path or `https://` URL to the project's PDF
   - `Link` — `https://` URL to the original/source page
     Only `http(s)://` URLs and paths under `data/` render in the UI; anything else (e.g. `javascript:`) is dropped silently.
4. Replace the data file:

```bash
mv your-updated-file.xlsx data/projects.xlsx
```

5. Re-run `npm run validate:data`

#### Repairing data/projects.xlsx

If the workbook was edited externally and contains stray `0` values in `Secondary Focus` or `Eoclogy` (typo of `Ecology`) in `Primary Focus`, run the in-place repair script:

```bash
node scripts/fix-projects-xlsx.mjs
```

The script is idempotent: rerunning it on a clean workbook is a no-op. It also appends the optional `Thumbnail`, `PDF`, and `Link` columns when missing, so older workbooks gain the attachment headers without manual editing.

#### Storing attachments locally

Drop project-specific assets under `data/assets/<project-id>/`. Anything in `data/assets/` is served by the static dev server, so a relative path like `data/assets/2025-001/cover.jpg` works for both `Thumbnail` and `PDF`. Use absolute `https://` URLs for assets hosted elsewhere.

## Project Structure

```text
GlobalTeamProject/
├── index.html                 # Main application entry
├── styles/                    # Shared stylesheet assets
├── scripts/
│   ├── ci-local.mjs           # Local quality orchestration
│   ├── health-app.mjs         # Runtime endpoint checks
│   ├── check-security.mjs     # Spreadsheet source safety checks
│   ├── perf-export.mjs        # Export performance workflow checks
│   ├── validate-data.mjs      # Data contract validator
│   ├── verify-export-flow.mjs  # Export verification flow
│   ├── verify-keyboard-accessibility.mjs
│   ├── verify-search-date-filter.mjs
│   └── docs-check.mjs         # Documentation consistency checks
├── tests/
│   └── e2e/                   # Playwright-based workflow checks
├── data/
│   └── projects.xlsx          # Input spreadsheet for all project data
├── .sisyphus/                 # Internal operation and planning notes
├── package.json
└── ReadMe.md
```

## How it works

- The app runs entirely in the browser and loads `data/projects.xlsx` through `fetch` from a local static server.
- SheetJS maps the `List` sheet to project records, normalizes focus fields, and derives project counts.
- Filtering is applied across multiple focus, title/PI search, and date range criteria.
- Export flows generate a filtered dataset and render either a multi-page PDF or a structured Excel workbook.

## Keyboard Shortcuts

- `Ctrl + A`: Select all focus chips
- `Ctrl + D`: Clear all focus filters
- `Ctrl + S`: Download PDF
- `Ctrl + E`: Download Excel

## Language

The app supports English and Korean UI:

- Default language is English
- Click the language toggle in the header to switch to Korean or back to English
- URL parameter `?lang=ko` opens the app in Korean; `?lang=en` opens in English (overrides stored preference on first load)
- Your language choice is remembered in `localStorage["kei.lang"]` and persists across page reloads
- All UI strings, buttons, and date formats update instantly when you toggle the language

## Project Detail Modal

Click a project's title to open a detail modal with full metadata:

- Shows project type, title, PI name, project period, and focus areas
- "Copy link" button copies a shareable URL (e.g., `index.html#project=<id>`) — you can share this link with colleagues and it will open that project's modal directly
- "Copy citation" button copies a plain-text citation in the current language (Korean or English)
- Deep-link: opening `index.html#project=<id>` directly in the browser opens that project's modal after the app loads
- Press ESC, click the backdrop, or click "Close" to close the modal
- If the project ID in the URL does not exist, a translated message appears and the modal does not open

## Filtering and Facets

Above the search and date-range toolbar, you will see Type and Year facet chips:

- **Type facets** — chips for each project type (e.g., "Working Paper", "Policy Report"), with a count of matching projects
- **Year facets** — chips for each start year, with a count of matching projects
- Select any combination of Type and Year chips; projects matching _any_ selected Type _and any_ selected Year will appear (AND logic across facets, OR logic within each facet)
- Active filters are reflected in the URL: `?type=A,B&year=2024,2023`; reload the page and your selections are restored
- "Reset" button in the toolbar clears all filters (focus areas, search, date range, Type, Year) at once

## Validation and Quality Workflow

Use the scripts that exist in this repository:

```bash
npm run lint            # ESLint checks
npm run format:check    # Prettier format validation
npm run test:e2e        # Full Playwright verification flow (includes i18n, project-detail, and facets specs)
npm run validate:data   # Spreadsheet schema and header checks
npm run check:security  # Data rendering safety checks
npm run verify:export   # Export workflow verification
npm run verify:keyboard # Keyboard interaction checks
npm run verify:search-date # Search and date filter verification
npm run perf:export     # Export performance smoke check
npm run docs:check      # Docs snippets and reference consistency checks
npm run ci:local        # Orchestrates a local quality gate sequence
```

The three new end-to-end test specs are automatically included:

- `tests/e2e/i18n.spec.js` — Language toggle, URL parameter, persistence, date formatting, accessibility
- `tests/e2e/project-detail.spec.js` — Modal open/close, copy link, copy citation, deep-link, focus trap
- `tests/e2e/facets.spec.js` — Type and Year facets, multi-select, intersection with other filters, URL sync, reset

Pre-commit gate (optional but recommended):

```bash
npm run prepare          # installs husky hooks
git commit ...           # runs lint-staged checks on staged files
```

For a docs-first sanity check:

```bash
npm run docs:check
npm run dev            # in one terminal
npm run health:app      # in another terminal
```

## Known Limitations

- Static-only mode, no backend or authentication layer
- Large spreadsheets can increase first paint and export time
- Browser memory limits can affect very large exports

## Future Work

- Improve spreadsheet validation messages for edge cases
- Add optional richer analytics views for focus trends
- Add additional export layout presets for repeated reporting use cases

## Contributing and Support

This is an internal KEI project. Please route bug reports and feature requests through KEI internal channels.

## License

Internal project use only, proprietary by Korea Environment Institute.

## Acknowledgments

- Korea Environment Institute (KEI)
- KEI AI Data Team
- KEI Global Cooperation Team

**Korea Environment Institute (한국환경연구원)**
Website: https://www.kei.re.kr
