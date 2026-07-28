/**
 * @vitest-environment happy-dom
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const dropdownProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('@lobehub/ui', () => ({
  ActionIcon: () => <button type="button">lang</button>,
  DropdownMenu: (props: any) => {
    dropdownProps.current = props;
    return <div data-testid="lang-dropdown" />;
  },
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('antd-style', () => ({
  cssVar: { colorFillTertiary: '#eee', colorTextSecondary: '#999' },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/locales/resources', () => ({
  localeOptions: [
    { label: 'English', value: 'en-US' },
    { label: '日本語', value: 'ja-JP' },
    { label: '简体中文', value: 'zh-CN' },
    { label: 'Deutsch', value: 'de-DE' },
  ],
}));

vi.mock('@/store/global', () => ({
  useGlobalStore: (selector: (s: any) => unknown) =>
    selector({
      status: { language: 'auto' },
      switchLocale: vi.fn(),
    }),
}));

vi.mock('@/store/global/selectors', () => ({
  globalGeneralSelectors: {
    language: (s: any) => s.status.language,
  },
}));

vi.mock('@/styles/electron', () => ({
  electronStylish: {},
}));

import LangButton from './LangButton';

describe('msm LangButton', () => {
  it('only offers auto, en-US, and ja-JP language options', () => {
    render(<LangButton size={16} />);

    const keys = (dropdownProps.current?.items ?? []).map((item: { key: string }) => item.key);
    expect(keys).toEqual(['auto', 'en-US', 'ja-JP']);
  });
});
