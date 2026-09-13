import { execFileSync } from "node:child_process";
import {
  environmentSources,
  secretValues,
  walk,
  scanFiles,
  archiveFiles,
} from "./secret-scan-core.mjs";
try {
  const build = process.argv.includes("--build");
  const files = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
    ".env.development",
    ".env.development.local",
    ".env.test",
    ".env.test.local",
  ].map((path) => ({ path }));
  if (process.env.SECRET_SCAN_ENV_FILE)
    files.push({ path: process.env.SECRET_SCAN_ENV_FILE, required: true });
  const values = secretValues(environmentSources(process.env, files));
  const names = build
    ? walk(".next")
    : process.argv.includes("--archive")
      ? archiveFiles(".")
      : execFileSync(
          "git",
          ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
          { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
        )
          .split("\0")
          .filter(Boolean);
  const result = scanFiles(names, values);
  if (result.detected) throw Error("Potential secrets");
  console.log(
    `${build ? "Build" : "Source"} secret scan passed (${result.count} files; ${result.deleted} absent tracked paths).`,
  );
} catch {
  console.error(
    "Secret scan failed: detected content or incomplete coverage. Values, paths and underlying diagnostics suppressed.",
  );
  process.exitCode = 1;
}
