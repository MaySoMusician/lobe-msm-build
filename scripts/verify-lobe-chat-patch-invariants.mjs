#!/usr/bin/env node
/**
 * Static invariants on an already-patched lobe-chat tree.
 * Starter set: Dockerfile pins / registry / harden / pnpm retries.
 * Full inventory is filled in later steps.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const msmBuildRoot = path.resolve(scriptDir, "..");
const lobeChatDir = path.resolve(
  process.env.LOBE_CHAT_DIR ?? path.join(msmBuildRoot, "..", "lobe-chat"),
);

/** @type {{ id: string; file: string; patterns: (string | RegExp)[] }[]} */
const checks = [
  {
    id: "dockerfile-node-pin",
    file: "Dockerfile",
    patterns: ['ARG NODEJS_VERSION="24.16.0"', "FROM busybox:1.38.0 AS app"],
  },
  {
    id: "dockerfile-npm-registry-arg",
    file: "Dockerfile",
    patterns: [
      'ARG NPM_REGISTRY=""',
      'npm config set registry "${NPM_REGISTRY}"',
    ],
  },
  {
    id: "dockerfile-harden",
    file: "Dockerfile",
    patterns: [
      "pnpm config set minimumReleaseAge 10080",
      "pnpm config set minimumReleaseAgeStrict true",
      "pnpm config set trustPolicy no-downgrade",
    ],
  },
  {
    id: "dockerfile-pnpm-retries",
    file: "Dockerfile",
    patterns: [
      "pnpm config set fetchRetries 5",
      "pnpm config set fetchRetryMintimeout 30000",
      "pnpm config set networkConcurrency 8",
    ],
  },
];

const errors = [];

for (const check of checks) {
  const abs = path.join(lobeChatDir, check.file);
  let text;
  try {
    text = fs.readFileSync(abs, "utf8");
  } catch (err) {
    errors.push(`[${check.id}] cannot read ${check.file}: ${err.message}`);
    continue;
  }

  for (const pattern of check.patterns) {
    const ok =
      typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
    if (!ok) {
      errors.push(
        `[${check.id}] missing in ${check.file}: ${
          typeof pattern === "string" ? pattern : pattern.toString()
        }`,
      );
    }
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
