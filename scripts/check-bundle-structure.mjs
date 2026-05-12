#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";

// After ADR-003 (2026-05-12), the catalogue is the main app served at `/`.
// The legacy gateway/landing remains at `/index.html` as a demo; it has its
// own minimal asset bundle and is not validated by this guardrail.
const issues = [];
const mainPath = "all-projects.html";

if (!existsSync(mainPath)) {
  console.error(`[check:bundle-structure] FAILED: ${mainPath} not found`);
  process.exit(1);
}

const html = readFileSync(mainPath, "utf8");

const requiredAssets = [
  "styles/legacy-catalog.css",
  "scripts/data/contract.js",
  "scripts/app.js",
  "scripts/i18n/dict.js",
];
for (const asset of requiredAssets) {
  if (!existsSync(asset)) {
    issues.push(`missing required asset file: ${asset}`);
  }
  if (!html.includes(asset)) {
    issues.push(`${mainPath} does not reference required asset: ${asset}`);
  }
}

if (/<style[\s>]/i.test(html)) {
  issues.push(
    `${mainPath} contains inline <style> block; expected external stylesheet`,
  );
}

const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
for (const block of scriptBlocks) {
  const body = (block[1] || "").trim();
  if (body.length > 0) {
    issues.push(
      `${mainPath} contains inline <script> body; expected external script modules`,
    );
    break;
  }
}

if (issues.length > 0) {
  console.error("[check:bundle-structure] FAILED");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log("[check:bundle-structure] PASS: modular asset structure is valid.");
