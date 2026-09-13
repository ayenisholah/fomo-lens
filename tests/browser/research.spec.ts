import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { exampleData } from "../../src/lib/examples";
import type { ResearchRequest } from "../../src/lib/research-contract";

async function signin(page: Page) {
  await page.goto("/signin");
  await page
    .getByLabel("Email address")
    .fill(`research-${crypto.randomUUID()}@example.com`);
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/request"),
  );
  await page.getByRole("button", { name: "Send verification code" }).click();
  const json = await (await response).json();
  expect(json.ok).toBe(true);
  const mail = JSON.parse(
    await readFile(`test-results/mail/${json.data.challengeId}.json`, "utf8"),
  );
  await page.getByLabel("Verification code").fill(mail.code);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}

async function nav(page: Page, mobile: boolean, name: string) {
  if (mobile)
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("navigation", { name: "Workspace" })
    .getByRole("button", { name, exact: false })
    .click();
}

test("every research action, pagination, history, comparison and shared selections", async ({
  page,
  isMobile,
}) => {
  await signin(page);
  await page.reload();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  const requests: ResearchRequest[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/research"))
      requests.push(r.postDataJSON());
  });
  async function action(name: string) {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/research") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name, exact: true }).click();
    expect((await response).ok()).toBe(true);
    await expect(page.locator(".app-shell")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  }
  await page.getByLabel("Trader handle").focus();
  await expect(page.getByLabel("Trader handle")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Explore profile" }),
  ).toBeFocused();
  await action("Explore profile →");
  await action("Load PnL");
  await action("Expand following");
  await action("Load next connections page");
  await action("Load followers");
  if (isMobile)
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await action("Resolve wallets");
  await page
    .getByLabel("Reverse wallet lookup")
    .fill("11111111111111111111111111111111");
  await action("Find identity");
  await page.getByRole("button", { name: "Add to comparison" }).click();
  if (isMobile)
    await page.getByRole("tab", { name: "Performance", exact: true }).click();
  await action("Load aggregate coverage");
  await nav(page, isMobile, "Leaderboard");
  await page.getByLabel("Window", { exact: true }).selectOption("30d");
  await action("Load leaderboard");
  await action("Load next page");
  expect(new Set(requests.map((r) => r.kind))).toEqual(
    new Set([
      "profile",
      "pnl",
      "following",
      "followers",
      "wallets",
      "reverse",
      "coverage",
      "leaderboard",
    ]),
  );
  expect(requests.filter((r) => r.cursor).map((r) => r.kind)).toEqual([
    "following",
    "leaderboard",
  ]);
  await nav(page, isMobile, "Compare");
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toBeVisible();
  await nav(page, isMobile, "History");
  const count = requests.length;
  await page.locator(".history button").first().click();
  expect(requests).toHaveLength(count);
  await page.goto(
    "/app?subject=solstice&window=30d&compare=solstice,mint_condition",
  );
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByLabel("Trader handle")).toHaveValue("solstice");
  await nav(page, isMobile, "Compare");
  await expect(
    page.getByRole("button", { name: "Remove", exact: true }),
  ).toHaveCount(2);
  expect(requests).toHaveLength(count);
});

test("lost responses retain identity, failed recovery releases controls, refresh failures are nonfatal", async ({
  page,
}) => {
  await signin(page);
  let latest: ResearchRequest;
  let lose = false;
  await page.route("**/api/research", async (route) => {
    latest = route.request().postDataJSON();
    if (lose) return route.abort("failed");
    await route.fulfill({
      json: {
        ok: true,
        mode: "stored",
        data: {
          data: exampleData(latest),
          operation: { id: latest.id, status: "complete" },
        },
      },
    });
  });
  await page.getByRole("button", { name: "Explore profile" }).click();
  await expect(
    page.getByRole("button", { name: "Explicit recovery" }),
  ).toBeVisible();
  lose = true;
  await page.getByRole("button", { name: "Load PnL", exact: true }).click();
  await expect(page.getByText(/Operation .*uncertain/)).toBeVisible();
  let failRecovery = true;
  await page.route("**/api/research/*/recover", async (route) => {
    expect(route.request().url()).toContain(latest.id);
    await route.fulfill(
      failRecovery
        ? {
            status: 503,
            json: {
              ok: false,
              error: { message: "Controlled recovery failure" },
            },
          }
        : {
            json: {
              ok: true,
              mode: "stored",
              data: {
                data: exampleData(latest),
                operation: { id: latest.id, status: "complete" },
              },
            },
          },
    );
  });
  await page.getByRole("button", { name: "Explicit recovery" }).click();
  await expect(
    page.getByText("Controlled recovery failure", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load PnL", exact: true }),
  ).toBeEnabled();
  failRecovery = false;
  await page.route("**/api/history", (route) =>
    route.fulfill({ status: 503, json: { ok: false } }),
  );
  await page.getByRole("button", { name: "Explicit recovery" }).click();
  await expect(page.getByText(/Results retained\. History/)).toBeVisible();
  lose = false;
  await page.getByRole("button", { name: "Load PnL", exact: true }).click();
  await expect(page.getByText(/Operation .*complete/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load PnL", exact: true }),
  ).toBeEnabled();
});

test("selection changes during a delayed result and provider failures allow subsequent requests", async ({
  page,
}) => {
  await signin(page);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route("**/api/research", async (route) => {
    const request: ResearchRequest = route.request().postDataJSON();
    calls++;
    if (calls === 1) await delayed;
    if (calls === 2) {
      return route.fulfill({
        status: 402,
        json: {
          ok: false,
          error: {
            code: "credits",
            message:
              "Research is temporarily unavailable due to provider limits. Try again later.",
          },
        },
      });
    }
    await route.fulfill({
      json: {
        ok: true,
        mode: "stored",
        data: {
          data: exampleData(request),
          operation: { id: request.id, status: "complete" },
        },
      },
    });
  });
  await page.getByRole("button", { name: "Explore profile" }).click();
  await expect.poll(() => calls).toBe(1);
  await page.getByLabel("Trader handle").fill("solstice");
  release();
  await expect(
    page.getByRole("button", { name: "Explore profile" }),
  ).toBeEnabled();
  await expect(page.getByLabel("Trader handle")).toHaveValue("solstice");
  await page.getByRole("button", { name: "Explore profile" }).click();
  await expect(
    page.getByText(
      "Research is temporarily unavailable due to provider limits. Try again later.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore profile" }).click();
  await expect(page.getByText(/Operation .*complete/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore profile" }),
  ).toBeEnabled();
  expect(calls).toBe(3);
});
