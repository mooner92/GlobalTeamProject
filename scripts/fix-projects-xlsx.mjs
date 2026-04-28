#!/usr/bin/env node
// Cleans known data issues in data/projects.xlsx and adds the optional
// Thumbnail / PDF / Link columns. Idempotent: rerunning is a no-op once the
// data is clean and the columns already exist.
//
// Fixes applied:
//   1. Secondary Focus cells holding the literal number 0 → empty.
//   2. Primary Focus "Eoclogy" → "Ecology" (typo on row 167 / id 2025-062).
//   3. Append Thumbnail / PDF / Link headers if missing.
//
// Usage: node scripts/fix-projects-xlsx.mjs

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const xlsx = require("xlsx");

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const xlsxPath = path.join(repoRoot, "data", "projects.xlsx");

const workbook = xlsx.readFile(xlsxPath, { cellDates: true });
const sheetName = "List";
const sheet = workbook.Sheets[sheetName];
if (!sheet) {
  console.error(`[fix-projects-xlsx] FAIL: sheet "${sheetName}" not found.`);
  process.exit(1);
}

const aoa = xlsx.utils.sheet_to_json(sheet, {
  header: 1,
  defval: "",
  raw: true,
});

const HEADER_ROW = 3;
const PRIMARY_COL = 4;
const SECONDARY_COL = 5;

if (!Array.isArray(aoa[HEADER_ROW])) {
  console.error(
    `[fix-projects-xlsx] FAIL: missing header row at index ${HEADER_ROW}.`,
  );
  process.exit(1);
}

let zerosCleared = 0;
let typosFixed = 0;

for (let i = HEADER_ROW + 1; i < aoa.length; i += 1) {
  const row = aoa[i];
  if (!Array.isArray(row)) continue;
  const sec = row[SECONDARY_COL];
  if (sec === 0 || sec === "0") {
    row[SECONDARY_COL] = "";
    zerosCleared += 1;
  }
  const primary = row[PRIMARY_COL];
  if (
    typeof primary === "string" &&
    primary.trim().toLowerCase() === "eoclogy"
  ) {
    row[PRIMARY_COL] = "Ecology";
    typosFixed += 1;
  }
}

const headerRow = aoa[HEADER_ROW];
const existingHeaders = headerRow.map((h) =>
  String(h ?? "")
    .trim()
    .toLowerCase(),
);
const optionalHeaders = ["Thumbnail", "PDF", "Link"];
let columnsAdded = 0;
optionalHeaders.forEach((header) => {
  if (!existingHeaders.includes(header.toLowerCase())) {
    headerRow.push(header);
    columnsAdded += 1;
  }
});

// Pad data rows to match the (possibly extended) header row width so
// xlsx.utils.aoa_to_sheet emits the new columns even when their cells are blank.
const targetWidth = headerRow.length;
for (let i = HEADER_ROW + 1; i < aoa.length; i += 1) {
  const row = aoa[i];
  if (!Array.isArray(row)) continue;
  while (row.length < targetWidth) row.push("");
}

const newSheet = xlsx.utils.aoa_to_sheet(aoa, { cellDates: true });

// Preserve any custom column widths from the original sheet's `!cols` if
// present; do not invent new widths for the appended columns.
if (sheet["!cols"]) newSheet["!cols"] = sheet["!cols"];
if (sheet["!merges"]) newSheet["!merges"] = sheet["!merges"];

workbook.Sheets[sheetName] = newSheet;
xlsx.writeFile(workbook, xlsxPath, { cellDates: true });

console.log(
  `[fix-projects-xlsx] OK — zeros cleared: ${zerosCleared}; typos fixed: ${typosFixed}; columns added: ${columnsAdded}`,
);
