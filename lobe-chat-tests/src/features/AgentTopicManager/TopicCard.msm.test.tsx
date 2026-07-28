/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@lobehub/ui', () => ({
  Block: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
  Checkbox: () => <input type="checkbox" />,
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Tag: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('antd-style', () => ({
  createStaticStyles: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) => String(prop),
      },
    ),
  cssVar: {
    colorPrimary: '#00f',
    colorSplit: '#ddd',
    colorTextQuaternary: '#aaa',
    colorWarning: '#fa0',
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/useActivityTime', () => ({
  useActivityTime: () => ({ text: 'now', title: 'now' }),
}));

vi.mock('./store', () => ({
  useTopicsViewStore: (selector: (s: any) => unknown) =>
    selector({
      selectMode: false,
      selectedIds: [],
      toggleSelectMode: vi.fn(),
      toggleSelected: vi.fn(),
    }),
}));

vi.mock('./StatusDot', () => ({
  default: () => null,
}));

vi.mock('./utils', () => ({
  getProjectLabel: () => undefined,
}));

import TopicCard from './TopicCard';

describe('msm TopicCard preview', () => {
  it('truncates preview text to 100 characters', () => {
    const description = 'A'.repeat(120);

    render(
      <TopicCard
        agentId="agent-1"
        topic={
          {
            description,
            id: 'topic-1',
            title: 'Title',
            updatedAt: Date.now(),
          } as any
        }
      />,
    );

    expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    expect(screen.queryByText(description)).not.toBeInTheDocument();
  });
});
