import { describe, expect, it } from 'vitest';

import { isModifierClick } from './navigation';

describe('msm isModifierClick', () => {
  it('detects ctrl and meta modifier clicks on web', () => {
    expect(isModifierClick({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isModifierClick({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isModifierClick({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});
