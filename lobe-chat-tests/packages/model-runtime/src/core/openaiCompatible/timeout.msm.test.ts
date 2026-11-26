// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyOpenAIClientNetworkDefaults,
  DEFAULT_OPENAI_TIMEOUT,
  resolveOpenAIClientNetworkOptions,
} from './timeout';

type UndiciGlobal = typeof globalThis & { __LOBE_UNDICI__?: unknown };

const installInstrumentationUndici = () => {
  const Agent = vi.fn(function MockAgent(this: unknown, options?: unknown) {
    return { options };
  });
  const fetch = vi.fn();
  (globalThis as UndiciGlobal).__LOBE_UNDICI__ = { Agent, fetch };
  return { Agent, fetch };
};

describe('msm openai timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as UndiciGlobal).__LOBE_UNDICI__;
  });

  afterEach(() => {
    delete (globalThis as UndiciGlobal).__LOBE_UNDICI__;
    vi.restoreAllMocks();
  });

  it('uses a 1-hour default timeout', () => {
    expect(DEFAULT_OPENAI_TIMEOUT).toBe(3_600_000);
  });

  describe('with the instrumentation undici fetch installed', () => {
    it('keeps the client on the global fetch so the SSRF guard still wraps it', () => {
      const { Agent } = installInstrumentationUndici();

      const result = resolveOpenAIClientNetworkOptions();

      expect(result).toEqual({ timeout: DEFAULT_OPENAI_TIMEOUT });
      expect(Agent).not.toHaveBeenCalled();
    });

    it('still honors an explicit timeout', () => {
      installInstrumentationUndici();

      expect(resolveOpenAIClientNetworkOptions(12_000)).toEqual({ timeout: 12_000 });
    });
  });

  describe('without the instrumentation (tests, scripts)', () => {
    it('falls back to an explicit undici fetch with a matching dispatcher', () => {
      const result = resolveOpenAIClientNetworkOptions(12_000);

      expect(result.timeout).toBe(12_000);
      expect(typeof result.fetch).toBe('function');
      expect(result.fetchOptions?.dispatcher).toBeDefined();
    });
  });

  describe('applyOpenAIClientNetworkDefaults', () => {
    it('forces one attempt and the one-hour timeout without pinning the global fetch', () => {
      installInstrumentationUndici();

      const options = applyOpenAIClientNetworkDefaults({ apiKey: 'k', maxRetries: 3 });

      expect(options).toMatchObject({ apiKey: 'k', maxRetries: 0, timeout: DEFAULT_OPENAI_TIMEOUT });
      expect(options).not.toHaveProperty('fetch');
      expect(options).not.toHaveProperty('fetchOptions');
    });

    it('takes the first numeric timeout candidate and keeps a caller fetch', () => {
      const callerFetch = vi.fn();

      const options = applyOpenAIClientNetworkDefaults({ fetch: callerFetch, timeout: 'x' }, [
        undefined,
        'x',
        45_000,
        90_000,
      ]);

      expect(options.timeout).toBe(45_000);
      expect(options.fetch).toBe(callerFetch);
    });
  });
});
