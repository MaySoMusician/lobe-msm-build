import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/globalConfig/parseMemoryExtractionConfig', () => ({
  parseMemoryExtractionConfig: () => ({
    upstashWorkflowExtraHeaders: { 'x-test-header': '1' },
  }),
}));

describe('msm createWorkflowQstashClient lazy init', () => {
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
    'returns a client without QSTASH_TOKEN and throws clearly on first use',
    async () => {
      const { createWorkflowQstashClient } = await import('./qstashClient');

      let client: ReturnType<typeof createWorkflowQstashClient>;
      expect(() => {
        client = createWorkflowQstashClient();
      }).not.toThrow();

      expect(client!).toBeTruthy();
      expect(() => {
        void (client as any).token;
      }).toThrow(/QSTASH_TOKEN is required for Upstash Workflow routes/);
    },
    15_000,
  );
});
