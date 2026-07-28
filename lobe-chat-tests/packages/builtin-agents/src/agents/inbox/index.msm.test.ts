import { describe, expect, it } from 'vitest';

import { INBOX } from './index';

describe('msm INBOX agent', () => {
  it('uses an empty systemRole', () => {
    expect(INBOX.runtime({}).systemRole).toBe('');
  });
});
