#!/usr/bin/env node
// Walks data/destinations.json + data/research-areas.json + data/featured.json
// and HEAD-pings every external URL. Reports non-2xx as warnings; exits 0
// always (advisory) unless --strict is passed.
//
// Usage:
//   node scripts/check-links.mjs            # warn-only
//   node scripts/check-links.mjs --strict   # exit 1 on any dead link

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const strict = process.argv.includes("--strict");

async function loadJson(relPath) {
  const full = path.join(repoRoot, relPath);
  const raw = await readFile(full, "utf8");
  return JSON.parse(raw);
}

async function probeUrl(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, ok: false, error: error.message };
  }
}

function collectUrls(json, fields) {
  const urls = [];
  for (const item of json.items || []) {
    for (const field of fields) {
      if (item[field] && typeof item[field] === "string") {
        urls.push({ source: item.id, field, url: item[field] });
      }
    }
  }
  return urls;
}

(async () => {
  const areas = await loadJson("data/research-areas.json");
  const featured = await loadJson("data/featured.json");
  const destinations = await loadJson("data/destinations.json");

  const targets = [
    ...collectUrls(areas, ["destination"]),
    ...collectUrls(featured, ["url", "cover_url"]),
    ...collectUrls(destinations, ["url"]),
  ].filter((t) => /^https:\/\//.test(t.url));

  console.log(`[check-links] probing ${targets.length} URLs...`);
  const results = await Promise.all(targets.map((t) => probeUrl(t.url)));

  const dead = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const target = targets[i];
    if (!result.ok) {
      dead.push({ ...target, ...result });
      console.warn(
        `[check-links] ✗ ${target.source}.${target.field} ${target.url} ${result.status || result.error}`,
      );
    } else {
      console.log(
        `[check-links] ✓ ${target.source}.${target.field} ${target.url} ${result.status}`,
      );
    }
  }

  if (dead.length > 0 && strict) {
    console.error(`[check-links] FAILED: ${dead.length} dead link(s).`);
    process.exit(1);
  }
  console.log(
    `[check-links] done — ${targets.length - dead.length}/${targets.length} OK`,
  );
})();
