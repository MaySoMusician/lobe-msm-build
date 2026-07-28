import { describe, expect, it } from 'vitest';

import { disableStreamModels, isResponsesAPIModel } from './modelId';

describe('msm openai modelId gpt-5 family', () => {
  const representativeIds = ['gpt-5', 'gpt-5.2', 'gpt-5.4', 'gpt-5-mini', 'gpt-5.2-pro'] as const;

  it('disables streaming for representative gpt-5 family ids', () => {
    for (const id of representativeIds) {
      expect(disableStreamModels.has(id)).toBe(true);
    }
  });

  it('allowlists representative gpt-5 family ids for Responses API', () => {
    for (const id of representativeIds) {
      expect(isResponsesAPIModel(id)).toBe(true);
    }
  });
});
