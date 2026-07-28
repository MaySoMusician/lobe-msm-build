/**
 * Static invariant definitions for an already-patched lobe-chat tree.
 *
 * Scope: build / supply-chain / shipped HTML config that has no runtime API.
 * UI and runtime behaviors belong in `*.msm.test.ts(x)` overlays — not here.
 *
 * @typedef {string | RegExp} Pattern
 * @typedef {{ file: string; patterns?: Pattern[]; absent?: Pattern[] }} Assert
 * @typedef {{ id: string; asserts: Assert[] }} Check
 */

/** @type {Check[]} */
export const checks = [
  {
    id: "dockerfile-node-pin",
    asserts: [
      {
        file: "Dockerfile",
        patterns: [
          'ARG NODEJS_VERSION="24.16.0"',
          "FROM busybox:1.38.0 AS app",
        ],
      },
    ],
  },
  {
    id: "dockerfile-npm-registry-arg",
    asserts: [
      {
        file: "Dockerfile",
        patterns: [
          'ARG NPM_REGISTRY=""',
          'npm config set registry "${NPM_REGISTRY}"',
        ],
      },
    ],
  },
  {
    id: "dockerfile-harden",
    asserts: [
      {
        file: "Dockerfile",
        patterns: [
          "pnpm config set minimumReleaseAge 10080",
          "pnpm config set minimumReleaseAgeStrict true",
          "pnpm config set trustPolicy no-downgrade",
        ],
      },
    ],
  },
  {
    id: "dockerfile-pnpm-retries",
    asserts: [
      {
        file: "Dockerfile",
        patterns: [
          "pnpm config set fetchRetries 5",
          "pnpm config set fetchRetryMintimeout 30000",
          "pnpm config set networkConcurrency 8",
        ],
      },
    ],
  },
  {
    id: "workspace-trust-age",
    asserts: [
      {
        file: "pnpm-workspace.yaml",
        patterns: [
          "minimumReleaseAge: 10080",
          "minimumReleaseAgeStrict: true",
          "trustPolicy: no-downgrade",
        ],
      },
      {
        file: "package.json",
        patterns: ['"@lobehub/editor": "^4.19.1 <4.23.0"'],
      },
    ],
  },
  {
    id: "vite-ui-dedupe",
    asserts: [
      {
        file: "vite.config.ts",
        patterns: [
          "dedupe: ['@lobehub/ui', '@lobehub/icons', 'antd', 'motion', 'react', 'react-dom']",
        ],
      },
    ],
  },
  {
    id: "fonts-jp",
    asserts: [
      {
        file: "index.html",
        patterns: [
          'href="https://fonts.googleapis.com"',
          "IBM+Plex+Sans+JP",
        ],
      },
      {
        file: "index.mobile.html",
        patterns: [
          'href="https://fonts.googleapis.com"',
          "IBM+Plex+Sans+JP",
        ],
      },
    ],
  },
];
