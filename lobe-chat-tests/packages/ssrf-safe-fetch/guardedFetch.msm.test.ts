// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const Agent = vi.hoisted(() =>
  vi.fn(function MockAgent(this: unknown, options?: unknown) {
    return { options };
  }),
);

vi.mock('undici', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Agent,
}));

describe('msm createSsrfSafeDispatcher timeouts', () => {
  it('applies the given headers/body idle timeouts', async () => {
    const { createSsrfSafeDispatcher } = await import('./guardedFetch');

    createSsrfSafeDispatcher({}, 3_600_000);

    expect(Agent).toHaveBeenLastCalledWith(
      expect.objectContaining({ bodyTimeout: 3_600_000, headersTimeout: 3_600_000 }),
    );
  });

  it("keeps undici's defaults when no timeout is given", async () => {
    const { createSsrfSafeDispatcher } = await import('./guardedFetch');

    createSsrfSafeDispatcher({});

    const options = Agent.mock.lastCall?.[0] as Record<string, unknown>;
    expect(options).not.toHaveProperty('bodyTimeout');
    expect(options).not.toHaveProperty('headersTimeout');
  });

  it('passes the createSsrfSafeFetch timeout to its dispatcher', async () => {
    const { createSsrfSafeFetch } = await import('./guardedFetch');

    createSsrfSafeFetch({ allowPrivateIPAddress: false }, { timeout: 12_000 });

    expect(Agent).toHaveBeenLastCalledWith(
      expect.objectContaining({ bodyTimeout: 12_000, headersTimeout: 12_000 }),
    );
  });
});
