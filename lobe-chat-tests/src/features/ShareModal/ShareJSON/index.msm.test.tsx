/**
 * @vitest-environment happy-dom
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const tabsProps = vi.hoisted(() => ({ current: null as any }));
const formProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('@lobehub/ui/base-ui', () => ({
  Button: ({ children }: { children?: ReactNode }) => <button type="button">{children}</button>,
  Switch: () => <input type="checkbox" />,
  Tabs: (props: any) => {
    tabsProps.current = props;
    return <div data-testid="export-mode-tabs" data-active-key={props.activeKey} />;
  },
}));

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Form: (props: any) => {
    formProps.current = props;
    return (
      <form>
        {(props.items ?? []).map((item: any) => (
          <div key={item.name}>{item.children}</div>
        ))}
      </form>
    );
  },
  copyToClipboard: vi.fn(),
}));

vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { success: vi.fn() } }) },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../ShareDataProvider', () => ({
  useShareData: () => ({
    dbMessages: [],
    systemRole: '',
    title: 'chat',
    topic: undefined,
  }),
}));

vi.mock('../style', () => ({
  styles: {
    body: 'body',
    footer: 'footer',
    sidebar: 'sidebar',
  },
}));

vi.mock('./Preview', () => ({
  default: () => <div data-testid="share-json-preview" />,
}));

vi.mock('./generateFullExport', () => ({
  generateFullExport: () => ({ messages: [] }),
}));

vi.mock('./generateMessages', () => ({
  generateMessages: () => [{ content: 'hi', role: 'user' }],
}));

import ShareJSON from './index';

describe('msm ShareJSON defaults', () => {
  it('defaults exportMode to simple', () => {
    render(<ShareJSON />);

    expect(formProps.current?.initialValues?.exportMode).toBe('simple');
    expect(tabsProps.current?.activeKey).toBe('simple');
  });
});
