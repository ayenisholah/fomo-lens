import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
const names = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:re_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,})\b/,
  /(?:AUTH_SECRET|IP_HASH_SECRET|CURSOR_SECRET|FOMOLENS_KEY|RESEND_API_KEY)\s*=\s*["']?[A-Za-z0-9_\-]{24,}/,
];
const bad = [];
for (const name of names) {
  if (/(^|\/)\.env(?!\.example$)/.test(name)) {
    bad.push(name);
    continue;
  }
  if (!statSync(name).isFile() || statSync(name).size > 2000000) continue;
  const text = readFileSync(name, "utf8");
  if (patterns.some((p) => p.test(text))) bad.push(name);
}
if (bad.length) {
  console.error("Potential secrets in: " + bad.join(", "));
  process.exit(1);
}
console.log(
  "Source secret-pattern scan passed. Review runtime/image scans separately.",
);
