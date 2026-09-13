import { it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  environmentSources,
  secretValues,
  hasSecret,
  scanFiles,
  walk,
  archiveFiles,
} from "../scripts/secret-scan-core.mjs";
function fixture(task: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "lens-synthetic-scan-"));
  try {
    task(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
it("retains overridden values from every environment source, including short passwords", () =>
  fixture((dir) => {
    const files = ["a", "b", "c"].map((name, index) => {
      const path = join(dir, name);
      writeFileSync(path, `AUTH_SECRET=synthetic-source-${index}\n`);
      return { path };
    });
    const values = secretValues(
      environmentSources(
        { AUTH_SECRET: "synthetic-process", POSTGRES_PASSWORD: "tiny" },
        files,
      ),
    );
    expect(values).toHaveLength(5);
    for (const value of values)
      expect(
        hasSecret("asset.js", Buffer.from(`prefix ${value} suffix`), values),
      ).toBe(true);
  }));
it("detects patterns and dotenv paths but accepts a harmless example", () => {
  expect(
    hasSecret("bundle.js", Buffer.from("fl_live_" + "a".repeat(24)), []),
  ).toBe(true);
  expect(hasSecret(".env.local", Buffer.from(""), [])).toBe(true);
  expect(hasSecret(".env.example", Buffer.from("AUTH_SECRET="), [])).toBe(
    false,
  );
});
it("counts missing tracked paths and deduplicates files without leaking matches", () =>
  fixture((dir) => {
    const path = join(dir, "asset");
    writeFileSync(path, "synthetic-private-value");
    const result = scanFiles(
      [path, path, join(dir, "deleted")],
      ["synthetic-private-value"],
    );
    expect(result).toEqual({ count: 1, deleted: 1, detected: 1 });
    expect(JSON.stringify(result)).not.toContain(path);
  }));
it("fails closed for oversized files and symlinks", () =>
  fixture((dir) => {
    const path = join(dir, "large");
    writeFileSync(path, "0123456789");
    expect(() => scanFiles([path], [], undefined, 5)).toThrow("Unscanned");
    const link = join(dir, "link");
    symlinkSync(path, link);
    expect(() => scanFiles([link], [])).toThrow("Unscanned");
    expect(() => walk(dir)).toThrow("symbolic link");
    expect(() => environmentSources({}, [{ path: link }])).toThrow("Unsafe");
  }));
it("allows absent optional env files, rejects missing explicit sources and build trees", () =>
  fixture((dir) => {
    const path = join(dir, "missing");
    expect(environmentSources({}, [{ path }])).toEqual([{}]);
    expect(() => environmentSources({}, [{ path, required: true }])).toThrow(
      "unavailable",
    );
    expect(() => walk(path)).toThrow();
  }));

it("enumerates archive sources without Git metadata and excludes separately scanned output", () =>
  fixture((dir) => {
    writeFileSync(join(dir, "source.ts"), "safe");
    mkdirSync(join(dir, "node_modules"));
    writeFileSync(join(dir, "node_modules", "dependency"), "excluded");
    mkdirSync(join(dir, ".next"));
    writeFileSync(join(dir, ".next", "bundle"), "separate");
    expect(archiveFiles(dir)).toEqual([join(dir, "source.ts")]);
  }));
