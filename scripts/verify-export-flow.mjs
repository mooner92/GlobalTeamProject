#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const evidenceDir = path.join(repoRoot, ".sisyphus", "evidence");
const screenshotPath = path.join(
  evidenceDir,
  "task-7-performance-export-error.png",
);
const artifactPath = path.join(evidenceDir, "task-7-export-flow-verify.json");

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
    const reachable = await canReach(url);
    if (reachable) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

async function ensureServerReady() {
  const healthUrl = "http://127.0.0.1:4173/all-projects.html";
  const existingReady = await canReach(healthUrl);
  if (existingReady) {
    return { process: null };
  }

  const serverProcess = spawn(process.execPath, ["scripts/serve.mjs", "4173"], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  const ready = await waitForReachable(healthUrl, 12000);
  if (!ready) {
    serverProcess.kill("SIGTERM");
    throw new Error(
      "Failed to start local static server on http://127.0.0.1:4173",
    );
  }

  return { process: serverProcess };
}

async function run() {
  await mkdir(evidenceDir, { recursive: true });
  const server = await ensureServerReady();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:4173/all-projects.html", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => {
        const value =
          document.getElementById("resultsCount")?.textContent ?? "";
        return value !== "—" && value.trim() !== "";
      },
      { timeout: 20000 },
    );

    await page.click("#selectAllBtn");
    await page.waitForFunction(
      () => {
        const value =
          document.getElementById("selectedProjectCountPDF")?.textContent ??
          "0";
        return Number.parseInt(value, 10) > 0;
      },
      { timeout: 5000 },
    );

    await page.evaluate(() => {
      window.html2canvas = function injectedFailure() {
        return Promise.reject(
          new Error("Injected export failure for verification"),
        );
      };
    });

    await page.click("#downloadBtn");
    await page.waitForFunction(
      () => {
        const status = document.getElementById("pdfExportStatus");
        if (!status) {
          return false;
        }
        const hasErrorClass = status.classList.contains("error");
        const text = status.textContent ?? "";
        return (
          hasErrorClass &&
          text.includes("Injected export failure for verification")
        );
      },
      { timeout: 10000 },
    );

    await page.selectOption("#sortSelect", "title_asc");
    await page.waitForFunction(
      () => {
        const value =
          document.getElementById("resultsCount")?.textContent ?? "";
        return value.includes("project");
      },
      { timeout: 5000 },
    );

    await page.screenshot({ path: screenshotPath, fullPage: true });

    const statusText =
      (await page.textContent("#pdfExportStatus"))?.trim() ?? "";
    const resultsText = (await page.textContent("#resultsCount"))?.trim() ?? "";

    await writeFile(
      artifactPath,
      `${JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          statusText,
          resultsText,
          screenshot: path.relative(repoRoot, screenshotPath),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(`[verify:export] Status: ${statusText}`);
    console.log(
      `[verify:export] Results count text after failure: ${resultsText}`,
    );
    console.log(
      `[verify:export] Artifact: ${path.relative(repoRoot, artifactPath)}`,
    );
    console.log(
      `[verify:export] Screenshot: ${path.relative(repoRoot, screenshotPath)}`,
    );
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(`[verify:export] FAILED: ${error.message}`);
  process.exit(1);
});
