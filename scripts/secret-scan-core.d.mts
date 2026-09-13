import type { lstatSync, readFileSync, readdirSync } from "node:fs";
type Sources = Record<string, string | undefined>[];
type ReadPort = {
  lstatSync: typeof lstatSync;
  readFileSync: typeof readFileSync;
};
type WalkPort = {
  lstatSync: typeof lstatSync;
  readdirSync: typeof readdirSync;
};
export function secretValues(sources: Sources): string[];
export function environmentSources(
  env: Sources[number],
  files: { path: string; required?: boolean }[],
  fs?: ReadPort,
): Sources;
export function hasSecret(
  name: string,
  content: Buffer,
  values: string[],
): boolean;
export function scanFiles(
  names: string[],
  values: string[],
  fs?: ReadPort,
  maxBytes?: number,
): { count: number; deleted: number; detected: number };
export function walk(dir: string, fs?: WalkPort): string[];
export function archiveFiles(dir: string, fs?: WalkPort): string[];
