// @vitest-environment node
import { ImageGenerationManifest } from '@lobechat/builtin-tool-image-generation';
import { describe, expect, it } from 'vitest';

import { createServerAgentToolsEngine } from './index';
import { type ServerAgentToolsContext } from './types';

const createMockContext = (
  overrides: Partial<ServerAgentToolsContext> = {},
): ServerAgentToolsContext => ({
  installedPlugins: [],
  isModelSupportToolUse: () => true,
  ...overrides,
});

describe('msm createServerAgentToolsEngine chat-mode image generation', () => {
  it('does not enable lobe-image-generation when it is not pinned', () => {
    const engine = createServerAgentToolsEngine(createMockContext(), {
      agentConfig: {
        chatConfig: { enableAgentMode: false },
        plugins: [],
      },
      model: 'claude-sonnet',
      modelAbilities: { functionCall: true, imageOutput: false },
      provider: 'anthropic',
    });

    const result = engine.generateToolsDetailed({
      model: 'claude-sonnet',
      provider: 'anthropic',
      toolIds: [],
    });

    expect(result.enabledToolIds).not.toContain(ImageGenerationManifest.identifier);
  });

  it('enables lobe-image-generation when pinned for a function-calling model', () => {
    const engine = createServerAgentToolsEngine(createMockContext(), {
      agentConfig: {
        chatConfig: { enableAgentMode: false },
        plugins: [ImageGenerationManifest.identifier],
      },
      model: 'claude-sonnet',
      modelAbilities: { functionCall: true, imageOutput: false },
      provider: 'anthropic',
    });

    const result = engine.generateToolsDetailed({
      model: 'claude-sonnet',
      provider: 'anthropic',
      toolIds: [],
    });

    expect(result.enabledToolIds).toContain(ImageGenerationManifest.identifier);
  });
});
