// @vitest-environment node
import { DEFAULT_OPENAI_TIMEOUT } from '@lobechat/model-runtime';
import { describe, expect, it, vi } from 'vitest';

const createSsrfSafeFetch = vi.hoisted(() => vi.fn(() => vi.fn()));

vi.mock('@lobechat/ssrf-safe-fetch', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createSsrfSafeFetch,
}));

describe('msm user endpoint guard timeout', () => {
  it('gives guarded model connections the same one-hour idle timeouts as the global dispatcher', async () => {
    const { createUserEndpointGuardedRuntime } = await import('./userEndpointGuard');

    createUserEndpointGuardedRuntime({
      create: () => ({}),
      endpoints: ['http://127.0.0.1:1/v1'],
      provider: 'msm-test',
    });

    expect(DEFAULT_OPENAI_TIMEOUT).toBe(3_600_000);
    expect(createSsrfSafeFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ timeout: DEFAULT_OPENAI_TIMEOUT }),
    );
  });
});
