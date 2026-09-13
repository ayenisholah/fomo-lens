import "./env";
import { it, expect } from "vitest";
import { body, origin } from "@/lib/http";
it("rejects missing and foreign origins", () => {
  expect(() =>
    origin(new Request("http://localhost:3000/api/research")),
  ).toThrow();
  expect(() =>
    origin(
      new Request("http://localhost:3000/api/research", {
        headers: { origin: "https://elsewhere.example" },
      }),
    ),
  ).toThrow();
  expect(() =>
    origin(
      new Request("http://localhost:3000/api/research", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
  ).not.toThrow();
});
it("enforces byte limits without trusting content-length", async () => {
  const req = (content: string, headers = {}) =>
    new Request("http://localhost:3000", {
      method: "POST",
      body: content,
      headers,
    });
  await expect(body(req('"' + "a".repeat(8192) + '"'))).rejects.toMatchObject({
    status: 413,
  });
  await expect(
    body(req('"' + "é".repeat(4096) + '"', { "content-length": "1" })),
  ).rejects.toMatchObject({ status: 413 });
  await expect(body(req("invalid"))).rejects.toMatchObject({ status: 400 });
  await expect(body(req('{"ok":true}'))).resolves.toEqual({ ok: true });
});
