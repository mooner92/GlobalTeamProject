#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const fixtureProjectCount = parsePositiveInt(
  process.env.PERF_EXPORT_PROJECT_COUNT,
  100,
);
const thresholdMs = parsePositiveInt(
  process.env.PERF_EXPORT_THRESHOLD_MS,
  45000,
);

const evidenceDir = path.join(repoRoot, ".sisyphus", "evidence");
const fixturePath = path.join(
  repoRoot,
  "data",
  "fixtures",
  `projects.large-${fixtureProjectCount}.xlsx`,
);
const artifactPath = path.join(evidenceDir, "task-7-performance-export.json");
const downloadPath = path.join(evidenceDir, "task-7-performance-export.pdf");

function parsePositiveInt(rawValue, fallbackValue) {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
}

function buildFixtureWorkbook(projectCount) {
  const rows = [
    [
      "No.",
      "Type",
      "Title",
      "PI",
      "Primary Focus",
      "Secondary Focus",
      "Project Start",
      "Project End",
    ],
  ];
  for (let i = 1; i <= projectCount; i += 1) {
    rows.push([
      i,
      i % 2 === 0 ? "Policy" : "Research",
      `Performance Fixture Project ${String(i).padStart(3, "0")}`,
      `PI ${String(i).padStart(3, "0")}`,
      `Primary Focus ${((i - 1) % 10) + 1}`,
      `Secondary Focus ${((i - 1) % 15) + 1}`,
      `2024-${String(((i - 1) % 12) + 1).padStart(2, "0")}-01`,
      `2025-${String(((i - 1) % 12) + 1).padStart(2, "0")}-28`,
    ]);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "List");
  XLSX.writeFile(workbook, fixturePath);
}

async function ensureServerReady() {
  const healthUrl = "http://127.0.0.1:4173/index.html";
  const existingReady = await canReach(healthUrl);
  if (existingReady) {
    return { process: null };
  }

  const serverProcess = spawn("python3", ["-m", "http.server", "4173"], {
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

async function readPreviousElapsedMs() {
  if (!existsSync(artifactPath)) {
    return null;
  }

  try {
    const raw = await readFile(artifactPath, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed.elapsedMs === "number" ? parsed.elapsedMs : null;
  } catch (_error) {
    return null;
  }
}

async function run() {
  await mkdir(path.dirname(fixturePath), { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  buildFixtureWorkbook(fixtureProjectCount);

  const previousElapsedMs = await readPreviousElapsedMs();
  const server = await ensureServerReady();
  const browser = await chromium.launch({ headless: true });

  let elapsedMs = null;
  let progressText = "";

  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    const dataFileQuery = `data/fixtures/${path.basename(fixturePath)}`;
    const appUrl = `http://127.0.0.1:4173/index.html?dataFile=${encodeURIComponent(dataFileQuery)}`;
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#resultsCount", { timeout: 20000 });
    await page.waitForFunction(
      () => {
        const text = document.getElementById("resultsCount")?.textContent ?? "";
        return text !== "—" && text.trim() !== "";
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

    const startTime = performance.now();
    const downloadPromise = page.waitForEvent("download", {
      timeout: thresholdMs + 15000,
    });
    await page.click("#downloadBtn");
    const download = await downloadPromise;
    elapsedMs = Math.round(performance.now() - startTime);
    await download.saveAs(downloadPath);

    progressText = (await page.textContent("#pdfExportStatus"))?.trim() ?? "";
    await context.close();
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }

  const artifact = {
    timestamp: new Date().toISOString(),
    fixture: {
      path: path.relative(repoRoot, fixturePath),
      projectCount: fixtureProjectCount,
    },
    thresholdMs,
    elapsedMs,
    metThreshold:
      typeof elapsedMs === "number" ? elapsedMs <= thresholdMs : false,
    comparison: {
      baselineMs: thresholdMs,
      previousRunMs: previousElapsedMs,
      deltaVsBaselineMs:
        typeof elapsedMs === "number" ? elapsedMs - thresholdMs : null,
      deltaVsPreviousRunMs:
        typeof elapsedMs === "number" && typeof previousElapsedMs === "number"
          ? elapsedMs - previousElapsedMs
          : null,
    },
    pdf: {
      output: path.relative(repoRoot, downloadPath),
      statusText: progressText,
    },
  };

  await writeFile(
    artifactPath,
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `[perf:export] Fixture: ${path.relative(repoRoot, fixturePath)} (${fixtureProjectCount} projects)`,
  );
  console.log(
    `[perf:export] Elapsed: ${elapsedMs}ms (threshold: ${thresholdMs}ms)`,
  );
  console.log(
    `[perf:export] Artifact: ${path.relative(repoRoot, artifactPath)}`,
  );
  console.log(
    `[perf:export] Download: ${path.relative(repoRoot, downloadPath)}`,
  );

  if (!artifact.metThreshold) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(`[perf:export] FAILED: ${error.message}`);
  process.exit(1);
});
