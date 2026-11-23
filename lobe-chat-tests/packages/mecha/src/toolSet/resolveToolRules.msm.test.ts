import { AgentAccountIdentifier } from '@lobechat/builtin-tool-agent-account';
import { McpEventsIdentifier } from '@lobechat/builtin-tool-mcp-events';
import { describe, expect, it } from 'vitest';

import { resolveToolRules } from './resolveToolRules';
import type { ToolRuleRequest } from './types';

const request = (overrides: Partial<ToolRuleRequest> = {}): ToolRuleRequest => ({
  agent: { chatConfig: {}, plugins: [] },
  executionTarget: 'sandbox',
  localExecutionReady: false,
  model: { canUseFC: true },
  ...overrides,
});

describe('msm resolveToolRules — agent account tool stays user-controlled', () => {
  it('does not add the account tool to the default pool when the agent owns an account', () => {
    const resolved = resolveToolRules(request({ hasIdentityAccount: true }));

    expect(resolved.defaultToolIds).not.toContain(AgentAccountIdentifier);
  });

  it('keeps the account rule as a gate only: allowed with an account, blocked without', () => {
    expect(resolveToolRules(request({ hasIdentityAccount: true })).rules[AgentAccountIdentifier]).toBe(
      true,
    );
    expect(resolveToolRules(request()).rules[AgentAccountIdentifier]).toBe(false);
  });
});

describe('msm resolveToolRules — MCP Events tool stays user-controlled', () => {
  it('does not add MCP Events to the default pool when the agent has an event connector', () => {
    const resolved = resolveToolRules(request({ hasEventConnector: true }));

    expect(resolved.defaultToolIds).not.toContain(McpEventsIdentifier);
  });

  it('keeps the MCP Events rule as a gate only: allowed with a connector, excluded without', () => {
    const withConnector = resolveToolRules(request({ hasEventConnector: true }));
    expect(withConnector.rules[McpEventsIdentifier]).toBe(true);
    expect(withConnector.excludedIdentifiers.has(McpEventsIdentifier)).toBe(false);

    const without = resolveToolRules(request());
    expect(without.rules[McpEventsIdentifier]).toBe(false);
    expect(without.excludedIdentifiers.has(McpEventsIdentifier)).toBe(true);
  });
});
