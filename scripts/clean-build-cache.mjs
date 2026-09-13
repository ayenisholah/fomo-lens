import { rmSync } from "node:fs";
// Compiler caches are disposable, are never shipped, and can exceed the
// scanner's deliberate 32 MiB per-file ceiling. Scan all remaining build files.
rmSync(".next/cache", { recursive: true, force: true });
