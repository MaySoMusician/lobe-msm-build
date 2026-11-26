import pg from 'pg';

import { TEST_USER } from './globalSetup.js';

const withClient = async <T>(run: (client: pg.Client) => Promise<T>): Promise<T> => {
  const databaseURL = process.env.DATABASE_URL;
  if (!databaseURL) {
    throw new Error('DATABASE_URL is required to seed behavior-test state');
  }

  const client = new pg.Client({ connectionString: databaseURL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
};

/**
 * Merge `patch` into the test user's `user_settings.general` after dropping
 * `removeKeys`, so a test can return a setting to "never chosen".
 */
export const updateGeneralSettings = (
  patch: Record<string, unknown>,
  removeKeys: string[] = [],
): Promise<void> =>
  withClient(async (client) => {
    await client.query(
      `INSERT INTO user_settings (id, general)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE
       SET general = (COALESCE(user_settings.general, '{}'::jsonb) - $3::text[]) || EXCLUDED.general`,
      [TEST_USER.id, JSON.stringify(patch), removeKeys],
    );
  });

type InboxColumn = 'chat_config' | 'plugins' | 'system_role';

/**
 * The test user's inbox agent row is created on the first inbox visit, so a
 * test opens the inbox once before reading it; wait briefly for that write.
 */
const readInboxColumn = <T>(column: InboxColumn): Promise<T | null> =>
  withClient(async (client) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const { rows } = await client.query<{ value: T | null }>(
        `SELECT ${column} AS value FROM agents WHERE user_id = $1 AND slug = 'inbox' LIMIT 1`,
        [TEST_USER.id],
      );
      if (rows.length > 0) {
        return rows[0].value;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('The test user has no inbox agent yet');
  });

const writeInboxColumn = (column: InboxColumn, value: unknown): Promise<void> =>
  withClient(async (client) => {
    const result = await client.query(
      `UPDATE agents SET ${column} = $2::jsonb WHERE user_id = $1 AND slug = 'inbox'`,
      [TEST_USER.id, value === null || value === undefined ? null : JSON.stringify(value)],
    );
    if (result.rowCount === 0) {
      throw new Error('The test user has no inbox agent yet');
    }
  });

/** The inbox agent's `plugins` entries, or `null` when the column is empty. */
export const readInboxPlugins = () => readInboxColumn<unknown[]>('plugins');
export const writeInboxPlugins = (plugins: unknown[] | null) =>
  writeInboxColumn('plugins', plugins);

/** The inbox agent's stored prompt, or `null` when it has none. */
export const readInboxSystemRole = () => readInboxColumn<string>('system_role');

/** The inbox agent's `chat_config`, or `null` when the column is empty. */
export const readInboxChatConfig = () => readInboxColumn<Record<string, unknown>>('chat_config');
export const writeInboxChatConfig = (chatConfig: Record<string, unknown> | null) =>
  writeInboxColumn('chat_config', chatConfig);
