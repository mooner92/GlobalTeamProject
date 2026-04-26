#!/usr/bin/env node

import { readFileSync, existsSync } from "node:fs";

const issues = [];
const indexPath = "index.html";

if (!existsSync(indexPath)) {
  console.error("[check:bundle-structure] FAILED: index.html not found");
  process.exit(1);
}

const html = readFileSync(indexPath, "utf8");

const requiredAssets = [
  "styles/main.css",
  "scripts/data/contract.js",
  "scripts/app.js",
];
for (const asset of requiredAssets) {
  if (!existsSync(asset)) {
    issues.push(`missing required asset file: ${asset}`);
  }
  if (!html.includes(asset)) {
    issues.push(`index.html does not reference required asset: ${asset}`);
  }
}

if (/<style[\s>]/i.test(html)) {
  issues.push(
    "index.html contains inline <style> block; expected external stylesheet",
  );
}

const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
for (const block of scriptBlocks) {
  const body = (block[1] || "").trim();
  if (body.length > 0) {
    issues.push(
      "index.html contains inline <script> body; expected external script modules",
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
