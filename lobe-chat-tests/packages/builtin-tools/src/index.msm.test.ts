import { ImageGenerationManifest } from '@lobechat/builtin-tool-image-generation';
import { describe, expect, it } from 'vitest';

import { alwaysOnToolIds, builtinTools, chatModeAllowedToolIds } from './index';

describe('msm alwaysOnToolIds', () => {
  it('keeps always-on tools empty', () => {
    expect(alwaysOnToolIds).toEqual([]);
  });
});

describe('msm chatModeAllowedToolIds', () => {
  it('keeps image generation eligible for the upstream pinned-only gate', () => {
    expect(chatModeAllowedToolIds).toContain(ImageGenerationManifest.identifier);
  });
});

describe('msm opt-in tool visibility', () => {
  it.each(['lobe-verify', 'lobe-activator', 'lobe-skills'])('exposes %s', (identifier) => {
    const tool = builtinTools.find((item) => item.identifier === identifier);

    expect(tool).toBeDefined();
    expect(tool?.hidden).not.toBe(true);
    expect(tool?.discoverable).not.toBe(false);
  });
});

describe('msm getUnavailableBuiltinToolIds', () => {
  it('keeps on-demand builtins the agent did not turn on unavailable in Agent mode', async () => {
    const { getUnavailableBuiltinToolIds, onDemandBuiltinToolIds } = await import('./index');

    const unavailable = getUnavailableBuiltinToolIds(['lobe-activator'], { enableAgentMode: true });

    expect(onDemandBuiltinToolIds).toContain('lobe-skills');
    expect(unavailable).toContain('lobe-skills');
    expect(unavailable).not.toContain('lobe-activator');
  });
});
