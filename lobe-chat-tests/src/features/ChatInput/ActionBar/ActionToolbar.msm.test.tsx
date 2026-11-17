/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ActionToolbar from './index';

const leftActions = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock('../ActionBar/config', () => ({
  actionMap: new Proxy(
    {},
    { get: (_target, key) => () => createElement('div', { 'data-testid': String(key) }) },
  ),
}));

type Item = { children?: unknown; key: string; type?: string };

vi.mock('@lobehub/editor/react', () => ({
  ChatInputActions: ({ items }: { items: Item[] }) =>
    createElement(
      'div',
      { 'data-keys': JSON.stringify(items.map((item) => item.key)), 'data-testid': 'actions' },
      items.map((item) =>
        createElement(
          'div',
          { key: item.key },
          Array.isArray(item.children)
            ? (item.children as Item[]).map((child) =>
                createElement('div', { key: child.key }, child.children as any),
              )
            : (item.children as any),
        ),
      ),
    ),
}));

vi.mock('@/store/global', () => ({
  useGlobalStore: (selector: (state: object) => unknown) =>
    selector({ toggleExpandInputActionbar: vi.fn() }),
}));

vi.mock('@/store/global/selectors', () => ({
  systemStatusSelectors: { expandInputActionbar: () => false },
}));

vi.mock('../hooks/useChatInputResourceAccess', () => ({
  useChatInputResourceAccess: () => ({ canConfigureResource: true, canShowControls: true }),
}));

vi.mock('../store', () => ({
  useChatInputStore: (selector: (state: object) => unknown) =>
    selector({ leftActions: leftActions.value, mobile: false }),
}));

describe('msm the action bar never offers the typography toggle', () => {
  it('drops typo from presets and from groups, and drops groups it empties', () => {
    leftActions.value = ['typo', 'params', ['typo'], ['clear', 'typo']];

    render(createElement(ActionToolbar));

    expect(screen.queryByTestId('typo')).toBeNull();
    expect(screen.getByTestId('params')).toBeDefined();
    expect(screen.getByTestId('clear')).toBeDefined();
    expect(JSON.parse(screen.getByTestId('actions').dataset.keys!)).toHaveLength(2);
  });
});
