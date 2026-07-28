import { describe, expect, it } from 'vitest';

import { alwaysOnToolIds } from './index';

describe('msm alwaysOnToolIds', () => {
  it('keeps always-on tools empty', () => {
    expect(alwaysOnToolIds).toEqual([]);
  });
});
