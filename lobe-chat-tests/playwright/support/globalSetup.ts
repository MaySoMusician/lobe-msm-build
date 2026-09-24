import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { request, type FullConfig } from '@playwright/test';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultAuthState = path.join(rootDir, '.auth', 'user.json');

export const TEST_USER = {
  email: 'msm-behavior@lobehub.com',
  fullName: 'MSM Behavior Test',
  id: 'user_msm_behavior',
  password: 'MsmBehaviorTest123!',
  username: 'msm_behavior',
};

const waitForApplication = async (baseURL: string) => {
  const deadline = Date.now() + 120_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseURL, { redirect: 'manual' });
      if (response.status < 500) {
        return;
      }
      lastError = new Error(`Application returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Application did not become ready at ${baseURL}`, { cause: lastError });
};

const seedTestUser = async (databaseURL: string) => {
  const client = new pg.Client({ connectionString: databaseURL });
  await client.connect();

  try {
    const now = new Date().toISOString();
    const password = await bcrypt.hash(TEST_USER.password, 10);
    const onboarding = JSON.stringify({ finishedAt: now, version: 1 });

    await client.query(
      `INSERT INTO users
        (id, email, normalized_email, username, full_name, email_verified, onboarding,
         created_at, updated_at, last_active_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7, $7, $7)
       ON CONFLICT (id) DO UPDATE
       SET onboarding = EXCLUDED.onboarding, updated_at = EXCLUDED.updated_at`,
      [
        TEST_USER.id,
        TEST_USER.email,
        TEST_USER.email.toLowerCase(),
        TEST_USER.username,
        TEST_USER.fullName,
        onboarding,
        now,
      ],
    );

    await client.query(
      `INSERT INTO accounts
        (id, user_id, account_id, provider_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, 'credential', $4, $5, $5)
       ON CONFLICT (id) DO UPDATE
       SET password = EXCLUDED.password, updated_at = EXCLUDED.updated_at`,
      ['account_msm_behavior', TEST_USER.id, TEST_USER.email, password, now],
    );
  } finally {
    await client.end();
  }
};

export default async function globalSetup(config: FullConfig) {
  const baseURL = String(config.projects[0]?.use.baseURL);
  const authState = process.env.MSM_AUTH_STORAGE_STATE ?? defaultAuthState;

  if (process.env.MSM_AUTH_STORAGE_STATE) {
    await stat(authState);
    await waitForApplication(baseURL);
    return;
  }

  await mkdir(path.dirname(authState), { recursive: true });
  await waitForApplication(baseURL);

  if (process.env.MSM_SKIP_AUTH === '1') {
    await writeFile(authState, JSON.stringify({ cookies: [], origins: [] }, null, 2));
    return;
  }

  const databaseURL = process.env.DATABASE_URL;
  if (!databaseURL) {
    throw new Error(
      'DATABASE_URL is required to seed the standalone behavior-test user; ' +
        'set MSM_AUTH_STORAGE_STATE to reuse an existing authenticated session',
    );
  }

  await seedTestUser(databaseURL);

  const api = await request.newContext({ baseURL });
  try {
    const response = await api.post('/api/auth/sign-in/email', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    });

    if (!response.ok()) {
      throw new Error(`Authentication failed: ${response.status()} ${await response.text()}`);
    }

    await api.storageState({ path: authState });
  } finally {
    await api.dispose();
  }
}
