import { test, expect } from "@playwright/test";
test("synthetic workspace spends no research credits", async ({
  page,
  isMobile,
}) => {
  const paid: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/research"))
      paid.push(r.url());
  });
  await page.goto("/example?subject=example_trader&compare=example_trader");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.getByText("Values, with context.")).toBeAttached();
  expect(paid).toHaveLength(0);
  if (isMobile)
    await page.getByRole("button", { name: "Toggle navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Workspace" }),
  ).toBeVisible();
});
test("anonymous research is denied and app redirects to sign in", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/research", {
    headers: { origin: "http://127.0.0.1:3100" },
    data: {},
  });
  expect(response.status()).toBe(401);
  await page.goto("/app");
  await expect(page).toHaveURL(/signin/);
});

test("email sign-in, explicit research and signout work on each device", async ({
  page,
  isMobile,
}) => {
  const { readFile } = await import("node:fs/promises");
  const email = `browser-${crypto.randomUUID()}@example.com`;
  await page.goto("/signin");
  await page.getByLabel("Email address").fill(email);
  const response = page.waitForResponse((r) =>
    r.url().endsWith("/api/auth/request"),
  );
  await page.getByRole("button", { name: "Send verification code" }).click();
  const payload = await (await response).json();
  expect(payload.ok).toBe(true);
  const mail = JSON.parse(
    await readFile(
      `test-results/mail/${payload.data.challengeId}.json`,
      "utf8",
    ),
  );
  await page.getByLabel("Verification code").fill(mail.code);
  await page.getByRole("button", { name: "Verify and continue" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.getByRole("heading", { name: "A closer look." }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin")).status()).toBe(403);
  await page.getByRole("button", { name: "Explore profile" }).click();
  await expect(page.getByText(/Operation .*complete/)).toBeVisible();
  if (isMobile)
    await page.getByRole("tab", { name: "Performance", exact: true }).click();
  await page.getByRole("button", { name: /^30d/ }).click();
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  expect((await page.request.get("/api/session")).status()).toBe(401);
});

test("rejects foreign origins and oversized bodies", async ({ request }) => {
  expect(
    (
      await request.post("/api/auth/request", {
        headers: { origin: "https://elsewhere.example" },
        data: { email: "a@example.com" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/auth/request", {
        headers: { origin: "http://127.0.0.1:3100" },
        data: { email: "a".repeat(9000) },
      })
    ).status(),
  ).toBe(413);
});

test("synthetic profile selection remains explicit", async ({
  page,
  isMobile,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/research"))
      requests++;
  });
  await page.goto("/example?subject=alice&window=30d&compare=alice,bob");
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.getByLabel("Trader handle").fill("bob");
  await page.getByRole("button", { name: "Explore profile" }).click();
  if (isMobile)
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(page.getByText("@bob", { exact: true }).first()).toBeVisible();
  expect(requests).toBe(0);
});
