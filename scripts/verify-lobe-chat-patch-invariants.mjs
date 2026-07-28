#!/usr/bin/env node
/**
 * Static invariants on an already-patched lobe-chat tree.
 * Definitions live in `./lobe-chat-patch-invariants.mjs`.
 * No pnpm install required — run after `git am` (or against a local msm/patch-* tree).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checks } from "./lobe-chat-patch-invariants.mjs";

/**
 * @typedef {import('./lobe-chat-patch-invariants.mjs').Pattern} Pattern
 * @typedef {import('./lobe-chat-patch-invariants.mjs').Assert} Assert
 */

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const msmBuildRoot = path.resolve(scriptDir, "..");
const defaultLobeChatDir = path.join(msmBuildRoot, "..", "lobe-chat");

/**
 * @param {Pattern} pattern
 * @param {string} text
 */
function matches(pattern, text) {
  return typeof pattern === "string"
    ? text.includes(pattern)
    : pattern.test(text);
}

/**
 * @param {string} lobeChatDir
 * @param {string} id
 * @param {Assert} assert
 * @param {string[]} errors
 */
function runAssert(lobeChatDir, id, assert, errors) {
  const abs = path.join(lobeChatDir, assert.file);
  let text;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch (err) {
    errors.push(`[${id}] cannot read ${assert.file}: ${err.message}`);
    return;
  }

  for (const pattern of assert.patterns ?? []) {
    if (!matches(pattern, text)) {
      errors.push(
        `[${id}] missing in ${assert.file}: ${
          typeof pattern === "string" ? pattern : pattern.toString()
        }`,
      );
    }
  }

  for (const pattern of assert.absent ?? []) {
    if (matches(pattern, text)) {
      errors.push(
        `[${id}] must not appear in ${assert.file}: ${
          typeof pattern === "string" ? pattern : pattern.toString()
        }`,
      );
    }
  }
}

function main() {
  const lobeChatDir = path.resolve(
    process.env.LOBE_CHAT_DIR ?? defaultLobeChatDir,
  );
  const errors = [];

  for (const check of checks) {
    for (const assert of check.asserts) {
      runAssert(lobeChatDir, check.id, assert, errors);
    }
  }

  if (errors.length > 0) {
    console.error("Invariant check failures:");
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }

  console.log(
    `All ${checks.length} invariant check(s) passed against ${lobeChatDir}`,
  );
}

main();
