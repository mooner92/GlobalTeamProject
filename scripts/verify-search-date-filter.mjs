#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const APP_URL = "http://127.0.0.1:4173/index.html";
const evidenceDir = path.join(repoRoot, ".sisyphus", "evidence");
const happyScreenshotPath = path.join(
  evidenceDir,
  "task-9-search-date-filter.png",
);
const invalidScreenshotPath = path.join(
  evidenceDir,
  "task-9-search-date-filter-error.png",
);
const artifactPath = path.join(evidenceDir, "task-9-search-date-filter.json");

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
  const existingReady = await canReach(APP_URL);
  if (existingReady) {
    return { process: null };
  }

  const serverProcess = spawn("python3", ["-m", "http.server", "4173"], {
    cwd: repoRoot,
    stdio: "ignore",
  });

  const ready = await waitForReachable(APP_URL, 12000);
  if (!ready) {
    serverProcess.kill("SIGTERM");
    throw new Error(
      "Failed to start local static server on http://127.0.0.1:4173",
    );
  }

  return { process: serverProcess };
}

function toIsoDateFromTimestamp(timestamp, dayOffset = 0) {
  const date = new Date(timestamp + dayOffset * 86400000);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function waitForResultsConsistency(page) {
  await page.waitForFunction(
    () => {
      const expectedCount =
        window.getFilterStateSnapshot().filteredProjects.length;
      const cardsCount = document.querySelectorAll(".project-card").length;
      const resultsText =
        document.getElementById("resultsCount")?.textContent ?? "";
      const displayedCount = Number.parseInt(resultsText, 10);
      return (
        Number.isFinite(displayedCount) &&
        displayedCount === expectedCount &&
        cardsCount === expectedCount
      );
    },
    { timeout: 10000 },
  );
}

async function run() {
  await mkdir(evidenceDir, { recursive: true });
  const server = await ensureServerReady();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => {
        const value =
          document.getElementById("resultsCount")?.textContent ?? "";
        return value !== "—" && value.trim() !== "";
      },
      { timeout: 20000 },
    );

    await page.waitForSelector(".field-card", { timeout: 10000 });
    await page.click(".field-card");

    const candidate = await page.evaluate(() => {
      const state = window.getFilterStateSnapshot();
      const filtered = state.filteredProjects;
      const selected = state.selectedFields;
      const focusSet = new Set(selected);
      const focusedProjects = filtered.filter((project) => {
        return (
          focusSet.has(project.primaryFocusKey) ||
          focusSet.has(project.secondaryFocusKey)
        );
      });

      const withDate = focusedProjects.filter((project) => {
        return (
          Number.isFinite(project.projectStartTimestamp) ||
          Number.isFinite(project.projectEndTimestamp)
        );
      });

      const target = withDate[0] || focusedProjects[0] || filtered[0] || null;
      if (!target) {
        return null;
      }

      const sourceText = (target.pi || target.title || "").trim();
      const token =
        sourceText.split(/\s+/).find((part) => part && part.length >= 2) ||
        (target.title || "").trim().slice(0, 2) ||
        "";

      const startTimestamp = Number.isFinite(target.projectStartTimestamp)
        ? target.projectStartTimestamp
        : target.projectEndTimestamp;
      const endTimestamp = Number.isFinite(target.projectEndTimestamp)
        ? target.projectEndTimestamp
        : target.projectStartTimestamp;

      return {
        keyword: token,
        title: target.title || "",
        startTimestamp,
        endTimestamp,
      };
    });

    if (
      !candidate ||
      !candidate.keyword ||
      !Number.isFinite(candidate.startTimestamp) ||
      !Number.isFinite(candidate.endTimestamp)
    ) {
      throw new Error(
        "Could not identify a valid project candidate for search/date verification.",
      );
    }

    const filterStartIso = toIsoDateFromTimestamp(candidate.startTimestamp, -1);
    const filterEndIso = toIsoDateFromTimestamp(candidate.endTimestamp, 1);

    await page.fill("#projectSearchInput", candidate.keyword);
    await page.fill("#projectDateStart", filterStartIso);
    await page.fill("#projectDateEnd", filterEndIso);

    await waitForResultsConsistency(page);

    const happyState = await page.evaluate(() => {
      const state = window.getFilterStateSnapshot();
      const filtered = state.filteredProjects;
      const selected = state.selectedFields;
      const search = state.searchQuery;
      const dateRange = state.appliedDateRange;
      const focusSet = new Set(selected);

      const allMatch = filtered.every((project) => {
        const matchesFocus =
          selected.length === 0 ||
          focusSet.has(project.primaryFocusKey) ||
          focusSet.has(project.secondaryFocusKey);
        if (!matchesFocus) {
          return false;
        }

        const title = (project.title || "").toLowerCase();
        const pi = (project.pi || "").toLowerCase();
        const matchesSearch =
          !search || title.includes(search) || pi.includes(search);
        if (!matchesSearch) {
          return false;
        }

        const hasStart = Number.isFinite(project.projectStartTimestamp);
        const hasEnd = Number.isFinite(project.projectEndTimestamp);
        if (
          (dateRange.startTimestamp !== null ||
            dateRange.endTimestamp !== null) &&
          !hasStart &&
          !hasEnd
        ) {
          return false;
        }

        const effectiveStart = hasStart
          ? project.projectStartTimestamp
          : project.projectEndTimestamp;
        const effectiveEnd = hasEnd
          ? project.projectEndTimestamp
          : project.projectStartTimestamp;
        if (
          dateRange.startTimestamp !== null &&
          effectiveEnd < dateRange.startTimestamp
        ) {
          return false;
        }
        if (
          dateRange.endTimestamp !== null &&
          effectiveStart > dateRange.endTimestamp
        ) {
          return false;
        }

        return true;
      });

      const cardsCount = document.querySelectorAll(".project-card").length;
      const resultsText =
        document.getElementById("resultsCount")?.textContent ?? "";
      const displayedCount = Number.parseInt(resultsText, 10);
      const feedbackText = (
        document.getElementById("dateRangeFeedback")?.textContent ?? ""
      ).trim();

      return {
        expectedCount: filtered.length,
        cardsCount,
        displayedCount,
        allMatch,
        feedbackText,
        selectedFocusCount: selected.length,
        searchQuery: search,
      };
    });

    if (!happyState.allMatch) {
      throw new Error(
        "Combined filters returned projects that do not satisfy active criteria.",
      );
    }
    if (
      happyState.displayedCount !== happyState.expectedCount ||
      happyState.cardsCount !== happyState.expectedCount
    ) {
      throw new Error(
        "Results count, filtered data, and rendered cards are inconsistent after happy-path filtering.",
      );
    }
    if (happyState.expectedCount === 0) {
      throw new Error(
        "Happy-path filter scenario produced zero results; expected at least one matching project.",
      );
    }
    if (happyState.feedbackText) {
      throw new Error(
        `Unexpected date range feedback during happy path: ${happyState.feedbackText}`,
      );
    }

    await page.screenshot({ path: happyScreenshotPath, fullPage: true });

    const stableCountBeforeInvalid = happyState.expectedCount;
    const invalidStartIso = toIsoDateFromTimestamp(candidate.startTimestamp, 0);
    const invalidEndIso = toIsoDateFromTimestamp(candidate.startTimestamp, -2);

    await page.fill("#projectDateStart", invalidStartIso);
    await page.fill("#projectDateEnd", invalidEndIso);

    await page.waitForFunction(
      () => {
        const text = (
          document.getElementById("dateRangeFeedback")?.textContent ?? ""
        ).trim();
        return text.includes("End date must be on or after start date");
      },
      { timeout: 5000 },
    );

    const invalidState = await page.evaluate(() => {
      const filteredCount =
        window.getFilterStateSnapshot().filteredProjects.length;
      const cardsCount = document.querySelectorAll(".project-card").length;
      const resultsText =
        document.getElementById("resultsCount")?.textContent ?? "";
      const displayedCount = Number.parseInt(resultsText, 10);
      const feedbackText = (
        document.getElementById("dateRangeFeedback")?.textContent ?? ""
      ).trim();
      return {
        filteredCount,
        cardsCount,
        displayedCount,
        feedbackText,
      };
    });

    if (invalidState.filteredCount !== stableCountBeforeInvalid) {
      throw new Error(
        "Invalid date range changed filtered project count; expected previous valid results to remain.",
      );
    }
    if (
      invalidState.cardsCount !== stableCountBeforeInvalid ||
      invalidState.displayedCount !== stableCountBeforeInvalid
    ) {
      throw new Error(
        "Rendered cards or displayed count changed after invalid date range input.",
      );
    }

    await page.screenshot({ path: invalidScreenshotPath, fullPage: true });

    await writeFile(
      artifactPath,
      `${JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          candidateTitle: candidate.title,
          candidateKeyword: candidate.keyword,
          happyPath: {
            expectedCount: happyState.expectedCount,
            cardsCount: happyState.cardsCount,
            displayedCount: happyState.displayedCount,
            selectedFocusCount: happyState.selectedFocusCount,
            searchQuery: happyState.searchQuery,
            screenshot: path.relative(repoRoot, happyScreenshotPath),
          },
          invalidRange: {
            filteredCount: invalidState.filteredCount,
            cardsCount: invalidState.cardsCount,
            displayedCount: invalidState.displayedCount,
            feedbackText: invalidState.feedbackText,
            screenshot: path.relative(repoRoot, invalidScreenshotPath),
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(
      `[verify:search-date] PASS: combined focus/search/date filtering and invalid range handling verified.`,
    );
    console.log(
      `[verify:search-date] Happy-path screenshot: ${path.relative(repoRoot, happyScreenshotPath)}`,
    );
    console.log(
      `[verify:search-date] Invalid-range screenshot: ${path.relative(repoRoot, invalidScreenshotPath)}`,
    );
    console.log(
      `[verify:search-date] Artifact: ${path.relative(repoRoot, artifactPath)}`,
    );
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(`[verify:search-date] FAILED: ${error.message}`);
  process.exit(1);
});
