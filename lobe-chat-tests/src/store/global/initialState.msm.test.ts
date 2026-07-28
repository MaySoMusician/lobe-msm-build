import { describe, expect, it } from 'vitest';

import { MODEL_DETAIL_PANEL_EXPANDABLE_KEYS } from './initialState';

describe('msm MODEL_DETAIL_PANEL_EXPANDABLE_KEYS', () => {
  it('defaults expandable sections to config only', () => {
    expect(MODEL_DETAIL_PANEL_EXPANDABLE_KEYS).toEqual(['config']);
    expect(MODEL_DETAIL_PANEL_EXPANDABLE_KEYS).not.toContain('rating');
    expect(MODEL_DETAIL_PANEL_EXPANDABLE_KEYS).not.toContain('abilities');
    expect(MODEL_DETAIL_PANEL_EXPANDABLE_KEYS).not.toContain('pricing');
  });
});
