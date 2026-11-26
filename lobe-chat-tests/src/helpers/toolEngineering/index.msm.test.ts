import { type ToolManifest } from '@lobechat/types';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAgentToolsEngine } from './index';

const agentPlugins = vi.hoisted(() => ({ current: [] as unknown[] }));
const chatConfig = vi.hoisted(() => ({ current: { enableAgentMode: false } as Record<string, unknown> }));

vi.mock('@/store/tool', () => ({
  getToolStoreState: () => ({
    builtinTools: [
      {
        identifier: 'lobe-image-generation',
        manifest: {
          api: [
            {
              description: 'Generate image',
              name: 'generateImage',
              parameters: {
                properties: { prompt: { type: 'string' } },
                required: ['prompt'],
                type: 'object',
              },
            },
          ],
          identifier: 'lobe-image-generation',
          meta: { avatar: 'I', title: 'Image Generation' },
          type: 'builtin',
        } as unknown as ToolManifest,
        type: 'builtin' as const,
      },
      {
        identifier: 'lobe-web-browsing',
        manifest: {
          api: [
            {
              description: 'Search',
              name: 'search',
              parameters: {
                properties: { query: { type: 'string' } },
                required: ['query'],
                type: 'object',
              },
            },
          ],
          identifier: 'lobe-web-browsing',
          meta: { avatar: '🌐', title: 'Web Browsing' },
          type: 'builtin',
        } as unknown as ToolManifest,
        type: 'builtin' as const,
      },
    ],
    connectors: [],
  }),
}));

vi.mock('@/store/tool/selectors', () => ({
  composioStoreSelectors: { composioAsLobeTools: () => [] },
  lobehubSkillStoreSelectors: { lobehubSkillAsLobeTools: () => [] },
  pluginSelectors: {
    getInstalledPluginById: () => () => undefined,
    installedPluginManifestList: () => [],
  },
}));

vi.mock('@/store/serverConfig', () => ({
  getServerConfigStoreState: () => ({ serverConfig: {} }),
}));

vi.mock('../isCanUseFC', () => ({
  isCanUseFC: () => true,
}));

vi.mock('@/store/agent', () => ({
  getAgentStoreState: () => ({}),
}));

vi.mock('@/store/agent/selectors', () => ({
  agentChatConfigSelectors: {
    currentChatConfig: () => chatConfig.current,
    isCloudSandboxEnabled: () => false,
    isLocalSystemEnabled: () => false,
    isMemoryToolEnabled: () => false,
  },
  chatConfigByIdSelectors: {
    getExecutionTargetById: () => () => undefined,
  },
  agentSelectors: {
    currentAgentConfig: () => ({ plugins: agentPlugins.current }),
    currentAgentDisabledPlugins: () => [],
    currentAgentPlugins: () => agentPlugins.current,
    currentAgentVisibility: () => 'private',
    hasEnabledKnowledgeBases: () => false,
  },
}));

vi.mock('@/store/aiInfra', () => ({
  aiModelSelectors: {
    isModelSupportImageOutput: () => () => false,
  },
  getAiInfraStoreState: () => ({}),
}));

vi.mock('@/store/user', () => ({
  useUserStore: { getState: () => ({}) },
}));

vi.mock('@/store/user/selectors', () => ({
  labPreferSelectors: { enableInAppBrowser: () => false },
  settingsSelectors: { memoryEnabled: () => false },
}));

vi.mock('@/helpers/getSearchConfig', () => ({
  getSearchConfig: () => ({ useApplicationBuiltinSearchTool: true }),
}));

describe('msm createAgentToolsEngine chat-mode image generation', () => {
  afterEach(() => {
    agentPlugins.current = [];
    chatConfig.current = { enableAgentMode: false };
    vi.clearAllMocks();
  });

  it('does not enable lobe-image-generation when it is not pinned', () => {
    // A real run passes the confirmed (here: empty) uninstalled-builtins list.
    const toolsEngine = createAgentToolsEngine(
      { model: 'claude-sonnet', provider: 'anthropic' },
      undefined,
      undefined,
      { uninstalledBuiltinTools: [] },
    );

    const result = toolsEngine.generateToolsDetailed({
      model: 'claude-sonnet',
      provider: 'anthropic',
      toolIds: [],
    });

    expect(result.enabledToolIds).not.toContain('lobe-image-generation');
  });

  it('enables lobe-image-generation when pinned for a function-calling model', () => {
    agentPlugins.current = ['lobe-image-generation'];
    // A real run passes the confirmed (here: empty) uninstalled-builtins list.
    const toolsEngine = createAgentToolsEngine(
      { model: 'claude-sonnet', provider: 'anthropic' },
      undefined,
      undefined,
      { uninstalledBuiltinTools: [] },
    );

    const result = toolsEngine.generateToolsDetailed({
      model: 'claude-sonnet',
      provider: 'anthropic',
      toolIds: [],
    });

    expect(result.enabledToolIds).toContain('lobe-image-generation');
  });
});

describe('msm createAgentToolsEngine Agent mode opt-in', () => {
  afterEach(() => {
    agentPlugins.current = [];
    chatConfig.current = { enableAgentMode: false };
  });

  // A run hands the engine the ids `resolveAgentConfig` resolved: every entry the
  // agent turned on (see resolveAgentConfig.msm.test.ts).
  const generate = (resolvedPluginIds: string[]) =>
    createAgentToolsEngine(
      { model: 'claude-sonnet', provider: 'anthropic' },
      resolvedPluginIds,
      undefined,
      { uninstalledBuiltinTools: [] },
    ).generateToolsDetailed({
      model: 'claude-sonnet',
      provider: 'anthropic',
      toolIds: resolvedPluginIds,
    });

  it('loads a builtin the agent turned on directly, without an activator', () => {
    chatConfig.current = { enableAgentMode: true };
    agentPlugins.current = [
      { builtinOverride: true, identifier: 'lobe-image-generation', mode: 'auto' },
    ];

    const result = generate(['lobe-image-generation']);

    expect(result.enabledToolIds).toContain('lobe-image-generation');
    expect(result.enabledToolIds).not.toContain('lobe-activator');
    expect(result.enabledToolIds).not.toContain('lobe-skills');
  });

  it('loads no builtin the agent did not turn on', () => {
    chatConfig.current = { enableAgentMode: true };

    const result = generate([]);

    expect(result.enabledToolIds).not.toContain('lobe-image-generation');
    expect(result.enabledToolIds).not.toContain('lobe-activator');
  });
});
