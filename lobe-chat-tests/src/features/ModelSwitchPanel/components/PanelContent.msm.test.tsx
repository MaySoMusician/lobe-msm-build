/**
 * @vitest-environment happy-dom
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const handlePanelWidthChange = vi.hoisted(() => vi.fn());

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-rnd', () => ({
  Rnd: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/business/client/hooks/useBusinessModelPricing', () => ({
  useBusinessModelPricingPrefetch: vi.fn(),
}));

vi.mock('@/hooks/useEnabledChatModels', () => ({
  useEnabledChatModels: () => [],
}));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: any) => unknown) => selector({}),
}));

vi.mock('@/store/user/slices/settings/selectors/general', () => ({
  userGeneralSettingsSelectors: {
    config: () => ({ isDevMode: false }),
  },
}));

vi.mock('../hooks/usePanelSize', () => ({
  usePanelSize: () => ({
    handlePanelWidthChange,
    panelHeight: 460,
    panelWidth: 460,
  }),
}));

vi.mock('../hooks/usePanelState', () => ({
  usePanelState: () => ({
    groupMode: 'byModel',
    handleGroupModeChange: vi.fn(),
  }),
}));

vi.mock('./Toolbar', () => ({
  Toolbar: () => <div data-testid="toolbar" />,
}));

vi.mock('./List', () => ({
  List: () => <div data-testid="list" />,
}));

import { PanelContent } from './PanelContent';

describe('msm PanelContent phone width', () => {
  it('clamps panel width when the viewport is narrower than the stored width', () => {
    Object.defineProperty(document.body, 'clientWidth', {
      configurable: true,
      value: 375,
    });

    render(<PanelContent enabledList={[]} />);

    expect(handlePanelWidthChange).toHaveBeenCalledWith(325);
  });
});
