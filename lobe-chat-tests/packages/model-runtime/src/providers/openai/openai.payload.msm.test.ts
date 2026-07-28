import { describe, expect, it } from 'vitest';

import { params } from './index';

describe('msm openai responses payload', () => {
  it('forces reasoning.summary to undefined for reasoning models', () => {
    const result = params.responses!.handlePayload!(
      {
        messages: [{ content: 'hi', role: 'user' }],
        model: 'o3',
        reasoning: { effort: 'medium', summary: 'auto' },
        stream: true,
      } as any,
      {} as any,
    );

    expect(result).toMatchObject({
      reasoning: { effort: 'medium', summary: undefined },
    });
    expect((result as any).reasoning.summary).toBeUndefined();
  });
});
