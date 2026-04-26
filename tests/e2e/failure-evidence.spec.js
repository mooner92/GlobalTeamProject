const { test, expect } = require("playwright/test");

test("intentional failure captures screenshot and trace evidence", async ({
  page,
}) => {
  await page.goto("/index.html", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => {
    const text = document.getElementById("resultsCount")?.textContent ?? "";
    const count = Number.parseInt(text, 10);
    return Number.isFinite(count);
  });

  const rendered = await page.evaluate(() => {
    return Number.parseInt(
      document.getElementById("resultsCount")?.textContent ?? "0",
      10,
    );
  });

  expect(rendered).toBe(-1);
});
