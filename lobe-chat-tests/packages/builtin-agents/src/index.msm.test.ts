import { describe, expect, it } from 'vitest';

import { getAgentRuntimeConfig } from './index';
import { BUILTIN_AGENT_SLUGS } from './types';

describe('msm getAgentRuntimeConfig reply language', () => {
  const slugs = Object.values(BUILTIN_AGENT_SLUGS).filter(
    (slug) => slug !== BUILTIN_AGENT_SLUGS.webOnboarding,
  );

  it.each(slugs)('appends no reply-language line to %s, even with a chosen language', (slug) => {
    const withLocale = getAgentRuntimeConfig(slug, { userLocale: 'ja-JP' });
    const withoutLocale = getAgentRuntimeConfig(slug, {});

    expect(withLocale?.systemRole ?? '').not.toContain('Preferred reply language');
    expect(withLocale?.systemRole).toEqual(withoutLocale?.systemRole);
  });

  it('keeps an empty inbox prompt empty with a chosen language', () => {
    expect(getAgentRuntimeConfig(BUILTIN_AGENT_SLUGS.inbox, { userLocale: 'ja-JP' })?.systemRole).toBe(
      '',
    );
  });
});
