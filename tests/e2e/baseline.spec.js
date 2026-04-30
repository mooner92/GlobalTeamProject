const { test, expect } = require("playwright/test");

async function waitForAppReady(page) {
  await page.goto("/all-projects.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );
  await page.waitForFunction(() => {
    const countText =
      document.getElementById("resultsCount")?.textContent ?? "";
    const count = Number.parseInt(countText, 10);
    return (
      Number.isFinite(count) &&
      count >= 0 &&
      document.querySelectorAll(".field-card").length > 0
    );
  });
  await waitForRenderedConsistency(page);
}

async function waitForRenderedConsistency(page) {
  await page.waitForFunction(() => {
    const snapshot = window.getFilterStateSnapshot();
    const expected = snapshot.filteredProjects.length;
    const cards = document.querySelectorAll(".project-card").length;
    const rendered = Number.parseInt(
      document.getElementById("resultsCount")?.textContent ?? "",
      10,
    );
    return (
      Number.isFinite(rendered) && cards === expected && rendered === expected
    );
  });
}

async function readCountConsistency(page) {
  return page.evaluate(() => {
    const snapshot = window.getFilterStateSnapshot();
    const expected = snapshot.filteredProjects.length;
    const cards = document.querySelectorAll(".project-card").length;
    const rendered = Number.parseInt(
      document.getElementById("resultsCount")?.textContent ?? "",
      10,
    );
    return {
      expected,
      cards,
      rendered,
      selectedFields: snapshot.selectedFields,
      selectedProjects: Number.parseInt(
        document.getElementById("selectedProjectCount")?.textContent ?? "0",
        10,
      ),
      pdfSelectedProjects: Number.parseInt(
        document.getElementById("selectedProjectCountPDF")?.textContent ?? "0",
        10,
      ),
    };
  });
}

test("load state keeps filtered data, cards, and count in sync @smoke", async ({
  page,
}) => {
  await waitForAppReady(page);
  const state = await readCountConsistency(page);

  expect(state.expected).toBeGreaterThan(0);
  expect(state.cards).toBe(state.expected);
  expect(state.rendered).toBe(state.expected);
});

test("filter selection updates results deterministically @smoke", async ({
  page,
}) => {
  await waitForAppReady(page);
  await page.locator(".field-card").first().click();

  await page.waitForFunction(() => {
    const snapshot = window.getFilterStateSnapshot();
    return (
      snapshot.selectedFields.length > 0 && snapshot.filteredProjects.length > 0
    );
  });
  await waitForRenderedConsistency(page);

  const filterState = await page.evaluate(() => {
    const snapshot = window.getFilterStateSnapshot();
    const selected = new Set(snapshot.selectedFields);
    const allMatched = snapshot.filteredProjects.every((project) => {
      return (
        selected.has(project.primaryFocusKey) ||
        selected.has(project.secondaryFocusKey)
      );
    });
    return {
      selectedCount: snapshot.selectedFields.length,
      filteredCount: snapshot.filteredProjects.length,
      allMatched,
    };
  });

  const counts = await readCountConsistency(page);
  expect(filterState.selectedCount).toBeGreaterThan(0);
  expect(filterState.filteredCount).toBeGreaterThan(0);
  expect(filterState.allMatched).toBeTruthy();
  expect(counts.cards).toBe(counts.expected);
  expect(counts.rendered).toBe(counts.expected);
});

test("project selection enables export controls and updates selection counters @smoke", async ({
  page,
}) => {
  await waitForAppReady(page);
  await page.locator(".project-checkbox").first().check();

  await page.waitForFunction(() => {
    const selected = Number.parseInt(
      document.getElementById("selectedProjectCount")?.textContent ?? "0",
      10,
    );
    return selected > 0;
  });

  const counts = await readCountConsistency(page);
  expect(counts.selectedProjects).toBeGreaterThan(0);
  expect(counts.pdfSelectedProjects).toBe(counts.selectedProjects);

  await expect(page.locator("#downloadBtn")).toBeEnabled();
  await expect(page.locator("#downloadExcelBtn")).toBeEnabled();
});

test("export buttons trigger excel and pdf pipelines", async ({ page }) => {
  await waitForAppReady(page);
  await page.click("#selectAllBtn");

  await page.waitForFunction(() => {
    const selected = Number.parseInt(
      document.getElementById("selectedProjectCount")?.textContent ?? "0",
      10,
    );
    return selected > 0;
  });

  await page.evaluate(() => {
    window.__exportProbe = {
      excelCalls: 0,
      excelFilename: "",
      pdfCalls: 0,
      pdfFilename: "",
    };

    window.XLSX = {
      utils: {
        book_new: () => ({ sheets: [] }),
        aoa_to_sheet: () => ({}),
        book_append_sheet: (workbook, _sheet, sheetName) => {
          workbook.sheets.push(sheetName);
        },
      },
      writeFile: (_workbook, filename) => {
        window.__exportProbe.excelCalls += 1;
        window.__exportProbe.excelFilename = filename;
      },
    };

    window.html2canvas = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 20;
      canvas.height = 20;
      canvas.toDataURL = () =>
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgMc5N0QAAAAASUVORK5CYII=";
      return canvas;
    };

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

        save(filename) {
          window.__exportProbe.pdfCalls += 1;
          window.__exportProbe.pdfFilename = filename;
        }
      },
    };
  });

  await page.click("#downloadExcelBtn");
  await page.click("#downloadBtn");

  await page.waitForFunction(() => {
    return (
      window.__exportProbe.excelCalls === 1 &&
      window.__exportProbe.pdfCalls === 1
    );
  });

  const probe = await page.evaluate(() => window.__exportProbe);
  expect(probe.excelFilename).toContain("KEI_Projects_");
  expect(probe.excelFilename).toContain(".xlsx");
  expect(probe.pdfFilename).toContain("KEI_Projects_");
  expect(probe.pdfFilename).toContain(".pdf");
  await expect(page.locator("#pdfExportStatus")).toContainText(
    "PDF export complete",
  );
});

test("pdf error state surfaces actionable message and recovers controls", async ({
  page,
}) => {
  await waitForAppReady(page);
  await page.click("#selectAllBtn");

  await page.waitForFunction(() => {
    const selected = Number.parseInt(
      document.getElementById("selectedProjectCount")?.textContent ?? "0",
      10,
    );
    return selected > 0;
  });

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
      throw new Error("Injected failure from e2e baseline");
    };
  });

  await page.click("#downloadBtn");

  await page.waitForFunction(() => {
    const status = document.getElementById("pdfExportStatus");
    if (!status) {
      return false;
    }
    return (
      status.classList.contains("error") &&
      (status.textContent ?? "").includes("Injected failure from e2e baseline")
    );
  });

  await expect(page.locator("#downloadBtn")).toBeEnabled();
  await expect(page.locator("#downloadExcelBtn")).toBeEnabled();
});
