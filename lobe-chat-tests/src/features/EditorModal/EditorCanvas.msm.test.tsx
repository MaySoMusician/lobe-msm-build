/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const editorProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('@lobehub/editor/react', () => ({
  Editor: (props: any) => {
    editorProps.current = props;
    return <div data-testid="editor" />;
  },
}));

vi.mock('@lobehub/editor', () => ({
  ReactLinkPlugin: {},
  ReactTablePlugin: {},
}));

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/ChatInput/InputEditor/plugins', () => ({
  createChatInputRichPlugins: () => [{ name: 'rich' }],
}));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: any) => unknown) => selector({}),
}));

vi.mock('@/store/user/selectors', () => ({
  labPreferSelectors: {
    enableInputMarkdown: () => false,
  },
}));

vi.mock('./Typobar', () => ({
  default: () => <div data-testid="typo-bar" />,
}));

import EditorCanvas from './EditorCanvas';

describe('msm EditorCanvas markdown disabled', () => {
  it('gates rich markdown editing when enableInputMarkdown is false', () => {
    render(<EditorCanvas defaultValue="hello" />);

    expect(editorProps.current).toMatchObject({
      enablePasteMarkdown: false,
      markdownOption: false,
      plugins: [],
      type: 'text',
    });
    expect(screen.queryByTestId('typo-bar')).not.toBeInTheDocument();
  });
});
