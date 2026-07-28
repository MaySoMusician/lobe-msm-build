/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@lobehub/ui/mobile', () => ({
  ChatHeader: ({ right }: { right?: ReactNode }) => <div data-testid="mobile-chat-header">{right}</div>,
}));

vi.mock('@/hooks/useQueryRoute', () => ({
  useQueryRoute: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/TopicComment/TopicCommentButton', () => ({
  default: () => <div data-testid="topic-comment-button" />,
}));

vi.mock('@/routes/(main)/agent/features/Conversation/Header/ShareButton', () => ({
  default: () => <div data-testid="share-button" />,
}));

vi.mock('@/routes/(main)/agent/features/Conversation/Header/WorkingPanelToggle', () => ({
  default: () => <div data-testid="working-panel-toggle" />,
}));

vi.mock('./ChatHeaderTitle', () => ({
  default: () => <div data-testid="chat-header-title" />,
}));

import MobileHeader from './index';

describe('msm mobile ChatHeader', () => {
  it('renders WorkingPanelToggle in the mobile chat chrome', () => {
    render(<MobileHeader />);

    expect(screen.getByTestId('working-panel-toggle')).toBeInTheDocument();
  });
});
