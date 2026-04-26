const { defineConfig } = require("playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: ".sisyphus/evidence/task-10-playwright-report.json" },
    ],
  ],
  outputDir: ".sisyphus/evidence/playwright-artifacts",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
  ],
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: true,
    timeout: 15000,
  },
});
