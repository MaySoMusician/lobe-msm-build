// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_OPENAI_TIMEOUT, resolveOpenAIClientNetworkOptions } from './timeout';

describe('msm openai timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__;
  });

  afterEach(() => {
    delete (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__;
    vi.restoreAllMocks();
  });

  it('uses a 1-hour default timeout', () => {
    expect(DEFAULT_OPENAI_TIMEOUT).toBe(3_600_000);
  });

  it('applies undici Agent body/headers timeouts from the default', () => {
    const Agent = vi.fn(function MockAgent(this: unknown, options?: unknown) {
      return { options };
    });
    const fetch = vi.fn();

    (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__ = {
      Agent,
      fetch,
    };

    const result = resolveOpenAIClientNetworkOptions();

    expect(Agent).toHaveBeenCalledWith({
      bodyTimeout: DEFAULT_OPENAI_TIMEOUT,
      headersTimeout: DEFAULT_OPENAI_TIMEOUT,
    });
    expect(result.timeout).toBe(DEFAULT_OPENAI_TIMEOUT);
    expect(result.fetch).toBe(fetch);
    expect(result.fetchOptions?.dispatcher).toEqual({
      options: {
        bodyTimeout: DEFAULT_OPENAI_TIMEOUT,
        headersTimeout: DEFAULT_OPENAI_TIMEOUT,
      },
    });
  });

  it('honors an explicit timeout override with undici Agent', () => {
    const Agent = vi.fn(function MockAgent(this: unknown, options?: unknown) {
      return { options };
    });
    const fetch = vi.fn();

    (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__ = {
      Agent,
      fetch,
    };

    const result = resolveOpenAIClientNetworkOptions(12_000);

    expect(Agent).toHaveBeenCalledWith({
      bodyTimeout: 12_000,
      headersTimeout: 12_000,
    });
    expect(result.timeout).toBe(12_000);
  });
});
