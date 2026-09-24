import { describe, expect, it } from 'vitest';

import { pruneReasoningPayload } from '../../core/contextBuilders/openai';
import { params } from './index';

const payload = (model: string) =>
  ({
    messages: [{ content: 'hello', role: 'user' }],
    model,
    stream: true,
  }) as any;

describe('msm OpenAI GPT streaming policy', () => {
  it.each(['gpt-3.5-turbo', 'gpt-4o'])(
    'disables streaming without forcing legacy model %s to Responses',
    (model) => {
      const result = params.chatCompletion.handlePayload!(payload(model), {} as any) as any;

      expect(result.apiMode).not.toBe('responses');
      expect(result.stream).toBe(false);
    },
  );

  it.each(['gpt-5', 'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna'])(
    'routes %s through non-streaming Responses',
    (model) => {
      const routed = params.chatCompletion.handlePayload!(payload(model), {} as any) as any;
      expect(routed.apiMode).toBe('responses');

      const responsePayload = params.responses!.handlePayload!(payload(model), {} as any) as any;
      expect(responsePayload.stream).toBe(false);
    },
  );

  it('does not apply the OpenAI-provider-wide GPT rule in the shared compatible builder', () => {
    expect(pruneReasoningPayload(payload('gpt-4o')).stream).toBe(true);
  });
});
