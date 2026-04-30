#!/usr/bin/env node
// Validates the gateway JSON contracts: research-areas.json, featured.json,
// destinations.json. Fails (exit 1) when invariants are broken.
//
// Invariants:
//   research-areas.json: 5–7 items, each with id, title_en, blurb_en, icon
//   featured.json:       every renderable item must have a non-empty url and
//                        the url must be https:// or data/. Items without a
//                        url are tolerated (they are silently skipped at
//                        render time) but a warning is emitted so curation
//                        stays honest.
//   destinations.json:   4–6 items, each with id, title_en, url (https://),
//                        blurb_en, audience_hint_en

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function isSafeUrl(value) {
  return (
    typeof value === "string" &&
    (value.startsWith("https://") || value.startsWith("data/"))
  );
}

async function loadJson(relPath) {
  const full = path.join(repoRoot, relPath);
  const raw = await readFile(full, "utf8");
  return JSON.parse(raw);
}

function fail(message, details) {
  console.error(`[GATEWAY_VALIDATION_FAIL] ${message}`);
  if (details) console.error(JSON.stringify(details, null, 2));
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[GATEWAY_VALIDATION_WARN] ${message}`);
}

async function validateAreas() {
  const data = await loadJson("data/research-areas.json");
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length < 5 || items.length > 7) {
    fail(`research-areas.json must have 5–7 items, got ${items.length}`);
  }
  const seen = new Set();
  items.forEach((item, index) => {
    const ctx = `research-areas[${index}]`;
    if (!item.id) fail(`${ctx} missing id`);
    if (seen.has(item.id)) fail(`${ctx} duplicate id "${item.id}"`);
    seen.add(item.id);
    if (!item.title_en) fail(`${ctx} missing title_en`);
    if (!item.blurb_en) fail(`${ctx} missing blurb_en`);
    if (!item.icon) fail(`${ctx} missing icon`);
    if (item.destination && !isSafeUrl(item.destination)) {
      fail(`${ctx} destination must be https://`, {
        destination: item.destination,
      });
    }
  });
}

async function validateFeatured() {
  const data = await loadJson("data/featured.json");
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    fail("featured.json must have at least one item");
  }
  let renderable = 0;
  const seenRanks = new Map();
  items.forEach((item, index) => {
    const ctx = `featured[${index}] (${item.id || "?"})`;
    if (!item.id) fail(`${ctx} missing id`);
    if (!item.title_en) fail(`${ctx} missing title_en`);
    if (!item.summary_en) fail(`${ctx} missing summary_en`);

    if (typeof item.url === "string" && item.url) {
      if (!isSafeUrl(item.url)) {
        fail(`${ctx} url must start with https:// or data/`, { url: item.url });
        return;
      }
      renderable += 1;
    } else {
      warn(`${ctx} has no url — will be skipped at render time`);
    }

    if (item.rank !== undefined) {
      if (!Number.isInteger(item.rank) || item.rank < 1) {
        fail(`${ctx} rank must be a positive integer`);
      } else if (seenRanks.has(item.rank)) {
        fail(
          `${ctx} duplicate rank ${item.rank} (also used by ${seenRanks.get(item.rank)})`,
        );
      } else {
        seenRanks.set(item.rank, item.id);
      }
    }

    if (item.cover_url && !isSafeUrl(item.cover_url)) {
      fail(`${ctx} cover_url unsafe`, { cover_url: item.cover_url });
    }
  });

  if (renderable < 8 || renderable > 12) {
    fail(
      `featured.json must have 8–12 renderable items (with url), got ${renderable}`,
    );
  }
}

async function validateDestinations() {
  const data = await loadJson("data/destinations.json");
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length < 4 || items.length > 6) {
    fail(`destinations.json must have 4–6 items, got ${items.length}`);
  }
  const seen = new Set();
  items.forEach((item, index) => {
    const ctx = `destinations[${index}]`;
    if (!item.id) fail(`${ctx} missing id`);
    if (seen.has(item.id)) fail(`${ctx} duplicate id "${item.id}"`);
    seen.add(item.id);
    if (!item.title_en) fail(`${ctx} missing title_en`);
    if (!item.blurb_en) fail(`${ctx} missing blurb_en`);
    if (!item.audience_hint_en) fail(`${ctx} missing audience_hint_en`);
    if (!isSafeUrl(item.url)) {
      fail(`${ctx} url must start with https:// or data/`, { url: item.url });
    }
  });
}

(async () => {
  try {
    await validateAreas();
    await validateFeatured();
    await validateDestinations();
    if (process.exitCode === 1) {
      console.error("[GATEWAY_VALIDATION] One or more validations failed.");
      process.exit(1);
    }
    console.log("[GATEWAY_VALIDATION_OK]");
  } catch (error) {
    console.error("[GATEWAY_VALIDATION_ERROR]");
    console.error(error.message);
    process.exit(1);
  }
})();
