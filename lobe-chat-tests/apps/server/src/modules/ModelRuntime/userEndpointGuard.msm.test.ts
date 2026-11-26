// @vitest-environment node
import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { AgentRuntimeErrorType } from '@lobechat/types';
import { ModelProvider } from 'model-bank';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * MSM keeps OpenAI-compatible clients on the global fetch that
 * `src/instrumentation.ts` installs (undici with a one-hour dispatcher), so the
 * upstream SSRF guard for user-supplied endpoints — which wraps
 * `globalThis.fetch` — still sees every request. Install undici exactly as the
 * instrumentation does before the runtime module loads, then drive real
 * requests against a loopback model server.
 */
type UndiciGlobal = typeof globalThis & { __LOBE_UNDICI__?: unknown };

const edition = vi.hoisted(() => ({ cloud: false }));

vi.mock('@lobechat/business-const', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  get ENABLE_BUSINESS_FEATURES() {
    return edition.cloud;
  },
}));

vi.mock('@/envs/llm', () => ({ getLLMConfig: vi.fn(() => ({ OPENAI_API_KEY: 'env-key' })) }));
vi.mock('@/server/globalConfig', () => ({ getServerAiProviderConfig: vi.fn() }));

let hits: string[] = [];
let server: http.Server;
let baseURL: string;
let nodeFetch: typeof fetch;
let initModelRuntimeWithUserPayload: typeof import('./index').initModelRuntimeWithUserPayload;

const sseCompletion = [
  'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"m","choices":[{"index":0,"delta":{"role":"assistant","content":"hi from loopback"},"finish_reason":null}]}',
  'data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"m","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
  'data: [DONE]',
  '',
].join('\n\n');

beforeAll(async () => {
  const undici = await import('undici');
  undici.setGlobalDispatcher(
    new undici.Agent({ bodyTimeout: 3_600_000, headersTimeout: 3_600_000 }),
  );
  nodeFetch = globalThis.fetch;
  globalThis.fetch = undici.fetch as unknown as typeof fetch;
  (globalThis as UndiciGlobal).__LOBE_UNDICI__ = undici;

  ({ initModelRuntimeWithUserPayload } = await import('./index'));

  server = http.createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);

    if (req.url?.startsWith('/redirect')) {
      res.writeHead(307, { location: 'http://169.254.169.254/latest/meta-data/' });
      return res.end();
    }

    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.end(sseCompletion);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  globalThis.fetch = nodeFetch;
  delete (globalThis as UndiciGlobal).__LOBE_UNDICI__;
});

afterEach(() => {
  hits = [];
  edition.cloud = false;
  vi.unstubAllEnvs();
});

const chat = (endpoint: string) =>
  initModelRuntimeWithUserPayload(ModelProvider.OpenAI, {
    apiKey: 'user-key',
    baseURL: endpoint,
  }).chat({
    messages: [{ content: 'hello', role: 'user' }],
    model: 'local-model',
    stream: true,
    temperature: 0,
  });

describe('msm SSRF guard with the instrumentation undici fetch', () => {
  it('cloud refuses a loopback endpoint; the server is never contacted', async () => {
    edition.cloud = true;

    await expect(chat(baseURL)).rejects.toMatchObject({
      errorType: AgentRuntimeErrorType.ProviderBaseURLBlocked,
    });
    expect(hits).toEqual([]);
  });

  it('self-hosted refuses a redirect to the metadata address', async () => {
    await expect(chat(baseURL.replace('/v1', '/redirect/v1'))).rejects.toMatchObject({
      errorType: AgentRuntimeErrorType.ProviderBaseURLBlocked,
    });
    expect(hits).toEqual(['POST /redirect/v1/chat/completions']);
  });

  it('self-hosted still streams from an allowed private endpoint', async () => {
    const response = await chat(baseURL);

    expect(await response.text()).toContain('hi from loopback');
    expect(hits).toEqual(['POST /v1/chat/completions']);
  });
});
