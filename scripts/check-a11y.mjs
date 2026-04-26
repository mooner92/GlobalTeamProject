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
const appUrl = "http://127.0.0.1:4173/index.html";

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

async function ensureServerReady() {
  if (await canReach(appUrl)) {
    return { process: null };
  }

  const serverProcess = spawn("python3", ["-m", "http.server", "4173"], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  const ready = await waitForReachable(appUrl, 12000);
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

  const server = await ensureServerReady();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const text = document.getElementById("resultsCount")?.textContent ?? "";
        return text !== "—" && text.trim() !== "";
      },
      { timeout: 20000 },
    );

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const critical = results.violations.filter((v) => v.impact === "critical");
    if (critical.length > 0) {
      console.error(
        `[check:a11y] FAILED: ${critical.length} critical violation(s) detected.`,
      );
      for (const violation of critical) {
        console.error(`- ${violation.id}: ${violation.help}`);
      }
      process.exit(1);
    }

    await context.close();
    console.log(
      "[check:a11y] PASS: no critical accessibility violations detected.",
    );
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(`[check:a11y] FAILED: ${error.message}`);
  process.exit(1);
});
