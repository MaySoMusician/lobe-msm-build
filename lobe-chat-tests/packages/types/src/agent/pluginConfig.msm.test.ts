import { describe, expect, it } from 'vitest';

import { getConnectorMode, shouldEnableConnectorOnConnect } from './pluginConfig';

const agentMode = { enableAgentMode: true };

describe('msm connector opt-in', () => {
  it('reads an untouched connector as off in Agent mode too', () => {
    expect(getConnectorMode(undefined, 'my-connector', agentMode)).toBe('disabled');
    expect(getConnectorMode([], 'my-connector', agentMode)).toBe('disabled');
  });

  it('reads an explicit on entry, or a legacy pinned one, as on', () => {
    expect(
      getConnectorMode([{ identifier: 'my-connector', mode: 'auto' }], 'my-connector', agentMode),
    ).toBe('auto');
    expect(getConnectorMode(['my-connector'], 'my-connector', agentMode)).toBe('auto');
  });

  it('turns a connector on when it is connected from an Agent-mode agent', () => {
    expect(shouldEnableConnectorOnConnect([], 'my-connector', agentMode)).toBe(true);
    expect(
      shouldEnableConnectorOnConnect(
        [{ identifier: 'my-connector', mode: 'disabled' }],
        'my-connector',
        agentMode,
      ),
    ).toBe(false);
  });
});
