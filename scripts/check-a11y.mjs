#!/usr/bin/env node

import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const targets = [
  {
    name: "gateway",
    url: "http://127.0.0.1:4173/index.html",
    readyPredicate: () =>
      typeof window.__keiGetGatewayState === "function" &&
      window.__keiGetGatewayState().ready === true,
  },
  {
    name: "all-projects",
    url: "http://127.0.0.1:4173/all-projects.html",
    readyPredicate: () => {
      const text = document.getElementById("resultsCount")?.textContent ?? "";
      return text !== "—" && text.trim() !== "";
    },
  },
];

async function canReach(url) {
  try {
    const response = await fetch(url);
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

async function ensureServerReady(probeUrl) {
  if (await canReach(probeUrl)) {
    return { process: null };
  }

  const serverProcess = spawn(process.execPath, ["scripts/serve.mjs", "4173"], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  const ready = await waitForReachable(probeUrl, 12000);
  if (!ready) {
    serverProcess.kill("SIGTERM");
    throw new Error(
      "Failed to start local static server on http://127.0.0.1:4173",
    );
  }

  return { process: serverProcess };
}

async function run() {
  await mkdir(path.join(repoRoot, ".sisyphus", "evidence"), {
    recursive: true,
  });

  const server = await ensureServerReady(targets[0].url);
  const browser = await chromium.launch({ headless: true });

  let totalCritical = 0;
  try {
    for (const target of targets) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(target.url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(target.readyPredicate, { timeout: 20000 });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical",
      );
      if (critical.length > 0) {
        console.error(
          `[check:a11y] ${target.name}: ${critical.length} critical violation(s).`,
        );
        for (const violation of critical) {
          console.error(`- ${violation.id}: ${violation.help}`);
        }
        totalCritical += critical.length;
      } else {
        console.log(`[check:a11y] ${target.name}: PASS (no critical).`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }

  if (totalCritical > 0) {
    console.error(
      `[check:a11y] FAILED: ${totalCritical} critical violation(s) across ${targets.length} pages.`,
    );
    process.exit(1);
  }
  console.log(
    `[check:a11y] PASS: no critical accessibility violations across ${targets.length} pages.`,
  );
}

run().catch((error) => {
  console.error(`[check:a11y] FAILED: ${error.message}`);
  process.exit(1);
});
