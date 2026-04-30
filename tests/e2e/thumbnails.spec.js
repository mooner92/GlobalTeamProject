const { test, expect } = require("playwright/test");

async function waitForCards(page) {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => document.querySelectorAll(".project-card").length > 0,
  );
}

test("every card has a cover or placeholder", async ({ page }) => {
  await waitForCards(page);

  const result = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".project-card"));
    return cards.every((card) => {
      const cover = card.querySelector(":scope > .project-card-cover");
      if (!cover) return false;
      const img = cover.querySelector(":scope > img.cover-img");
      const placeholder = cover.querySelector(":scope > .cover-placeholder");
      return Boolean(img || placeholder);
    });
  });
  expect(result).toBe(true);
});

test("renders placeholder when no cover URL provided", async ({ page }) => {
  await waitForCards(page);

  const placeholderText = await page.evaluate(() => {
    const card = document.querySelector(".project-card");
    const ph = card?.querySelector(".cover-placeholder");
    return ph?.textContent ?? null;
  });
  expect(placeholderText).not.toBeNull();
  expect(placeholderText).toMatch(/^[\p{L}\p{N}]{1,3}$/u);
});

test("img onerror falls back to placeholder", async ({ page }) => {
  await waitForCards(page);

  const hasImg = await page.evaluate(() =>
    Boolean(document.querySelector(".cover-img")),
  );
  test.skip(!hasImg, "No real cover images in current data");

  await page.evaluate(() => {
    const img = document.querySelector(".cover-img");
    img.src = "data:image/png;base64,broken";
    img.dispatchEvent(new Event("error"));
  });
  await page.waitForFunction(() => {
    const cover = document.querySelector(".project-card-cover");
    return Boolean(cover?.querySelector(".cover-placeholder"));
  });
});
