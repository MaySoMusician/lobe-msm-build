#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const lobeUiDir = path.resolve(
  process.env.LOBE_UI_DIR ?? path.join(repositoryRoot, "..", "lobe-ui"),
);
const outputDir = path.resolve(
  process.env.LOBE_UI_ARTIFACT_DIR ?? path.join(repositoryRoot, ".artifacts"),
);
const auditedRegistry =
  process.env.AUDITED_NPM_REGISTRY ?? "https://npm.flatt.tech/";
const skipBuild = process.argv.includes("--skip-build");

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? lobeUiDir,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture
      ? `\n${result.stdout ?? ""}${result.stderr ?? ""}`
      : "";
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})${detail}`);
  }

  return options.capture ? String(result.stdout).trim() : "";
};

if (!fs.existsSync(path.join(lobeUiDir, "package.json"))) {
  throw new Error(`LOBE_UI_DIR is not a Lobe UI checkout: ${lobeUiDir}`);
}

const sourcePackage = JSON.parse(
  fs.readFileSync(path.join(lobeUiDir, "package.json"), "utf8"),
);
if (sourcePackage.name !== "@lobehub/ui") {
  throw new Error(`Unexpected package in LOBE_UI_DIR: ${sourcePackage.name}`);
}

const fontTokens = fs.readFileSync(
  path.join(lobeUiDir, "src", "styles", "theme", "token", "base.ts"),
  "utf8",
);
const themeProvider = fs.readFileSync(
  path.join(lobeUiDir, "src", "ThemeProvider", "ThemeProvider.tsx"),
  "utf8",
);
if (!fontTokens.includes("IBM Plex Sans JP") || !fontTokens.includes("Mgen+ 1mn")) {
  throw new Error("LOBE_UI_DIR does not contain the expected MSM font stack");
}
if (/webfont-harmony-sans/.test(themeProvider)) {
  throw new Error("LOBE_UI_DIR still loads the default Harmony font packages");
}

if (!skipBuild) {
  const installEnv = {
    ...process.env,
    npm_config_registry: auditedRegistry,
  };
  run("bun", ["install", "--network-concurrency", "8"], { env: installEnv });
  run("bun", ["run", "build"]);
}

const esDir = path.join(lobeUiDir, "es");
if (!fs.existsSync(esDir)) {
  throw new Error(`Built output is missing: ${esDir}`);
}

const sourceSha = run("git", ["rev-parse", "HEAD"], { capture: true });
const packageVersion = sourcePackage.version.endsWith("-msm")
  ? sourcePackage.version
  : `${sourcePackage.version}-msm`;
const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), "lobe-ui-msm-"));

try {
  fs.cpSync(esDir, path.join(stagingDir, "es"), { recursive: true });

  const stagedPackage = {
    ...sourcePackage,
    version: packageVersion,
  };
  delete stagedPackage.scripts;
  delete stagedPackage.devDependencies;
  delete stagedPackage.workspaces;
  fs.writeFileSync(
    path.join(stagingDir, "package.json"),
    `${JSON.stringify(stagedPackage, null, 2)}\n`,
  );

  for (const file of ["LICENSE", "README.md"]) {
    const source = path.join(lobeUiDir, file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(stagingDir, file));
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const packedName = run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", outputDir],
    { capture: true, cwd: stagingDir },
  );
  const packResult = JSON.parse(packedName);
  const generatedPath = path.join(outputDir, packResult[0].filename);
  const artifactPath = path.join(outputDir, "lobehub-ui.tgz");
  fs.renameSync(generatedPath, artifactPath);

  const sha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(artifactPath))
    .digest("hex");
  const metadata = {
    artifact: path.basename(artifactPath),
    package: "@lobehub/ui",
    packageVersion,
    sha256,
    sourceDir: lobeUiDir,
    sourceSha,
    sourceVersion: sourcePackage.version,
  };
  const metadataPath = path.join(outputDir, "lobehub-ui.metadata.json");
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  console.log(artifactPath);
  console.log(metadataPath);
} finally {
  fs.rmSync(stagingDir, { force: true, recursive: true });
}
