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

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/EditorCanvas/TypoBar', () => ({
  TypoBar: () => <div data-testid="typo-bar" />,
}));

import EditorCanvas from './EditorCanvas';

describe('msm EditorCanvas keeps message edits plain text', () => {
  it('always uses the plain-text editor without rich plugins or the typography bar', () => {
    render(<EditorCanvas defaultValue="hello" />);

    expect(editorProps.current).toMatchObject({
      content: 'hello',
      enablePasteMarkdown: false,
      markdownOption: false,
      plugins: [],
      type: 'text',
    });
    expect(screen.queryByTestId('typo-bar')).not.toBeInTheDocument();
  });

  it('edits the message text even when saved rich data exists, so a chip cannot blank it', () => {
    const mentionState = {
      root: {
        children: [{ children: [{ label: 'Agent A', type: 'mention' }], type: 'paragraph' }],
        type: 'root',
      },
    };

    render(<EditorCanvas defaultValue="@Agent A please check" editorData={mentionState} />);

    expect(editorProps.current).toMatchObject({
      content: '@Agent A please check',
      plugins: [],
      type: 'text',
    });
  });
});
