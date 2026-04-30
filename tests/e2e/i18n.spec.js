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

test("default load: html[lang] is en, langToggle aria-pressed is false, header title matches EN dict @smoke", async ({
  page,
}) => {
  await waitForAppReady(page);

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  expect(htmlLang).toBe("en");

  const ariaPressed = await page
    .locator("#langToggle")
    .getAttribute("aria-pressed");
  expect(ariaPressed).toBe("false");

  const headerTitle = await page
    .locator("[data-i18n='header.title']")
    .textContent();
  expect(headerTitle).toContain("Research Project Explorer");
});

test("click langToggle switches to KO: html[lang], brand text, interactionStatus @smoke", async ({
  page,
}) => {
  await waitForAppReady(page);

  await page.locator("#langToggle").click();

  await expect(page.locator("#langToggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  expect(htmlLang).toBe("ko");

  const headerTitle = await page
    .locator("[data-i18n='header.title']")
    .textContent();
  expect(headerTitle).toContain("연구 프로젝트 탐색기");

  // interactionStatus announces in Korean
  await page.waitForFunction(() => {
    const el = document.getElementById("interactionStatus");
    return el && (el.textContent ?? "").length > 0;
  });
  const statusText = await page.locator("#interactionStatus").textContent();
  expect(statusText).toMatch(/한국어/);
});

test("localStorage persistence: reload after toggle stays in KO", async ({
  page,
}) => {
  await waitForAppReady(page);

  await page.locator("#langToggle").click();
  await expect(page.locator("#langToggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Reload without any ?lang= param
  await page.goto("/all-projects.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  expect(htmlLang).toBe("ko");

  const storedLang = await page.evaluate(() =>
    localStorage.getItem("kei.lang"),
  );
  expect(storedLang).toBe("ko");
});

test("URL override ?lang=ko starts in Korean despite empty storage", async ({
  page,
}) => {
  // Clear storage first
  await page.goto("/all-projects.html", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.removeItem("kei.lang"));

  await page.goto("/all-projects.html?lang=ko", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  expect(htmlLang).toBe("ko");

  const ariaPressed = await page
    .locator("#langToggle")
    .getAttribute("aria-pressed");
  expect(ariaPressed).toBe("true");
});

test("URL override ?lang=en overrides stored ko", async ({ page }) => {
  // Store ko first
  await page.goto("/all-projects.html", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("kei.lang", "ko"));

  await page.goto("/all-projects.html?lang=en", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );

  const htmlLang = await page.evaluate(() => document.documentElement.lang);
  expect(htmlLang).toBe("en");

  const ariaPressed = await page
    .locator("#langToggle")
    .getAttribute("aria-pressed");
  expect(ariaPressed).toBe("false");
});

test("a11y: langToggle has non-empty aria-label; interactionStatus is a live region", async ({
  page,
}) => {
  await waitForAppReady(page);

  const ariaLabel = await page
    .locator("#langToggle")
    .getAttribute("aria-label");
  expect(ariaLabel).toBeTruthy();
  expect(ariaLabel.trim().length).toBeGreaterThan(0);

  const ariaLive = await page
    .locator("#interactionStatus")
    .getAttribute("aria-live");
  expect(ariaLive).toBeTruthy();
});

test("sort dropdown options change text when language is toggled", async ({
  page,
}) => {
  await waitForAppReady(page);

  const enOptions = await page.locator("#sortSelect option").allTextContents();
  expect(enOptions.some((t) => t.includes("Default Order"))).toBe(true);

  await page.locator("#langToggle").click();
  await expect(page.locator("#langToggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // After language change, re-render fires; wait for consistency
  await waitForRenderedConsistency(page);

  const koOptions = await page.locator("#sortSelect option").allTextContents();
  expect(koOptions.some((t) => t.includes("기본 순서"))).toBe(true);
  // English option should no longer be present
  expect(koOptions.some((t) => t.includes("Default Order"))).toBe(false);
});
