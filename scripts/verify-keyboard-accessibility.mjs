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
const happyArtifactPath = path.join(
  evidenceDir,
  "task-8-accessibility-keyboard.json",
);
const focusTrapArtifactPath = path.join(
  evidenceDir,
  "task-8-accessibility-keyboard-error.json",
);

const APP_URL = "http://127.0.0.1:4173/all-projects.html";

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

  const serverProcess = spawn(process.execPath, ["scripts/serve.mjs", "4173"], {
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

async function getActiveDescriptor(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (
      !element ||
      element === document.body ||
      element === document.documentElement
    ) {
      return "none";
    }

    const id = element.id ? `#${element.id}` : "";
    const role = element.getAttribute("role")
      ? `[role=${element.getAttribute("role")}]`
      : "";
    const cls =
      element.className && typeof element.className === "string"
        ? `.${element.className.split(/\s+/).filter(Boolean).join(".")}`
        : "";
    const label =
      element.getAttribute("aria-label") || element.textContent?.trim() || "";
    const shortLabel = label.slice(0, 40);
    return `${element.tagName.toLowerCase()}${id}${role}${cls}:${shortLabel}`;
  });
}

async function tabUntil(page, predicate, maxTabs, direction = "forward") {
  const key = direction === "backward" ? "Shift+Tab" : "Tab";
  for (let i = 0; i < maxTabs; i += 1) {
    await page.keyboard.press(key);
    const matched = await predicate();
    if (matched) {
      return true;
    }
  }
  return false;
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

    const reachedFieldCard = await tabUntil(
      page,
      () =>
        page.evaluate(
          () =>
            document.activeElement?.classList?.contains("field-card") ?? false,
        ),
      30,
    );
    if (!reachedFieldCard) {
      throw new Error(
        "Could not reach a research focus card using keyboard Tab navigation.",
      );
    }

    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => {
        const selectedCount =
          document.getElementById("selectedCount")?.textContent ?? "0";
        return Number.parseInt(selectedCount, 10) > 0;
      },
      { timeout: 5000 },
    );

    const reachedProjectCheckbox = await tabUntil(
      page,
      () =>
        page.evaluate(
          () =>
            document.activeElement?.classList?.contains("project-checkbox") ??
            false,
        ),
      120,
    );
    if (!reachedProjectCheckbox) {
      throw new Error(
        "Could not reach a project checkbox using keyboard Tab navigation.",
      );
    }

    await page.keyboard.press("Space");
    await page.waitForFunction(
      () => {
        const selectedCount =
          document.getElementById("selectedProjectCount")?.textContent ?? "0";
        return Number.parseInt(selectedCount, 10) > 0;
      },
      { timeout: 5000 },
    );

    const reachedPdfButton = await tabUntil(
      page,
      () => page.evaluate(() => document.activeElement?.id === "downloadBtn"),
      60,
      "backward",
    );
    if (!reachedPdfButton) {
      throw new Error(
        "Could not reach the PDF export button using keyboard Tab navigation.",
      );
    }

    const activeOnPdf = await getActiveDescriptor(page);
    await page.keyboard.press("Shift+Tab");
    const shiftedBackDescriptor = await getActiveDescriptor(page);

    await page.keyboard.press("Tab");
    const selectedFieldButtonPressed = await page.evaluate(() => {
      const selectedFieldButton = document.querySelector(
        ".field-card[aria-pressed='true']",
      );
      return Boolean(selectedFieldButton);
    });

    const selectedProjectCount = await page.evaluate(() => {
      return Number.parseInt(
        document.getElementById("selectedProjectCount")?.textContent ?? "0",
        10,
      );
    });

    const downloadButtonsEnabled = await page.evaluate(() => {
      const pdfBtn = document.getElementById("downloadBtn");
      const excelBtn = document.getElementById("downloadExcelBtn");
      return Boolean(
        pdfBtn && excelBtn && !pdfBtn.disabled && !excelBtn.disabled,
      );
    });

    await writeFile(
      happyArtifactPath,
      `${JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          keyboardFieldSelection: selectedFieldButtonPressed,
          keyboardProjectSelectionCount: selectedProjectCount,
          primaryDownloadControlsEnabled: downloadButtonsEnabled,
          reachedPdfButton: activeOnPdf,
          shiftTabReturnedTo: shiftedBackDescriptor,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await page.keyboard.press("Home");
    const firstInteractiveAfterTab = await (async () => {
      await page.keyboard.press("Tab");
      return getActiveDescriptor(page);
    })();

    const cycle = [];
    let returnedToStart = false;

    // Budget must exceed total tabbable count: header + facet chips +
    // toolbar + (per-project: title button + checkbox) for the full dataset.
    for (let i = 0; i < 1500; i += 1) {
      await page.keyboard.press("Tab");
      const descriptor = await getActiveDescriptor(page);
      cycle.push(descriptor);
      if (descriptor === "none") {
        throw new Error(
          "Focus moved to non-interactive root element during Tab cycle.",
        );
      }
      if (descriptor === firstInteractiveAfterTab && i > 5) {
        returnedToStart = true;
        break;
      }
    }

    await writeFile(
      focusTrapArtifactPath,
      `${JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          firstInteractiveAfterTab,
          returnedToStart,
          sampledFocusOrder: cycle.slice(0, 30),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    if (!returnedToStart) {
      throw new Error(
        "Focus cycle did not return to the first interactive control.",
      );
    }

    console.log(
      `[verify:keyboard] PASS: field cards, project selection, and primary controls are keyboard operable.`,
    );
    console.log(
      `[verify:keyboard] Happy path artifact: ${path.relative(repoRoot, happyArtifactPath)}`,
    );
    console.log(
      `[verify:keyboard] Focus-cycle artifact: ${path.relative(repoRoot, focusTrapArtifactPath)}`,
    );
  } finally {
    await browser.close();
    if (server.process) {
      server.process.kill("SIGTERM");
    }
  }
}

run().catch((error) => {
  console.error(`[verify:keyboard] FAILED: ${error.message}`);
  process.exit(1);
});
