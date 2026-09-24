#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..");
const testDir = path.join(repositoryRoot, "lobe-chat-tests", "playwright");
const lobeChatDir = path.resolve(
  process.env.LOBE_CHAT_DIR ?? path.join(repositoryRoot, "..", "lobe-chat"),
);
const registry = process.env.AUDITED_NPM_REGISTRY ?? "https://npm.flatt.tech/";
const runId = `${process.pid}-${Date.now()}`;
const postgresName = `lobe-msm-postgres-${runId}`;
const appName = `lobe-msm-app-${runId}`;
const defaultImage = `lobe-chat-msm-behavior:${runId}`;
const startedContainers = [];
let worktreeDir;

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const detail = options.capture
      ? `\n${result.stdout ?? ""}${result.stderr ?? ""}`
      : "";
    throw new Error(`${command} ${args.join(" ")} failed (${result.status})${detail}`);
  }
  return result;
};

const cleanup = () => {
  for (const name of startedContainers.reverse()) {
    run("docker", ["rm", "-f", name], { allowFailure: true, capture: true });
  }
  if (worktreeDir) {
    run("git", ["worktree", "remove", "--force", worktreeDir], {
      allowFailure: true,
      capture: true,
      cwd: lobeChatDir,
    });
    fs.rmSync(worktreeDir, { force: true, recursive: true });
  }
};

const waitForPostgres = (name) => {
  let consecutiveSuccesses = 0;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const ready = run(
      "docker",
      ["exec", name, "psql", "-U", "postgres", "-d", "postgres", "-c", "SELECT 1"],
      { allowFailure: true, capture: true },
    );
    consecutiveSuccesses = ready.status === 0 ? consecutiveSuccesses + 1 : 0;
    // ParadeDB reports ready once before completing extension setup and
    // restarting PostgreSQL. Require a stable window before app migrations.
    if (consecutiveSuccesses >= 5) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  throw new Error("PostgreSQL did not become ready");
};

const prepareLocalImage = () => {
  run("git", ["rev-parse", "--git-dir"], { capture: true, cwd: lobeChatDir });

  let uiTarball = process.env.LOBE_UI_TARBALL;
  if (!uiTarball) {
    run("node", [path.join(scriptDir, "prepare-lobe-ui-msm.mjs")]);
    uiTarball = path.join(repositoryRoot, ".artifacts", "lobehub-ui.tgz");
  }
  uiTarball = path.resolve(uiTarball);
  if (!fs.existsSync(uiTarball)) throw new Error(`Lobe UI tarball not found: ${uiTarball}`);

  worktreeDir = fs.mkdtempSync(path.join(os.tmpdir(), "lobe-chat-msm-"));
  fs.rmSync(worktreeDir, { recursive: true });
  run("git", ["worktree", "add", "--detach", worktreeDir, "HEAD"], { cwd: lobeChatDir });

  fs.copyFileSync(uiTarball, path.join(worktreeDir, "lobehub-ui.tgz"));
  const packagePath = path.join(worktreeDir, "package.json");
  const packageJSON = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  packageJSON.dependencies["@lobehub/ui"] = "file:/app/lobehub-ui.tgz";
  packageJSON.pnpm ??= {};
  packageJSON.pnpm.overrides ??= {};
  packageJSON.pnpm.overrides["@lobehub/ui"] = "file:/app/lobehub-ui.tgz";
  fs.writeFileSync(packagePath, `${JSON.stringify(packageJSON, null, 2)}\n`);

  const dockerfilePath = path.join(worktreeDir, "Dockerfile");
  const dockerfile = fs
    .readFileSync(dockerfilePath, "utf8")
    .replace(
      "COPY package.json pnpm-workspace.yaml ./",
      "COPY package.json pnpm-workspace.yaml lobehub-ui.tgz ./",
    );
  fs.writeFileSync(dockerfilePath, dockerfile);
  fs.appendFileSync(path.join(worktreeDir, ".dockerignore"), "\n.pnpm-store\n");

  run(
    "docker",
    [
      "build",
      "--build-arg",
      `NPM_REGISTRY=${registry}`,
      "-t",
      defaultImage,
      ".",
      "-f",
      "Dockerfile",
    ],
    { cwd: worktreeDir },
  );
  return defaultImage;
};

const loadImageArchive = (archive) => {
  const resolved = path.resolve(archive);
  if (!fs.existsSync(resolved)) throw new Error(`Image archive not found: ${resolved}`);
  const shell = archive.endsWith(".gz")
    ? `gunzip -c ${JSON.stringify(resolved)} | docker load`
    : `docker load -i ${JSON.stringify(resolved)}`;
  run("bash", ["-lc", shell]);
};

const runTests = (environment) => {
  run("pnpm", ["install", "--frozen-lockfile"], {
    cwd: testDir,
    env: { ...process.env, npm_config_registry: registry },
  });
  if (process.env.MSM_INSTALL_BROWSER === "1") {
    run("pnpm", ["exec", "playwright", "install", "--with-deps", "chromium"], {
      cwd: testDir,
    });
  }
  return run("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)], {
    allowFailure: true,
    cwd: testDir,
    env: environment,
  });
};

try {
  let baseURL = process.env.BASE_URL;
  let databaseURL = process.env.DATABASE_URL;

  if (!baseURL) {
    if (process.env.LOBE_CHAT_IMAGE_ARCHIVE) {
      loadImageArchive(process.env.LOBE_CHAT_IMAGE_ARCHIVE);
    }
    const image = process.env.LOBE_CHAT_IMAGE ?? prepareLocalImage();

    const databasePort = process.env.MSM_POSTGRES_PORT ?? "5433";
    const appPort = process.env.MSM_APP_PORT ?? "33210";
    databaseURL = `postgresql://postgres:postgres@127.0.0.1:${databasePort}/postgres`;
    run("docker", [
      "run",
      "-d",
      "--name",
      postgresName,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${databasePort}:5432`,
      process.env.MSM_POSTGRES_IMAGE ?? "paradedb/paradedb:latest",
    ]);
    startedContainers.push(postgresName);
    waitForPostgres(postgresName);

    baseURL = `http://localhost:${appPort}`;
    run("docker", [
      "run",
      "-d",
      "--name",
      appName,
      "--network",
      "host",
      "-e",
      `APP_URL=${baseURL}`,
      "-e",
      "AUTH_EMAIL_VERIFICATION=0",
      "-e",
      "AUTH_SECRET=e2e-test-secret-key-for-better-auth-32chars!",
      "-e",
      "DATABASE_DRIVER=node",
      "-e",
      `DATABASE_URL=${databaseURL}`,
      "-e",
      "KEY_VAULTS_SECRET=LA7n9k3JdEcbSgml2sxfw+4TV1AzaaFU5+R176aQz4s=",
      "-e",
      "OPENAI_API_KEY=msm-test-key",
      "-e",
      `OPENAI_PROXY_URL=http://127.0.0.1:${process.env.MSM_OPENAI_STUB_PORT ?? "4010"}/v1`,
      "-e",
      `PORT=${appPort}`,
      "-e",
      "S3_ACCESS_KEY_ID=e2e-mock-access-key",
      "-e",
      "S3_BUCKET=e2e-mock-bucket",
      "-e",
      "S3_ENDPOINT=https://e2e-mock-s3.invalid",
      "-e",
      "S3_SECRET_ACCESS_KEY=e2e-mock-secret-key",
      image,
    ]);
    startedContainers.push(appName);
  }

  const result = runTests({
    ...process.env,
    BASE_URL: baseURL,
    DATABASE_URL: databaseURL,
    MSM_PROVIDER_INTEGRATION: process.env.MSM_PROVIDER_INTEGRATION ?? "1",
  });

  if (result.status !== 0 && startedContainers.includes(appName)) {
    run("docker", ["logs", appName], { allowFailure: true });
  }
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error);
  if (startedContainers.includes(appName)) {
    run("docker", ["logs", appName], { allowFailure: true });
  }
  process.exitCode = 1;
} finally {
  cleanup();
}
