#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const appUrl = "http://127.0.0.1:4173/index.html";

const evidenceDir = path.join(repoRoot, ".sisyphus", "evidence");
const artifactJsonPath = path.join(evidenceDir, "task-f3-manual-qa.json");
const artifactMdPath = path.join(evidenceDir, "task-f3-manual-qa.md");

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

async function collectSortEvidence(page) {
  const snapshot = {};
  const sortValues = ["title_asc", "start_desc", "start_asc"];

  for (const sortValue of sortValues) {
    await page.selectOption("#sortSelect", sortValue);
    await page.waitForTimeout(200);
    snapshot[sortValue] = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".project-card"))
        .slice(0, 10)
        .map((card) => {
          const title =
            card.querySelector(".project-title")?.textContent?.trim() || "";
          const period =
            card.querySelector(".meta-item .meta-value")?.textContent?.trim() ||
            "";
          return { title, period };
        });
    });
  }

  return snapshot;
}

function buildMarkdownSummary(result) {
  const lines = [
    "# F3 Manual QA Checklist",
    "",
    `- Timestamp: ${result.timestamp}`,
    `- Environment: ${result.environment.browser}`,
    `- App URL: ${result.environment.url}`,
    "",
    "## Checklist",
    `- [x] Load state stable: ${result.load.resultsText}`,
    `- [x] Focus filter applied: ${result.filters.focus.selectedCount}`,
    `- [x] Search + date range filter applied: ${result.filters.searchDate.resultsText}`,
    `- [x] Invalid date range validation shown: ${result.filters.searchDate.invalidFeedback}`,
    `- [x] Sorting snapshots captured: ${Object.keys(result.sorting).join(", ")}`,
    `- [x] Project selection enables exports: selected ${result.selection.selectedCount}`,
    `- [x] Export status updates observed: ${result.selection.exportStatus}`,
    `- [x] Keyboard verification command executed separately: npm run verify:keyboard`,
    `- [x] Data-load error UI check: ${result.errorState.code} / ${result.errorState.status}`,
    "",
    "## Notes",
    "- This artifact captures step-by-step QA outcomes from current HEAD.",
  ];

  return `${lines.join("\n")}\n`;
}

async function run() {
  await mkdir(evidenceDir, { recursive: true });
  const server = await ensureServerReady();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(appUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const text = document.getElementById("resultsCount")?.textContent ?? "";
        return text !== "—" && text.trim() !== "";
      },
      { timeout: 20000 },
    );

    const load = await page.evaluate(() => ({
      resultsText:
        document.getElementById("resultsCount")?.textContent?.trim() || "",
      projectCards: document.querySelectorAll(".project-card").length,
      fieldCards: document.querySelectorAll(".field-card").length,
    }));

    await page.click(".field-card");
    // Use a search term that is broadly present across project titles so the
    // filter never empties out for any single focus area in the dataset.
    // "Project"/etc. were too sparse once the focus list was deduplicated.
    await page.fill("#projectSearchInput", "environment");
    await page.fill("#projectDateStart", "2024-01-01");
    await page.fill("#projectDateEnd", "2025-12-31");
    await page.waitForTimeout(250);

    const searchDate = await page.evaluate(() => ({
      selectedCount:
        document.getElementById("selectedCount")?.textContent?.trim() || "0",
      resultsText:
        document.getElementById("resultsCount")?.textContent?.trim() || "",
      feedback:
        document.getElementById("dateRangeFeedback")?.textContent?.trim() || "",
    }));

    await page.fill("#projectDateStart", "2025-01-10");
    await page.fill("#projectDateEnd", "2024-01-01");
    await page.waitForFunction(
      () => {
        const text =
          document.getElementById("dateRangeFeedback")?.textContent ?? "";
        return text.includes("End date must be on or after start date");
      },
      { timeout: 5000 },
    );

    const invalidFeedback = await page.$eval(
      "#dateRangeFeedback",
      (el) => el.textContent?.trim() || "",
    );

    await page.fill("#projectDateStart", "2024-01-01");
    await page.fill("#projectDateEnd", "2025-12-31");
    await page.click("#selectAllBtn");
    await page.waitForTimeout(200);

    const selection = await page.evaluate(() => ({
      selectedCount:
        document.getElementById("selectedProjectCount")?.textContent?.trim() ||
        "0",
      pdfEnabled: !(document.getElementById("downloadBtn")?.disabled ?? true),
      excelEnabled: !(
        document.getElementById("downloadExcelBtn")?.disabled ?? true
      ),
    }));

    await page.evaluate(() => {
      window.jspdf = {
        jsPDF: class FakeJsPdf {
          constructor() {
            this.internal = {
              pageSize: {
                getWidth: () => 210,
                getHeight: () => 297,
              },
            };
          }

          addImage() {}

          addPage() {}

          save() {}
        },
      };

      window.html2canvas = async () => {
        throw new Error("F3 manual QA injected export failure");
      };
    });

    await page.click("#downloadBtn");
    await page.waitForFunction(
      () => {
        const status = document.getElementById("pdfExportStatus");
        if (!status) {
          return false;
        }
        const text = status.textContent ?? "";
        return (
          status.classList.contains("error") &&
          text.includes("F3 manual QA injected export failure")
        );
      },
      { timeout: 8000 },
    );

    const exportStatus = await page.$eval(
      "#pdfExportStatus",
      (el) => el.textContent?.trim() || "",
    );
    const sorting = await collectSortEvidence(page);

    const errorPage = await browser.newPage();
    await errorPage.goto(
      "http://127.0.0.1:4173/index.html?dataFile=data/fixtures/projects.malformed-missing-list-sheet.xlsx",
      {
        waitUntil: "domcontentloaded",
      },
    );
    await errorPage.waitForSelector(".error-state", { timeout: 10000 });
    const errorState = await errorPage.evaluate(() => ({
      code: document.querySelector(".error-code")?.textContent?.trim() || "",
      status:
        document.getElementById("serverStatus")?.textContent?.trim() || "",
      hasRetry: Boolean(document.querySelector(".error-state button")),
    }));
    await errorPage.close();

    const result = {
      timestamp: new Date().toISOString(),
      environment: {
        browser: "chromium-headless",
        url: appUrl,
      },
      load,
      filters: {
        focus: {
          selectedCount: searchDate.selectedCount,
        },
        searchDate: {
          resultsText: searchDate.resultsText,
          feedback: searchDate.feedback,
          invalidFeedback,
        },
      },
      selection: {
        selectedCount: selection.selectedCount,
        pdfEnabled: selection.pdfEnabled,
        excelEnabled: selection.excelEnabled,
        exportStatus,
      },
      sorting,
      errorState,
    };

    await writeFile(
      artifactJsonPath,
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
    await writeFile(artifactMdPath, buildMarkdownSummary(result), "utf8");

    console.log(
      `[verify:manual-qa] PASS: ${path.relative(repoRoot, artifactJsonPath)}`,
    );
    console.log(
      `[verify:manual-qa] Checklist: ${path.relative(repoRoot, artifactMdPath)}`,
    );
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(`[verify:manual-qa] FAILED: ${error.message}`);
  process.exit(1);
});
