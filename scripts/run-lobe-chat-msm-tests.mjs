#!/usr/bin/env node
/**
 * Run only *.msm.test.ts(x) on a patched lobe-chat tree.
 * Partitions by Vitest owner (packages/<name> vs repo root).
 * Never invokes the full upstream suite.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const msmBuildRoot = path.resolve(scriptDir, "..");
const lobeChatDir = path.resolve(
  process.env.LOBE_CHAT_DIR ?? path.join(msmBuildRoot, "..", "lobe-chat"),
);

/** @returns {import('node:fs').Dirent[]} */
function readDirents(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** @returns {string[]} */
function walkMsmTests(dir) {
  const entries = readDirents(dir);
  return entries.flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === ".git") {
      return [];
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walkMsmTests(full);
    }
    if (
      entry.isFile() &&
      (entry.name.endsWith(".msm.test.ts") ||
        entry.name.endsWith(".msm.test.tsx"))
    ) {
      return [full];
    }
    return [];
  });
}

const absFiles = walkMsmTests(lobeChatDir).toSorted();

if (absFiles.length === 0) {
  console.log(`No *.msm.test.ts(x) files under ${lobeChatDir}; skipping.`);
  process.exit(0);
}

/** @type {Map<string, string[]>} */
const groups = new Map();

for (const abs of absFiles) {
  const rel = path.relative(lobeChatDir, abs);
  const parts = rel.split(path.sep);
  const inPackage = parts[0] === "packages" && parts.length >= 3;
  const cwd = inPackage
    ? path.join(lobeChatDir, "packages", parts[1])
    : lobeChatDir;
  const fileArg = inPackage ? path.relative(cwd, abs) : rel;

  const list = groups.get(cwd) ?? [];
  list.push(fileArg);
  groups.set(cwd, list);
}

let failed = false;

for (const [cwd, files] of groups) {
  console.log(`\n[msm-vitest] cwd=${cwd}`);
  console.log(`[msm-vitest] files=${files.join(" ")}`);
  const result = spawnSync(
    "bunx",
    ["vitest", "run", "--silent=passed-only", ...files],
    { cwd, stdio: "inherit", env: process.env },
  );
  if (result.error) {
    console.error(result.error);
    failed = true;
    continue;
  }
  if (result.status !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
