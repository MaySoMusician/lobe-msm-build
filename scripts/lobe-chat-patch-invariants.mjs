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
    id: 'dockerfile-node-pin',
    asserts: [
      {
        file: 'Dockerfile',
        patterns: ['ARG NODEJS_VERSION="24.21.0"', 'FROM busybox:1.38.0 AS app'],
      },
    ],
  },
  {
    id: 'dockerfile-npm-registry-arg',
    asserts: [
      {
        file: 'Dockerfile',
        patterns: ['ARG NPM_REGISTRY=""', 'npm config set registry "${NPM_REGISTRY}"'],
      },
    ],
  },
  {
    id: 'dockerfile-harden',
    asserts: [
      {
        file: 'Dockerfile',
        patterns: [
          "'minimumReleaseAge: 10080'",
          "'minimumReleaseAgeStrict: true'",
          "'trustPolicy: no-downgrade'",
          "'blockExoticSubdeps: true'",
          "'strictDepBuilds: true'",
        ],
      },
    ],
  },
  {
    id: 'dockerfile-pnpm-retries',
    asserts: [
      {
        file: 'Dockerfile',
        patterns: [
          'pnpm config --global set --json fetchRetries 5',
          'pnpm config --global set --json fetchRetryMintimeout 30000',
          'pnpm config --global set --json networkConcurrency 8',
        ],
      },
    ],
  },
  {
    id: 'workspace-trust-age',
    asserts: [
      {
        file: 'pnpm-workspace.yaml',
        patterns: [
          'minimumReleaseAge: 10080',
          'minimumReleaseAgeStrict: true',
          "- '@lobehub/ui@5.49.0'",
          'trustPolicy: no-downgrade',
        ],
        absent: ["- '@lobehub/*'"],
      },
      {
        file: 'apps/cli/pnpm-workspace.yaml',
        patterns: [
          'minimumReleaseAge: 10080',
          'minimumReleaseAgeStrict: true',
          'trustPolicy: no-downgrade',
          'blockExoticSubdeps: true',
          'strictDepBuilds: true',
        ],
      },
      {
        file: 'apps/desktop/pnpm-workspace.yaml',
        patterns: [
          'minimumReleaseAge: 10080',
          'minimumReleaseAgeStrict: true',
          'trustPolicy: no-downgrade',
          'blockExoticSubdeps: true',
          'strictDepBuilds: true',
        ],
      },
    ],
  },
  {
    id: 'package-manager-pnpm12',
    asserts: [
      {
        file: 'package.json',
        patterns: ['"packageManager": "pnpm@12.4.1'],
      },
    ],
  },
  {
    id: 'hono-node-server-pin',
    asserts: [
      {
        file: 'pnpm-workspace.yaml',
        patterns: ["'@hono/node-server': 1.19.17"],
        absent: ["- '@hono/node-server@1.19.17'"],
      },
    ],
  },
  {
    id: 'vite-ui-dedupe',
    asserts: [
      {
        file: 'vite.config.ts',
        patterns: [
          "dedupe: [...sharedRendererDedupe, '@lobehub/ui', '@lobehub/icons', 'antd', 'motion']",
        ],
      },
    ],
  },
  {
    id: 'qstash-no-debug-logging',
    asserts: [
      {
        file: 'src/libs/qstash/index.ts',
        absent: ["debug('lobe-server:qstash')", 'QStash signature verification failed: %O'],
      },
      {
        file: 'patches/@upstash__qstash.patch',
        absent: [
          '[upstash-qstash] request failed',
          'Object.fromEntries(response.headers.entries())',
        ],
      },
    ],
  },
  {
    id: 'fonts-jp',
    asserts: [
      {
        file: 'index.html',
        patterns: ['href="https://fonts.googleapis.com"', 'IBM+Plex+Sans+JP'],
      },
      {
        file: 'index.mobile.html',
        patterns: ['href="https://fonts.googleapis.com"', 'IBM+Plex+Sans+JP'],
      },
      {
        file: 'index.auth.html',
        patterns: ['href="https://fonts.googleapis.com"', 'IBM+Plex+Sans+JP'],
      },
      {
        file: 'index.workbench.html',
        patterns: ['href="https://fonts.googleapis.com"', 'IBM+Plex+Sans+JP'],
      },
      {
        file: 'apps/workbench/index.html',
        patterns: ['href="https://fonts.googleapis.com"', 'IBM+Plex+Sans+JP'],
      },
      {
        file: 'apps/share/index.html',
        patterns: ['href="https://fonts.googleapis.com"', 'IBM+Plex+Sans+JP'],
      },
      {
        file: 'apps/desktop/index.html',
        absent: ['fonts.googleapis.com', 'IBM+Plex+Sans+JP'],
      },
    ],
  },
];
