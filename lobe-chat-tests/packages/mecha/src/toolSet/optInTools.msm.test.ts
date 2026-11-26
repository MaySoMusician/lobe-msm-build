import { LobeActivatorIdentifier } from '@lobechat/builtin-tool-activator';
import { MemoryManifest } from '@lobechat/builtin-tool-memory';
import { WebBrowsingManifest } from '@lobechat/builtin-tool-web-browsing';
import { describe, expect, it } from 'vitest';

import { getImplicitBuiltinSkillIds } from './builtinSkillGate';
import { hasConnectorActivator, resolveConnectorActivation } from './connectorActivation';
import { initialToolSelection } from './discoveryPool';

const agentMode = { enableAgentMode: true };

describe('msm hasConnectorActivator', () => {
  it('gives Agent mode no activator by default', () => {
    expect(hasConnectorActivator(agentMode, [])).toBe(false);
    expect(hasConnectorActivator(undefined, [])).toBe(false);
  });

  it('has one only when the agent turned the activator on, and not when it is disabled', () => {
    expect(hasConnectorActivator(agentMode, [LobeActivatorIdentifier])).toBe(true);
    expect(
      hasConnectorActivator(agentMode, [LobeActivatorIdentifier], [LobeActivatorIdentifier]),
    ).toBe(false);
  });
});

describe('msm connectors without an activator', () => {
  it('injects the connectors the agent turned on and never discovers the rest', () => {
    const activation = resolveConnectorActivation({
      discoverByDefault: false,
      hasActivator: false,
      optedInIds: ['on-connector'],
    });

    expect(activation.isInjected('on-connector')).toBe(true);
    expect(activation.isAllowed('untouched-connector')).toBe(false);
    expect(activation.isInjected('untouched-connector')).toBe(false);
  });
});

describe('msm initialToolSelection', () => {
  it('does not defer runtime tools in Agent mode without an activator', () => {
    const selection = initialToolSelection(
      [WebBrowsingManifest.identifier, MemoryManifest.identifier],
      agentMode,
    );

    expect(selection.excludeDefaultToolIds).toBeUndefined();
    expect(selection.toolIds).toContain(MemoryManifest.identifier);
  });

  it('defers them (all but web browsing) once the agent turned the activator on', () => {
    const selection = initialToolSelection(
      [LobeActivatorIdentifier, WebBrowsingManifest.identifier, MemoryManifest.identifier],
      agentMode,
    );

    expect(selection.excludeDefaultToolIds).toContain(MemoryManifest.identifier);
    expect(selection.excludeDefaultToolIds).not.toContain(WebBrowsingManifest.identifier);
  });
});

describe('msm getImplicitBuiltinSkillIds', () => {
  it('turns no builtin skill on implicitly, even for an agent created before skill opt-in', () => {
    expect(getImplicitBuiltinSkillIds('2026-01-01T00:00:00Z', agentMode)).toEqual([]);
  });
});
