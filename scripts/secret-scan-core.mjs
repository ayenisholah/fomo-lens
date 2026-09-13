import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";
const keys = [
  "FOMOLENS_KEY",
  "RESEND_API_KEY",
  "AUTH_SECRET",
  "IP_HASH_SECRET",
  "CURSOR_SECRET",
  "DATABASE_URL",
  "PRODUCTION_DATABASE_URL",
  "POSTGRES_PASSWORD",
  "TEST_DATABASE_URL",
  "TEST_BROWSER_DATABASE_URL",
];
export function secretValues(sources) {
  return [
    ...new Set(
      sources
        .flatMap((env) => keys.map((key) => env[key]))
        .filter((value) => typeof value === "string" && value.length > 0),
    ),
  ];
}
export function environmentSources(
  env,
  files,
  fs = { lstatSync, readFileSync },
) {
  const sources = [{ ...env }];
  for (const { path, required = false } of files) {
    const stat = fs.lstatSync(path, { throwIfNoEntry: false });
    if (!stat) {
      if (required) throw Error("Secret source unavailable");
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink())
      throw Error("Unsafe secret source");
    sources.push(parse(fs.readFileSync(path)));
  }
  return sources;
}
const patterns = [
  /\bfl_live_[A-Za-z0-9_-]{24,}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:re_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,})\b/,
  /(?:AUTH_SECRET|IP_HASH_SECRET|CURSOR_SECRET|FOMOLENS_KEY|RESEND_API_KEY)\s*=\s*["']?[A-Za-z0-9_\-]{24,}/,
];
export function hasSecret(name, content, values) {
  return (
    /(^|\/)\.env(?!\.example$)/.test(name) ||
    values.some((value) => content.includes(value)) ||
    patterns.some((pattern) => pattern.test(content.toString("utf8")))
  );
}
export function walk(dir, fs = { lstatSync, readdirSync }) {
  const stat = fs.lstatSync(dir);
  if (stat.isSymbolicLink()) throw Error("Unscanned symbolic link");
  if (!stat.isDirectory()) return [dir];
  return fs.readdirSync(dir).flatMap((name) => walk(join(dir, name), fs));
}
export function scanFiles(
  names,
  values,
  fs = { lstatSync, readFileSync },
  maxBytes = 32 * 1024 * 1024,
) {
  let count = 0,
    deleted = 0,
    detected = 0;
  for (const name of new Set(names)) {
    const stat = fs.lstatSync(name, { throwIfNoEntry: false });
    if (!stat) {
      deleted++;
      continue;
    } // git includes intentionally deleted tracked files.
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes)
      throw Error("Unscanned file requires review");
    const content = fs.readFileSync(name);
    if (content.length > maxBytes)
      throw Error("Unscanned file requires review");
    count++;
    if (hasSecret(name, content, values)) detected++;
  }
  return { count, deleted, detected };
}

// Git archives have no .git index. Dependency and generated build trees have separate gates.
export function archiveFiles(dir, fs = { lstatSync, readdirSync }) {
  return fs
    .readdirSync(dir)
    .filter((name) => ![".git", "node_modules", ".next"].includes(name))
    .flatMap((name) => walk(join(dir, name), fs));
}
