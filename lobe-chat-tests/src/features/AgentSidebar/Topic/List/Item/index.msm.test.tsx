/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { CSSProperties, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import TopicItem from './index';

const navigateToTopic = vi.hoisted(() => vi.fn());
const useTopicNavigationMock = vi.hoisted(() => vi.fn());

vi.mock('@lobehub/ui', () => ({
  ContextMenuTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Flexbox: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Icon: () => <div data-testid="topic-item-icon" />,
  Popover: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Skeleton: { Button: (props: Record<string, unknown>) => <div {...props} /> },
  Tag: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Text: ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => (
    <span style={style}>{children}</span>
  ),
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('antd-style', () => ({
  createGlobalStyle: () => () => null,
  createStaticStyles: () => ({
    dotContainer: 'dotContainer',
    neonDot: 'neonDot',
    neonDotWrapper: 'neonDotWrapper',
  }),
  cssVar: { colorInfo: '#00f', colorTextDescription: '#999' },
  keyframes: () => 'keyframes',
  useTheme: () => ({ isDarkMode: false }),
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
      <span {...props}>{children}</span>
    ),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/const/version', () => ({ isDesktop: false }));
vi.mock('@/features/NavPanel/components/NavItem', () => ({
  default: ({
    onClick,
    title,
  }: {
    onClick?: (e: any) => void;
    title?: ReactNode;
  }) => (
    <button data-testid="nav-item" type="button" onClick={onClick}>
      {title}
    </button>
  ),
}));
vi.mock('@/components/RingLoading', () => ({ default: () => null }));
vi.mock('@/features/ChatInput/ControlBar/DirIcon', () => ({ default: () => null }));
vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => 'team',
}));
vi.mock('@/routes/(main)/agent/channel/const', () => ({ getPlatformIcon: () => null }));
vi.mock('@/store/agent', () => ({
  useAgentStore: (
    selector: (state: { activeAgentId: string; agentMap: Record<string, unknown> }) => unknown,
  ) => selector({ activeAgentId: 'agt_test', agentMap: {} }),
}));
vi.mock('@/store/chat', () => ({
  useChatStore: (
    selector: (state: { prefetchMessages: () => void; topicLoadingIds: string[] }) => unknown,
  ) => selector({ prefetchMessages: vi.fn(), topicLoadingIds: [] }),
}));
vi.mock('@/store/chat/selectors', () => ({
  operationSelectors: {
    getAgentRuntimeStartTimeByContext: () => () => undefined,
    getVisibleAgentRuntimeStartTimeByContext: () => () => undefined,
    isAgentRuntimeRunningByContext: () => () => false,
    isAgentRuntimeVisiblyRunningByContext: () => () => false,
    isTopicUnreadCompleted: () => () => false,
  },
}));
vi.mock('@/store/electron', () => ({
  useElectronStore: (selector: (state: { addTab: () => void }) => unknown) =>
    selector({ addTab: vi.fn() }),
}));
vi.mock('../../hooks/useTopicNavigation', () => ({
  useTopicNavigation: () => useTopicNavigationMock(),
}));
vi.mock('./MetaHoverCard', () => ({ default: () => null }));
vi.mock('./metaCardData', () => ({
  PR_STATE_VISUAL: {},
  getPullRequestState: () => undefined,
  getTopicMetaCard: () => undefined,
}));
vi.mock('./Actions', () => ({ default: () => null }));
vi.mock('./useDropdownMenu', () => ({
  useTopicItemDropdownMenu: () => ({ dropdownMenu: [] }),
}));
vi.mock('../../TopicListContent/ThreadList', () => ({
  default: () => null,
}));

describe('msm TopicItem modifier click', () => {
  afterEach(() => {
    navigateToTopic.mockClear();
  });

  it('skips navigation on ctrl/meta click and navigates on a plain click', () => {
    useTopicNavigationMock.mockReturnValue({
      focusTopicPopup: vi.fn(),
      isInAgentSubRoute: false,
      isInTopicContextRoute: false,
      navigateToTopic,
      routeTopicId: undefined,
      urlTopicId: undefined,
    });

    render(<TopicItem id="topic-1" title="Hello" />);

    const button = screen.getByTestId('nav-item');
    fireEvent.click(button, { ctrlKey: true });
    expect(navigateToTopic).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(navigateToTopic).toHaveBeenCalledWith('topic-1');
  });
});
