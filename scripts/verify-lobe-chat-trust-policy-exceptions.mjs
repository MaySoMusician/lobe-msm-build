import fs from "node:fs/promises";

const registry =
  process.env.NPM_CANONICAL_REGISTRY ?? "https://registry.npmjs.org";
const policyFile = process.argv[2] ?? "scripts/trust-policy-exceptions.json";

const items = JSON.parse(await fs.readFile(policyFile, "utf8"));

function encodePackageName(name) {
  // npm registry path encoding for scoped packages
  return name.startsWith("@") ? name.replace("/", "%2f") : name;
}

async function fetchPackument(name) {
  const res = await fetch(`${registry}/${encodePackageName(name)}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch metadata for ${name}: ${res.status} ${res.statusText}`,
    );
  }
  return res.json();
}

const errors = [];

for (const item of items) {
  const { name, version, publishedAt, integrity, tarballHost, expiresOn } =
    item;

  if (!name || !version) {
    errors.push(
      `Invalid policy entry: missing name/version: ${JSON.stringify(item)}`,
    );
    continue;
  }

  if (expiresOn && new Date(expiresOn) < new Date()) {
    errors.push(
      `Expired exception: ${name}@${version} (expiresOn=${expiresOn})`,
    );
    continue;
  }

  let meta;
  try {
    meta = await fetchPackument(name);
  } catch (err) {
    errors.push(String(err));
    continue;
  }

  const actualVersionedInfo = meta?.versions?.[version];
  const actualPublishedAt = meta?.time?.[version];
  const actualDist = actualVersionedInfo?.dist ?? {};
  const actualIntegrity = actualDist?.integrity;
  const actualTarball = actualDist?.tarball;
  const actualTarballHost = actualTarball ? new URL(actualTarball).host : null;

  if (!actualVersionedInfo) {
    errors.push(`Missing version in registry metadata: ${name}@${version}`);
    continue;
  }

  if (publishedAt && actualPublishedAt !== publishedAt) {
    errors.push(
      `Publish time mismatch for ${name}@${version}: expected=${publishedAt} actual=${actualPublishedAt}`,
    );
  }

  if (integrity && actualIntegrity !== integrity) {
    errors.push(
      `Integrity mismatch for ${name}@${version}: expected=${integrity} actual=${actualIntegrity}`,
    );
  }

  if (tarballHost && actualTarballHost !== tarballHost) {
    errors.push(
      `Tarball host mismatch for ${name}@${version}: expected=${tarballHost} actual=${actualTarballHost}`,
    );
  }
}

if (errors.length > 0) {
  console.error("Trust-policy exception verification failed:\n");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log(
  `Verified ${items.length} trust-policy exception(s) against ${registry}`,
);
