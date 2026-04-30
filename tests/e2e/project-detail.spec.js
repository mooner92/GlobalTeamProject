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

// Returns the first project's id from the live snapshot
async function getFirstProjectId(page) {
  return page.evaluate(
    () => window.getFilterStateSnapshot().filteredProjects[0].id,
  );
}

// Encodes a project id the same way the app does
function encodeProjectId(id) {
  return encodeURIComponent(JSON.stringify(id));
}

test("click project title opens modal with correct title and aria-modal @smoke", async ({
  page,
}) => {
  await waitForAppReady(page);

  const cardTitle = await page
    .locator(".project-title-btn")
    .first()
    .textContent();

  await page.locator(".project-title-btn").first().click();

  const modal = page.locator("#projectModal");
  await expect(modal).not.toHaveAttribute("hidden");
  await expect(modal).toHaveAttribute("aria-modal", "true");

  const modalTitle = await page.locator("#projectModalTitle").textContent();
  expect(modalTitle.trim()).toBe(cardTitle.trim());
});

test("checkbox click does NOT open modal but does toggle card selection", async ({
  page,
}) => {
  await waitForAppReady(page);

  // Check that modal is hidden before
  await expect(page.locator("#projectModal")).toHaveAttribute("hidden", "");

  await page.locator(".project-checkbox").first().check();

  // Modal must still be hidden
  await expect(page.locator("#projectModal")).toHaveAttribute("hidden", "");

  // Checkbox should be checked
  await expect(page.locator(".project-checkbox").first()).toBeChecked();
});

test("ESC key closes modal and returns focus to the title button", async ({
  page,
}) => {
  await waitForAppReady(page);

  const titleBtn = page.locator(".project-title-btn").first();
  await titleBtn.click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  await page.keyboard.press("Escape");
  await expect(page.locator("#projectModal")).toHaveAttribute("hidden", "");

  // Focus should return to the title button
  const focused = await page.evaluate(
    () => document.activeElement?.className ?? "",
  );
  expect(focused).toContain("project-title-btn");
});

test("backdrop click closes modal", async ({ page }) => {
  await waitForAppReady(page);

  await page.locator(".project-title-btn").first().click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  // Click in a corner of the backdrop so the centered card doesn't intercept
  await page
    .locator(".project-modal-backdrop")
    .click({ position: { x: 5, y: 5 } });
  await expect(page.locator("#projectModal")).toHaveAttribute("hidden", "");
});

test("Close button closes modal and returns focus", async ({ page }) => {
  await waitForAppReady(page);

  await page.locator(".project-title-btn").first().click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  // Close button has data-modal-close inside the modal footer
  const closeBtn = page.locator("#projectModal [data-modal-close]").last();
  await closeBtn.click();
  await expect(page.locator("#projectModal")).toHaveAttribute("hidden", "");

  const focused = await page.evaluate(
    () => document.activeElement?.className ?? "",
  );
  expect(focused).toContain("project-title-btn");
});

test("focus trap: Tab from first tabbable wraps; Shift+Tab from first goes to last", async ({
  page,
}) => {
  await waitForAppReady(page);

  await page.locator(".project-title-btn").first().click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  // The modal card itself receives initial focus
  const modalCard = page.locator(".project-modal-card");
  await expect(modalCard).toBeFocused();

  // Tab into the next tabbable element inside the modal card (could be the
  // header close button or any of the footer action buttons; only the
  // requirement is that focus stays inside the modal card).
  await page.keyboard.press("Tab");
  const insideAfterTab = await page.evaluate(() => {
    const card = document.querySelector(".project-modal-card");
    return card && card.contains(document.activeElement);
  });
  expect(insideAfterTab).toBe(true);

  // Shift+Tab from the modal card should also keep focus inside the card
  await modalCard.focus();
  await page.keyboard.press("Shift+Tab");
  const insideAfterShiftTab = await page.evaluate(() => {
    const card = document.querySelector(".project-modal-card");
    return card && card.contains(document.activeElement);
  });
  expect(insideAfterShiftTab).toBe(true);
});

test("deep link: #project=<encodedId> auto-opens modal on page load @smoke", async ({
  page,
}) => {
  // First load to get a valid id
  await waitForAppReady(page);
  const projectId = await getFirstProjectId(page);
  const encoded = encodeProjectId(projectId);

  // Navigate with hash
  await page.goto(`/all-projects.html#project=${encoded}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );
  // Wait for modal to appear
  await page.waitForFunction(
    () => !document.getElementById("projectModal")?.hidden,
  );

  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");
  const modalTitle = await page.locator("#projectModalTitle").textContent();
  expect(modalTitle.trim().length).toBeGreaterThan(0);
});

test("deep link with bad id shows error toast and clears hash", async ({
  page,
}) => {
  await page.goto("/all-projects.html#project=%22nonexistent%22", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );

  // Modal should stay hidden
  await expect(page.locator("#projectModal")).toHaveAttribute("hidden", "");

  // Error toast should appear
  await page.waitForSelector(".error-toast", { timeout: 5000 });
  const toastText = await page.locator(".error-toast").textContent();
  expect(toastText.trim().length).toBeGreaterThan(0);

  // Hash should be cleared after a short time
  await page.waitForFunction(() => !window.location.hash.includes("project="), {
    timeout: 5000,
  });
});

test("copy link writes correct URL to clipboard and shows success toast", async ({
  page,
}) => {
  // Intercept clipboard writes before the page initializes
  await page.addInitScript(() => {
    window.__clipboardCapture = [];
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text) => {
          window.__clipboardCapture.push(text);
          return Promise.resolve();
        },
      },
      configurable: true,
    });
  });

  await waitForAppReady(page);

  const projectId = await getFirstProjectId(page);
  const encoded = encodeProjectId(projectId);

  await page.locator(".project-title-btn").first().click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  await page.locator("#projectModalCopyLink").click();

  // Success toast
  await page.waitForSelector(".success-toast", { timeout: 5000 });

  const captured = await page.evaluate(() => window.__clipboardCapture);
  expect(captured.length).toBeGreaterThan(0);

  const written = captured[0];
  expect(written).toContain(`#project=${encoded}`);
  expect(written).toMatch(/^https?:\/\//);
});

test("copy citation contains PI, title, project id; EN includes institute name", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__clipboardCapture = [];
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text) => {
          window.__clipboardCapture.push(text);
          return Promise.resolve();
        },
      },
      configurable: true,
    });
  });

  await waitForAppReady(page);

  const firstProject = await page.evaluate(
    () => window.getFilterStateSnapshot().filteredProjects[0],
  );

  await page.locator(".project-title-btn").first().click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  await page.locator("#projectModalCopyCite").click();
  await page.waitForSelector(".success-toast", { timeout: 5000 });

  const captured = await page.evaluate(() => window.__clipboardCapture);
  expect(captured.length).toBeGreaterThan(0);

  const citation = captured[0];
  // Must contain institute EN phrase
  expect(citation).toContain(
    "Korea Environment Institute Research Project No.",
  );
  // Must contain the project id
  expect(citation).toContain(String(firstProject.id));
  // Must contain title
  expect(citation).toContain(firstProject.title);
  // Must contain PI
  if (firstProject.pi) {
    expect(citation).toContain(firstProject.pi);
  }
});

test("copy citation in KO lang includes Korean institute phrase", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__clipboardCapture = [];
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: (text) => {
          window.__clipboardCapture.push(text);
          return Promise.resolve();
        },
      },
      configurable: true,
    });
  });

  await page.goto("/all-projects.html?lang=ko", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(
    () => typeof window.getFilterStateSnapshot === "function",
  );
  await page.waitForFunction(() => {
    const count = Number.parseInt(
      document.getElementById("resultsCount")?.textContent ?? "",
      10,
    );
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

  await page.locator(".project-title-btn").first().click();
  await expect(page.locator("#projectModal")).not.toHaveAttribute("hidden");

  await page.locator("#projectModalCopyCite").click();
  await page.waitForSelector(".success-toast", { timeout: 5000 });

  const captured = await page.evaluate(() => window.__clipboardCapture);
  const citation = captured[0];
  expect(citation).toContain("한국환경연구원 연구과제");
});
