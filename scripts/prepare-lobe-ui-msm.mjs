#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '..');
const lobeUiDir = path.resolve(
  process.env.LOBE_UI_DIR ?? path.join(repositoryRoot, '..', 'lobe-ui'),
);
const outputDir = path.resolve(
  process.env.LOBE_UI_ARTIFACT_DIR ?? path.join(repositoryRoot, '.artifacts'),
);
const auditedRegistry = process.env.AUDITED_NPM_REGISTRY ?? 'https://npm.flatt.tech/';
const skipBuild = process.argv.includes('--skip-build');
const bunInstallAttempts = 5;
const bunInstallRetryDelayMs = 30_000;
const bunfigPath = path.join(lobeUiDir, 'bunfig.toml');
const bunfigPolicy = `[install]
minimumReleaseAge = 604800
ignoreScripts = true
minimumReleaseAgeExcludes = ["@lobehub/ui"]
`;

const sleep = (milliseconds) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? lobeUiDir,
    encoding: 'utf8',
    env: options.env ?? process.env,
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = options.capture ? `\n${result.stdout ?? ''}${result.stderr ?? ''}` : '';
    throw new Error(`${command} ${args.join(' ')} failed (${result.status})${detail}`);
  }

  return options.capture ? String(result.stdout).trim() : '';
};

const runBunInstall = (env) => {
  const args = ['install', '--network-concurrency', '8'];

  for (let attempt = 1; attempt <= bunInstallAttempts; attempt++) {
    const result = spawnSync('bun', args, {
      cwd: lobeUiDir,
      encoding: 'utf8',
      env,
      stdio: 'inherit',
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status === 0) {
      return;
    }
    if (attempt === bunInstallAttempts) {
      throw new Error(`bun install failed after ${bunInstallAttempts} attempts`);
    }

    console.error(
      `bun install failed on attempt ${attempt}/${bunInstallAttempts}; waiting 30 seconds before retrying...`,
    );
    sleep(bunInstallRetryDelayMs);
  }
};

if (!fs.existsSync(path.join(lobeUiDir, 'package.json'))) {
  throw new Error(`LOBE_UI_DIR is not a Lobe UI checkout: ${lobeUiDir}`);
}

const sourcePackage = JSON.parse(fs.readFileSync(path.join(lobeUiDir, 'package.json'), 'utf8'));
if (sourcePackage.name !== '@lobehub/ui') {
  throw new Error(`Unexpected package in LOBE_UI_DIR: ${sourcePackage.name}`);
}

const fontTokens = fs.readFileSync(
  path.join(lobeUiDir, 'src', 'styles', 'theme', 'token', 'base.ts'),
  'utf8',
);
const themeProvider = fs.readFileSync(
  path.join(lobeUiDir, 'src', 'ThemeProvider', 'ThemeProvider.tsx'),
  'utf8',
);
if (!fontTokens.includes('IBM Plex Sans JP') || !fontTokens.includes('Mgen+ 1mn')) {
  throw new Error('LOBE_UI_DIR does not contain the expected MSM font stack');
}
if (/webfont-harmony-sans/.test(themeProvider)) {
  throw new Error('LOBE_UI_DIR still loads the default Harmony font packages');
}

if (!skipBuild) {
  const installEnv = {
    ...process.env,
    npm_config_registry: auditedRegistry,
  };
  const previousBunfig = fs.existsSync(bunfigPath) ? fs.readFileSync(bunfigPath, 'utf8') : null;
  fs.writeFileSync(bunfigPath, bunfigPolicy);

  try {
    runBunInstall(installEnv);
    run('bun', ['run', 'build']);
  } finally {
    if (previousBunfig === null) {
      fs.rmSync(bunfigPath, { force: true });
    } else {
      fs.writeFileSync(bunfigPath, previousBunfig);
    }
  }
}

const esDir = path.join(lobeUiDir, 'es');
if (!fs.existsSync(esDir)) {
  throw new Error(`Built output is missing: ${esDir}`);
}
const builtFontTokens = fs.readFileSync(
  path.join(esDir, 'styles', 'theme', 'token', 'base.mjs'),
  'utf8',
);
const builtThemeProvider = fs.readFileSync(
  path.join(esDir, 'ThemeProvider', 'ThemeProvider.mjs'),
  'utf8',
);
if (!builtFontTokens.includes('IBM Plex Sans JP') || !builtFontTokens.includes('Mgen+ 1mn')) {
  throw new Error('Built Lobe UI output does not contain the expected MSM font stack');
}
if (/webfont-(?:harmony|mono)/.test(builtThemeProvider)) {
  throw new Error('Built Lobe UI output still loads removed Harmony/mono webfonts');
}

const sourceSha = run('git', ['rev-parse', 'HEAD'], { capture: true });
const packageVersion = sourcePackage.version.endsWith('-msm')
  ? sourcePackage.version
  : `${sourcePackage.version}-msm`;
const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lobe-ui-msm-'));

try {
  fs.cpSync(esDir, path.join(stagingDir, 'es'), { recursive: true });

  const stagedPackage = {
    ...sourcePackage,
    version: packageVersion,
  };
  delete stagedPackage.scripts;
  delete stagedPackage.devDependencies;
  delete stagedPackage.workspaces;
  fs.writeFileSync(
    path.join(stagingDir, 'package.json'),
    `${JSON.stringify(stagedPackage, null, 2)}\n`,
  );

  for (const file of ['LICENSE', 'README.md']) {
    const source = path.join(lobeUiDir, file);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(stagingDir, file));
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const packedName = run(
    'npm',
    ['pack', '--ignore-scripts', '--json', '--pack-destination', outputDir],
    { capture: true, cwd: stagingDir },
  );
  const packResult = JSON.parse(packedName);
  const generatedPath = path.join(outputDir, packResult[0].filename);
  const artifactPath = path.join(outputDir, 'lobehub-ui.tgz');
  fs.renameSync(generatedPath, artifactPath);

  const packedPackage = JSON.parse(
    run('tar', ['-xOzf', artifactPath, 'package/package.json'], {
      capture: true,
      cwd: outputDir,
    }),
  );
  const packedFontTokens = run(
    'tar',
    ['-xOzf', artifactPath, 'package/es/styles/theme/token/base.mjs'],
    { capture: true, cwd: outputDir },
  );
  const packedThemeProvider = run(
    'tar',
    ['-xOzf', artifactPath, 'package/es/ThemeProvider/ThemeProvider.mjs'],
    { capture: true, cwd: outputDir },
  );
  if (packedPackage.name !== '@lobehub/ui' || !packedPackage.version.endsWith('-msm')) {
    throw new Error('Packed Lobe UI manifest does not identify the MSM package');
  }
  if (packedPackage.scripts || packedPackage.devDependencies || packedPackage.workspaces) {
    throw new Error('Packed Lobe UI manifest still contains build-only fields');
  }
  if (!packedFontTokens.includes('IBM Plex Sans JP') || !packedFontTokens.includes('Mgen+ 1mn')) {
    throw new Error('Packed Lobe UI artifact does not contain the expected MSM font stack');
  }
  if (/webfont-(?:harmony|mono)/.test(packedThemeProvider)) {
    throw new Error('Packed Lobe UI artifact still loads removed Harmony/mono webfonts');
  }

  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex');
  const metadata = {
    artifact: path.basename(artifactPath),
    package: '@lobehub/ui',
    packageVersion,
    sha256,
    sourceDir: lobeUiDir,
    sourceSha,
    sourceVersion: sourcePackage.version,
  };
  const metadataPath = path.join(outputDir, 'lobehub-ui.metadata.json');
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  console.log(artifactPath);
  console.log(metadataPath);
} finally {
  fs.rmSync(stagingDir, { force: true, recursive: true });
}
