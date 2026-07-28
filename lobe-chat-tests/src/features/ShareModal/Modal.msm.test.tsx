/**
 * @vitest-environment happy-dom
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tabsProps = vi.hoisted(() => ({ current: null as any }));
const createModalMock = vi.hoisted(() =>
  vi.fn((options: { content: ReactNode }) => {
    render(options.content);
    return { close: vi.fn(), update: vi.fn() };
  }),
);

vi.mock('@lobehub/ui/base-ui', () => ({
  Tabs: (props: any) => {
    tabsProps.current = props;
    return <div data-testid="share-tabs" data-active-key={props.activeKey} />;
  },
  createModal: createModalMock,
}));

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Skeleton: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('i18next', () => ({
  t: (key: string) => key,
}));

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('./ShareDataProvider', () => ({
  default: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useShareData: () => ({ dbMessages: [{ id: '1' }], isLoading: false }),
}));

vi.mock('./ShareImage', () => ({ default: () => <div data-testid="share-image" /> }));
vi.mock('./ShareJSON', () => ({ default: () => <div data-testid="share-json" /> }));
vi.mock('./SharePdf', () => ({ default: () => <div data-testid="share-pdf" /> }));
vi.mock('./ShareText', () => ({ default: () => <div data-testid="share-text" /> }));

import openShareModal from './Modal';

describe('msm ShareModal defaults', () => {
  beforeEach(() => {
    tabsProps.current = null;
    createModalMock.mockClear();
  });

  it('opens on the JSON tab by default', () => {
    openShareModal();

    expect(tabsProps.current?.activeKey).toBe('json');
  });
});
