import { describe, expect, it } from 'vitest';

import { parseBrowserLanguage } from './locale';

describe('msm parseBrowserLanguage', () => {
  it('forces en-US regardless of Accept-Language', () => {
    const headers = new Headers({ 'accept-language': 'zh-CN,zh;q=0.9,ja;q=0.8' });

    expect(parseBrowserLanguage(headers)).toBe('en-US');
    expect(parseBrowserLanguage(headers, 'en-US')).toBe('en-US');
  });
});
