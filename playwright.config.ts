import path from "node:path"
import { defineConfig, devices } from "@playwright/test"

// Stories run against docs/ served under the same sub-path GitHub Pages uses, so a root-absolute link fails here too.
const BASE_PATH = "/ui-sdk-elements/"
const PORT = 4377
const CI = !!process.env.CI
// BASE_URL=https://jagreehal.github.io/ui-sdk-elements/ runs the same stories against the live site, with no local server.
const LIVE = process.env.BASE_URL

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  failOnFlakyTests: CI,
  workers: CI ? (process.env.PLAYWRIGHT_WORKERS ?? "50%") : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    [
      "executable-stories-playwright/reporter",
      {
        formats: ["html"],
        outputDir: path.join(import.meta.dirname, "docs/report"),
        html: { title: "ui-sdk-elements · Executable stories", searchable: true }
      }
    ]
  ],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: LIVE ?? `http://localhost:${PORT}${BASE_PATH}`,
    viewport: { width: 1280, height: 800 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000
  },
  expect: { timeout: 7_500 },
  timeout: 60_000,
  webServer: LIVE
    ? undefined
    : {
        command: `pnpm pages && pnpm exec vite preview --outDir docs --port ${PORT} --strictPort --base ${BASE_PATH}`,
        url: `http://localhost:${PORT}${BASE_PATH}`,
        reuseExistingServer: !CI,
        timeout: 120_000
      }
})
