import { describe, expect, it } from 'vitest';

import { disableStreamModels, isResponsesAPIModel } from './modelId';

describe('msm openai GPT model registrations', () => {
  const representativeIds = [
    'gpt-5',
    'gpt-5.2',
    'gpt-5.4',
    'gpt-5-mini',
    'gpt-5.2-pro',
    'gpt-6-astra',
    'gpt-6-sol',
    'gpt-6-luna',
  ] as const;

  it('disables streaming for registered GPT-5 and GPT-6 ids', () => {
    for (const id of representativeIds) {
      expect(disableStreamModels.has(id)).toBe(true);
    }
  });

  it('allowlists registered GPT-5 and GPT-6 ids for Responses API', () => {
    for (const id of representativeIds) {
      expect(isResponsesAPIModel(id)).toBe(true);
    }
  });
});
