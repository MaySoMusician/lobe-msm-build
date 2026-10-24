import { Client } from '@upstash/qstash';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('msm qstash failed-request logging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not log response headers or body when a publish fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('msm-failure-body', {
            headers: { 'x-msm-secret': 'msm-secret-header' },
            status: 400,
          }),
      ),
    );
    const logged: unknown[][] = [];
    for (const method of ['error', 'warn', 'log', 'info', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args);
      });
    }

    const client = new Client({
      baseUrl: 'https://qstash.invalid',
      retry: false,
      token: 'msm-test-token',
    });

    await expect(
      client.publishJSON({ body: { ok: true }, url: 'https://example.com/hook' }),
    ).rejects.toThrow(/msm-failure-body/);

    const output = logged.map((args) => args.map(String).join(' ')).join('\n');
    expect(output).not.toContain('msm-secret-header');
    expect(output).not.toContain('msm-failure-body');
  });
});
