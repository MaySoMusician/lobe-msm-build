import { describe, expect, it } from 'vitest';

import { resolveFontFamilyOverride } from './fontFamilyOverride';

const CHINESE_FAMILY =
  /HarmonyOS|PingFang|Microsoft (YaHei|JhengHei)|Hiragino Sans (GB|CNS)|Source Han Sans (SC|TC|HC)|Noto Sans CJK (SC|TC|HK)/;

describe('resolveFontFamilyOverride (MSM font stack from the patched Lobe UI)', () => {
  it('prepends the user and env fonts to the IBM Plex + Japanese stack', () => {
    for (const locale of ['ja-JP', 'zh-TW', 'zh-CN']) {
      const { fontFamily } = resolveFontFamilyOverride({
        customFontFamily: 'Env Font',
        locale,
        userFontFamily: 'LXGW WenKai',
      });

      expect(fontFamily?.startsWith('"LXGW WenKai","Env Font","IBM Plex Sans JP",')).toBe(true);
      expect(fontFamily).toContain('"Hiragino Sans"');
      expect(fontFamily).not.toMatch(CHINESE_FAMILY);
    }
  });

  it('puts Mgen+ 1mn right after a custom terminal font', () => {
    const { fontFamily, fontFamilyCode } = resolveFontFamilyOverride({
      locale: 'zh-TW',
      userFontFamilyCode: 'JetBrains Mono',
    });

    expect(fontFamily).toBeUndefined();
    expect(fontFamilyCode?.startsWith('"JetBrains Mono","Mgen+ 1mn",')).toBe(true);
    expect(fontFamilyCode).not.toMatch(CHINESE_FAMILY);
  });
});
