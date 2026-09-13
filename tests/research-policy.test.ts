import "./env";
import { it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  parseRetryAfter,
  recoveryDeadline,
  operationSummary,
  cursorBinding,
  retainedActual,
} from "@/lib/research-policy";
import { requestSchema } from "@/lib/research-contract";
import { signCursor, readCursor } from "@/lib/cursors";
import { safeReturn, equal } from "@/lib/crypto";
it("redacts accounting fields for ordinary users, preserving unknown charges for owners", () => {
  expect(operationSummary("id", null, "upstream", false)).toEqual({
    id: "id",
    status: "uncertain",
  });
  expect(operationSummary("id", null, "upstream", true)).toMatchObject({
    actualCredits: null,
    requestId: "upstream",
  });
});
it("validates retry timing and conservative recovery deadline across UTC midnight", () => {
  const now = Date.parse("2026-09-13T23:59:50Z");
  expect(parseRetryAfter("Mon, 14 Sep 2026 00:00:10 GMT", now)).toBe(20);
  expect(parseRetryAfter("60", now)).toBe(60);
  expect(parseRetryAfter("garbage", now)).toBeUndefined();
  expect(recoveryDeadline(new Date(now)).toISOString()).toBe(
    "2026-09-14T23:58:45.000Z",
  );
});
it("binds pages to user, direction, window and mode, and expires at the boundary", () => {
  const r = requestSchema.parse({
    id: randomUUID(),
    actionId: randomUUID(),
    kind: "leaderboard",
  });
  const binding = cursorBinding("alice", r, "stored"),
    cursor = signCursor("opaque", binding, 0);
  expect(readCursor(cursor, binding, 899999)).toBe("opaque");
  for (const changed of [
    cursorBinding("bob", r, "stored"),
    cursorBinding("alice", { ...r, window: "all" }, "stored"),
    cursorBinding("alice", r, "example"),
  ])
    expect(() => readCursor(cursor, changed, 0)).toThrow();
  expect(() => readCursor(cursor, binding, 900000)).toThrow("expired");
});
it.each([
  "//evil.test",
  "/\\evil.test",
  "/api/session",
  "/signin",
  "https://evil.test",
  "/\n/evil.test",
])("rejects unsafe redirect %s", (value) =>
  expect(safeReturn(value)).toBe("/app"),
);
it("preserves shared selections and handles unequal UTF8 byte lengths", () => {
  expect(safeReturn("/app?subject=alice")).toBe("/app?subject=alice");
  expect(equal("é", "x")).toBe(false);
});

it("retains conservative accounting when replay metadata is absent or lower", () => {
  expect(retainedActual(null, null)).toBeNull();
  expect(retainedActual(10, null)).toBe(10);
  expect(retainedActual(10, 1)).toBe(10);
  expect(retainedActual(null, 0)).toBe(0);
  expect(retainedActual(10, 12)).toBe(12);
});
