// @vitest-environment node
import type { ChatStreamPayload } from '@lobechat/types';
import OpenAI from 'openai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createOpenAICompatibleRuntime } from './index';

describe('msm openaiCompatibleFactory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
