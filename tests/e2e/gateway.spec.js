const { test, expect } = require("playwright/test");

async function gotoGateway(page) {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      typeof window.__keiGetGatewayState === "function" &&
      window.__keiGetGatewayState().ready === true,
  );
}

test("gateway loads all five sections @smoke", async ({ page }) => {
  await gotoGateway(page);

  for (const section of [
    "hero",
    "areas",
    "featured",
    "destinations",
    "connect",
  ]) {
    const locator = page.locator(`[data-section="${section}"]`);
    await expect(locator).toBeVisible();
  }

  const counts = await page.evaluate(() => window.__keiGetGatewayState());
  expect(counts.areas).toBeGreaterThanOrEqual(5);
  expect(counts.areas).toBeLessThanOrEqual(7);
  expect(counts.featured).toBeGreaterThanOrEqual(8);
  expect(counts.destinations).toBeGreaterThanOrEqual(4);
  expect(counts.destinations).toBeLessThanOrEqual(6);
});

test("hero exposes a single-sentence headline and dual CTA", async ({
  page,
}) => {
  await gotoGateway(page);
  const headline = await page.locator(".gateway-hero-headline").textContent();
  expect(headline).toBeTruthy();
  expect(headline.length).toBeLessThan(240);
  await expect(page.locator(".gateway-cta-primary")).toBeVisible();
  await expect(page.locator(".gateway-cta-secondary")).toBeVisible();
  await expect(page.locator(".gateway-cta-secondary")).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".gateway-cta-secondary")).toHaveAttribute(
    "rel",
    /noopener/,
  );
});

test("featured cards every CTA opens externally with new-tab affordance", async ({
  page,
}) => {
  await gotoGateway(page);
  const ctas = page.locator(".gateway-featured-cta");
  const count = await ctas.count();
  expect(count).toBeGreaterThanOrEqual(8);
  for (let i = 0; i < count; i++) {
    await expect(ctas.nth(i)).toHaveAttribute("target", "_blank");
    await expect(ctas.nth(i)).toHaveAttribute("rel", /noopener/);
    const hint = await ctas.nth(i).locator(".external-tab-hint").count();
    expect(hint).toBeGreaterThan(0);
  }
});

test("destination cards open external KEI sites in new tab", async ({
  page,
}) => {
  await gotoGateway(page);
  const cards = page.locator(".gateway-destination-card");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i)).toHaveAttribute("target", "_blank");
    await expect(cards.nth(i)).toHaveAttribute("rel", /noopener/);
    const href = await cards.nth(i).getAttribute("href");
    expect(href).toMatch(/^https:\/\//);
  }
});

test("nav anchors scroll to sections", async ({ page }) => {
  await gotoGateway(page);

  await page.click('.gateway-nav a[href="#destinations"]');
  await page.waitForFunction(() => {
    const target = document.getElementById("destinations");
    if (!target) return false;
    const rect = target.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  });
  await expect(page.locator("#destinations")).toBeInViewport();
});

test("EN ⇄ KO toggle in footer flips text and lang attribute", async ({
  page,
}) => {
  await gotoGateway(page);

  const headline = page.locator(".gateway-hero-headline");
  const englishText = await headline.textContent();
  expect(englishText).toMatch(/think tank/i);

  await page.click("#langToggle");

  await page.waitForFunction(() => document.documentElement.lang === "ko");
  const koreanText = await headline.textContent();
  expect(koreanText).not.toBe(englishText);
  expect(koreanText).toMatch(/싱크탱크|환경/);

  await page.click("#langToggle");
  await page.waitForFunction(() => document.documentElement.lang === "en");
});

test("footer holds the legacy catalog link", async ({ page }) => {
  await gotoGateway(page);
  const link = page.locator('.gateway-footer-link[href="all-projects.html"]');
  await expect(link).toHaveCount(1);
});

test("destinations carry data-omc-cta tracking attributes", async ({
  page,
}) => {
  await gotoGateway(page);
  const tagged = await page
    .locator(".gateway-destination-card[data-omc-cta]")
    .count();
  expect(tagged).toBeGreaterThan(0);
});
