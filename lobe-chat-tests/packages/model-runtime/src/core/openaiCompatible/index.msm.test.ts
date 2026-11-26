// @vitest-environment node
import type { ChatStreamPayload } from '@lobechat/types';
import OpenAI from 'openai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createOpenAICompatibleRuntime } from './index';
import { DEFAULT_OPENAI_TIMEOUT } from './timeout';

type UndiciGlobal = typeof globalThis & { __LOBE_UNDICI__?: unknown };

describe('msm openaiCompatible', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives a client rebuilt for a per-model base URL the same one-attempt, one-hour defaults on the global fetch', async () => {
    const undiciFetch = vi.fn() as unknown as typeof fetch;
    (globalThis as UndiciGlobal).__LOBE_UNDICI__ = {
      Agent: vi.fn(function MockAgent() {
        return {};
      }),
      fetch: undiciFetch,
    };

    try {
      const create = vi.fn().mockResolvedValue({
        choices: [
          {
            finish_reason: 'stop',
            index: 0,
            logprobs: null,
            message: { content: 'hello', role: 'assistant' },
          },
        ],
        created: 1,
        id: 'chatcmpl-msm-rebuild',
        model: 'test-model',
        object: 'chat.completion',
      });
      const createClient = vi.fn((options: { baseURL: string }) => ({
        baseURL: options.baseURL,
        chat: { completions: { create } },
      }));

      const Runtime = createOpenAICompatibleRuntime({
        baseURL: 'https://example.com/v1',
        chatCompletion: {
          // Retarget this model at another endpoint, the way Spark's per-model URLs do.
          handlePayload: (payload: ChatStreamPayload, options: any) => {
            options.baseURL = 'https://other.example.com/v2';
            return { messages: payload.messages, model: payload.model, stream: false } as any;
          },
        },
        customClient: { createClient: createClient as any },
        provider: 'msm-test',
      });

      const runtime = new Runtime({ apiKey: 'test', maxRetries: 5 });
      await runtime.chat({
        messages: [{ content: 'Hi', role: 'user' }],
        model: 'test-model',
        stream: true,
        temperature: 0,
      });

      expect(createClient).toHaveBeenCalledTimes(2);
      const rebuilt = createClient.mock.calls[1][0] as Record<string, any>;
      expect(rebuilt).toMatchObject({
        baseURL: 'https://other.example.com/v2',
        maxRetries: 0,
        timeout: DEFAULT_OPENAI_TIMEOUT,
      });
      // The instrumentation fetch is global: the client must not pin it, or the
      // server's SSRF guard (which wraps globalThis.fetch) would be bypassed.
      expect(rebuilt.fetch).toBeUndefined();
      expect(rebuilt.fetchOptions).toBeUndefined();
    } finally {
      delete (globalThis as UndiciGlobal).__LOBE_UNDICI__;
    }
  });

  it('keeps a caller timeout on a rebuilt client', async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [
        { finish_reason: 'stop', index: 0, logprobs: null, message: { content: 'ok', role: 'assistant' } },
      ],
      created: 1,
      id: 'chatcmpl-msm-timeout',
      model: 'test-model',
      object: 'chat.completion',
    });
    const createClient = vi.fn((options: { baseURL: string }) => ({
      baseURL: options.baseURL,
      chat: { completions: { create } },
    }));

    const Runtime = createOpenAICompatibleRuntime({
      baseURL: 'https://example.com/v1',
      chatCompletion: {
        handlePayload: (payload: ChatStreamPayload, options: any) => {
          options.baseURL = 'https://other.example.com/v2';
          return { messages: payload.messages, model: payload.model, stream: false } as any;
        },
      },
      customClient: { createClient: createClient as any },
      provider: 'msm-test',
    });

    const runtime = new Runtime({ apiKey: 'test', timeout: 120_000 });
    await runtime.chat({ messages: [{ content: 'Hi', role: 'user' }], model: 'test-model', temperature: 0 });

    expect(createClient.mock.calls[0][0]).toMatchObject({ maxRetries: 0, timeout: 120_000 });
    expect(createClient.mock.calls[1][0]).toMatchObject({ maxRetries: 0, timeout: 120_000 });
  });

  it('sends a Responses request non-streaming when responses.handlePayload says stream:false', async () => {
    const nonStreamResponse = {
      id: 'resp_msm',
      object: 'response',
      output: [
        {
          content: [{ annotations: [], text: 'hello', type: 'output_text' }],
          id: 'msg_1',
          role: 'assistant',
          status: 'completed',
          type: 'message',
        },
      ],
      status: 'completed',
      usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
    };
    const create = vi.fn().mockResolvedValue(nonStreamResponse);

    const Runtime = createOpenAICompatibleRuntime({
      baseURL: 'https://example.com/v1',
      chatCompletion: { useResponse: true },
      customClient: {
        createClient: () => ({ baseURL: 'https://example.com/v1', responses: { create } }) as any,
      },
      provider: 'msm-test',
      responses: {
        handlePayload: (payload: ChatStreamPayload) => ({ ...payload, stream: false }) as any,
      },
    });

    const runtime = new Runtime({ apiKey: 'test' });
    const result = await runtime.chat({
      messages: [{ content: 'Hi', role: 'user' }],
      model: 'gpt-5.6-sol',
      stream: true,
    });
    const body = await result.text();

    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].stream).toBeFalsy();
    expect(body).toContain('hello');
  });

  it('forces maxRetries to 0 on client construction', () => {
    const createClient = vi.fn(() => ({
      baseURL: 'https://example.com/v1',
      chat: { completions: { create: vi.fn() } },
    }));

    const Runtime = createOpenAICompatibleRuntime({
      baseURL: 'https://example.com/v1',
      customClient: { createClient },
      provider: 'msm-test',
    });

    new Runtime({ apiKey: 'test', maxRetries: 5 });

    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0 }));
  });

  it('does not overwrite a caller-supplied custom fetch', () => {
    const customFetch = vi.fn() as unknown as typeof fetch;
    const createClient = vi.fn(() => ({
      baseURL: 'https://example.com/v1',
      chat: { completions: { create: vi.fn() } },
    }));

    (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__ = {
      Agent: vi.fn(function MockAgent() {
        return {};
      }),
      fetch: vi.fn(),
    };

    try {
      const Runtime = createOpenAICompatibleRuntime({
        baseURL: 'https://example.com/v1',
        customClient: { createClient },
        provider: 'msm-test',
      });

      new Runtime({ apiKey: 'test', fetch: customFetch });

      expect(createClient).toHaveBeenCalledWith(
        expect.objectContaining({ fetch: customFetch, maxRetries: 0 }),
      );
      expect(createClient.mock.calls[0][0].fetch).toBe(customFetch);
    } finally {
      delete (globalThis as typeof globalThis & { __LOBE_UNDICI__?: unknown }).__LOBE_UNDICI__;
    }
  });

  it('uses stream flag from handled payload rather than the pre-handle value', async () => {
    const handlePayload = vi.fn((payload: ChatStreamPayload) => ({
      messages: payload.messages,
      model: payload.model,
      stream: false,
    }));

    const Runtime = createOpenAICompatibleRuntime({
      baseURL: 'https://example.com/v1',
      chatCompletion: { handlePayload },
      provider: 'msm-test',
    });

    const runtime = new Runtime({ apiKey: 'test' });
    const nonStreamResponse = {
      choices: [
        {
          finish_reason: 'stop',
          index: 0,
          logprobs: null,
          message: { content: 'hello', role: 'assistant' },
        },
      ],
      created: 1,
      id: 'chatcmpl-msm',
      model: 'test-model',
      object: 'chat.completion',
    } as OpenAI.ChatCompletion;

    const create = vi
      .spyOn(runtime['client'].chat.completions, 'create')
      .mockResolvedValue(nonStreamResponse as any);

    const result = await runtime.chat({
      messages: [{ content: 'Hi', role: 'user' }],
      model: 'test-model',
      stream: true,
      temperature: 0,
    });

    expect(handlePayload).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ stream: false }),
      expect.anything(),
    );
    expect(result).toBeInstanceOf(Response);
    expect(result.headers.get('content-type')).toContain('text/event-stream');
  });
});
