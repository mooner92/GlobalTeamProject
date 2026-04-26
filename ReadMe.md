# KEI Project Search by Research Focus

A static web app for browsing KEI research projects by research focus area, with PDF and Excel export.

## Overview

### Purpose

- Browse projects by one or more research focus areas
- Filter projects using focus, search, and date range controls
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
2. Ensure these header names are present (case-insensitive):
   - `No.`, `Type`, `Title`, `PI`, `Primary Focus`, `Secondary Focus`, `Project Start`, `Project End`
3. Replace the data file:

```bash
mv your-updated-file.xlsx data/projects.xlsx
```

4. Re-run `npm run validate:data`

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

## Validation and Quality Workflow

Use the scripts that exist in this repository:

```bash
npm run lint            # ESLint checks
npm run format:check    # Prettier format validation
npm run test:e2e        # Full Playwright verification flow
npm run validate:data   # Spreadsheet schema and header checks
npm run check:security  # Data rendering safety checks
npm run verify:export   # Export workflow verification
npm run verify:keyboard # Keyboard interaction checks
npm run verify:search-date # Search and date filter verification
npm run perf:export     # Export performance smoke check
npm run docs:check      # Docs snippets and reference consistency checks
npm run ci:local        # Orchestrates a local quality gate sequence
```

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
