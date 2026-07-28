import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('msm qstash lazy init', () => {
  const originalToken = process.env.QSTASH_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.QSTASH_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.QSTASH_TOKEN;
    } else {
      process.env.QSTASH_TOKEN = originalToken;
    }
    vi.resetModules();
  });

  it(
    'imports without requiring QSTASH_TOKEN and throws clearly on first use',
    async () => {
      const mod = await import('./index');

      expect(mod.qstashClient).toBeTruthy();
      expect(() => {
        void (mod.qstashClient as any).token;
      }).toThrow(/QSTASH_TOKEN is required/);
    },
    15_000,
  );
});
