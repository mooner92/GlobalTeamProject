const { test, expect } = require("playwright/test");

async function waitForAppReady(page) {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
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

test("renders project cards with new optional contract fields", async ({
  page,
}) => {
  await waitForAppReady(page);

  const cardCount = await page.locator(".project-card").count();
  expect(cardCount).toBeGreaterThan(0);

  // Parse the xlsx using the contract already loaded on the page to get the
  // full project objects (getFilterStateSnapshot returns a stripped DTO).
  const project = await page.evaluate(async () => {
    const response = await fetch("/data/projects.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    const parsed = window.KEIDataContract.parseWorkbookFromArrayBuffer(
      arrayBuffer,
      window.XLSX,
      { sheetName: "List" },
    );
    return parsed.projects[0];
  });

  expect(project).toHaveProperty("doi");
  expect(project).toHaveProperty("isbn");
  expect(project).toHaveProperty("issn");
  expect(project).toHaveProperty("authors");
  expect(project).toHaveProperty("publishedDate");
  expect(project).toHaveProperty("abstract");
  expect(project).toHaveProperty("source");
  expect(project).toHaveProperty("coverUrl");
  expect(project).toHaveProperty("elibUrl");
});

test("page renders without errors when new columns are empty", async ({
  page,
}) => {
  await waitForAppReady(page);

  const cardCount = await page.locator(".project-card").count();
  expect(cardCount).toBeGreaterThan(0);
});
