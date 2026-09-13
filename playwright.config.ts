import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";
const databaseURL = process.env.TEST_BROWSER_DATABASE_URL;
if (
  !databaseURL ||
  !new URL(databaseURL).pathname.startsWith("/fomo_lens_test_browser")
)
  throw new Error(
    "Set TEST_BROWSER_DATABASE_URL to an isolated browser database",
  );
const baseURL = "http://127.0.0.1:3100";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  globalTimeout: 900000,
  expect: { timeout: 20000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  webServer: {
    command: "npx next dev --webpack --hostname 127.0.0.1 --port 3100",
    url: baseURL + "/example",
    reuseExistingServer: false,
    timeout: 240000,
    env: {
      APP_URL: baseURL,
      DATABASE_URL: databaseURL,
      FOMOLENS_MODE: "example",
      FOMOLENS_KEY: "",
      RESEND_API_KEY: "",
      AUTH_SECRET: "browser-auth-secret-".repeat(3),
      IP_HASH_SECRET: "browser-ip-secret-".repeat(3),
      CURSOR_SECRET: "browser-cursor-secret-".repeat(3),
      DEV_EMAIL_SIMULATION: "true",
      TEST_MAIL_DIR: resolve("test-results/mail"),
      TRUST_PROXY: "false",
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
