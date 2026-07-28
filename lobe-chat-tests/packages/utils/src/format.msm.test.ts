import { describe, expect, it } from 'vitest';

import { formatUsageValue } from './format';

describe('msm formatUsageValue', () => {
  it('formats token usage with exact thousands separators (no K/M/B abbreviations)', () => {
    expect(formatUsageValue(93_405)).toBe('93,405');
    expect(formatUsageValue(93_405)).not.toBe('93.4K');
    expect(formatUsageValue(1_000_000)).toBe('1,000,000');
    expect(formatUsageValue(1_000_000)).not.toBe('1M');
    expect(formatUsageValue(1_000_000_000)).toBe('1,000,000,000');
    expect(formatUsageValue(1_000_000_000)).not.toBe('1B');
  });
});
