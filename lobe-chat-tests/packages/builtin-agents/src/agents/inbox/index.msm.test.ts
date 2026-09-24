import { describe, expect, it } from 'vitest';

import { INBOX } from './index';

describe('msm INBOX agent', () => {
  it('uses an empty systemRole when none was explicitly stored', () => {
    expect(INBOX.runtime({}).systemRole).toBe('');
  });

  it('preserves an explicitly stored systemRole', () => {
    expect(INBOX.runtime({ storedSystemRole: 'My custom prompt' }).systemRole).toBe(
      'My custom prompt',
    );
  });
});
