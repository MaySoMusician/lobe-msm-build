import { ImageGenerationManifest } from '@lobechat/builtin-tool-image-generation';
import { describe, expect, it } from 'vitest';

import { alwaysOnToolIds, chatModeAllowedToolIds } from './index';

describe('msm alwaysOnToolIds', () => {
  it('keeps always-on tools empty', () => {
    expect(alwaysOnToolIds).toEqual([]);
  });
});

describe('msm chatModeAllowedToolIds', () => {
  it('does not auto-include lobe-image-generation', () => {
    expect(chatModeAllowedToolIds).not.toContain(ImageGenerationManifest.identifier);
  });
});
