#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const availableScripts = packageJson.scripts || {};

const preferredChecks = [
  "health:app",
  "check:bundle-structure",
  "lint",
  "format:check",
  "test:e2e",
  "validate:data",
  "check:security",
  "check:a11y",
];
const checks = preferredChecks.filter(
  (name) => typeof availableScripts[name] === "string",
);

const healthUrl =
  process.env.APP_BASE_URL || "http://127.0.0.1:4173/index.html";

async function canReach(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (_error) {
    return false;
  }
}

async function waitForReachable(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await canReach(url)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function ensureServerIfNeeded() {
  if (!checks.includes("health:app")) {
    return null;
  }

  if (await canReach(healthUrl)) {
    return null;
  }

  const server = spawn("python3", ["-m", "http.server", "4173"], {
    stdio: "ignore",
    detached: true,
  });

  server.unref();

  const pid = server.pid;
  const ready = await waitForReachable(healthUrl, 12000);
  if (!ready) {
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch (_error) {
        // no-op
      }
    }
    console.error(
      "[ci:local] FAILED: fallback static server did not become ready.",
    );
    process.exit(1);
  }

  return pid;
}

async function run() {
  if (checks.length === 0) {
    console.log("[ci:local] No quality-check scripts found. Nothing to run.");
    process.exit(0);
  }

  const fallbackServerPid = await ensureServerIfNeeded();

  try {
    for (const check of checks) {
      console.log(`[ci:local] Running: npm run ${check}`);
      const result = spawnSync("npm", ["run", check], { stdio: "inherit" });

      if (result.status !== 0) {
        console.error(`[ci:local] FAILED on script: ${check}`);
        process.exit(result.status ?? 1);
      }
    }

    console.log("[ci:local] PASS: all available quality checks succeeded.");
  } finally {
    if (fallbackServerPid) {
      try {
        process.kill(fallbackServerPid, "SIGTERM");
      } catch (_error) {
        // no-op
      }
    }
  }
}

run().catch((error) => {
  console.error(`[ci:local] FAILED: ${error.message}`);
  process.exit(1);
});
