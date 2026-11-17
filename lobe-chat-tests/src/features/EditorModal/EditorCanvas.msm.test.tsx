/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const editorProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('@lobehub/editor/react', () => ({
  Editor: Object.assign(
    (props: any) => {
      editorProps.current = props;
      return <div data-testid="editor" />;
    },
    { withProps: (plugin: unknown, props: unknown) => [plugin, props] },
  ),
}));

vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/EditorCanvas/TypoBar', () => ({
  TypoBar: () => <div data-testid="typo-bar" />,
}));

import { ReactMentionPlugin } from '@lobehub/editor';

import {
  CHAT_INPUT_EMBED_PLUGINS,
  writeChatInputMentionMarkdown,
} from '@/features/ChatInput/InputEditor/plugins';
import ReactPlainTextPlugin from '@/libs/editor/plainText/ReactPlainTextPlugin';

import EditorCanvas from './EditorCanvas';

const mentionState = {
  root: {
    children: [
      {
        children: [
          { label: 'Agent A', metadata: { id: 'agent-a' }, type: 'mention', version: 1 },
          { text: ' please check', type: 'text' },
        ],
        type: 'paragraph',
      },
    ],
    type: 'root',
  },
};

const fakeEditor = (failJson = false) => {
  const calls: Array<[string, unknown]> = [];
  return {
    calls,
    setDocument: (type: string, content: unknown) => {
      if (type === 'json' && failJson) throw new Error('unregistered node');
      calls.push([type, content]);
    },
  };
};

describe('msm EditorCanvas keeps message edits plain text with chips', () => {
  it('uses the plain-text editor with chip plugins and no typography bar', () => {
    render(<EditorCanvas defaultValue="hello" />);

    expect(editorProps.current).toMatchObject({
      autoFormatMarkdown: false,
      enablePasteMarkdown: false,
      markdownOption: false,
      pasteAsPlainText: true,
      pasteVSCodeAsCodeBlock: false,
    });
    const plugins = editorProps.current.plugins as unknown[];
    expect(plugins[0]).toBe(ReactPlainTextPlugin);
    for (const plugin of CHAT_INPUT_EMBED_PLUGINS) expect(plugins).toContain(plugin);
    expect(plugins).toContainEqual([
      ReactMentionPlugin,
      { markdownWriter: writeChatInputMentionMarkdown },
    ]);
    expect(screen.queryByTestId('typo-bar')).not.toBeInTheDocument();
  });

  it('loads the saved chips when the message has editor data', () => {
    render(<EditorCanvas defaultValue="@Agent A please check" editorData={mentionState} />);
    const editor = fakeEditor();

    editorProps.current.onInit(editor);

    expect(editor.calls).toEqual([['json', mentionState]]);
  });

  it('falls back to the message text, never blank, when the data cannot load', () => {
    render(<EditorCanvas defaultValue="@Agent A please check" editorData={mentionState} />);
    const editor = fakeEditor(true);

    editorProps.current.onInit(editor);

    expect(editor.calls).toEqual([['markdown', '@Agent A please check']]);
  });

  it('opens formatted data from its text, so the formatting stays visible as source', () => {
    const bold = {
      root: {
        children: [{ children: [{ format: 1, text: 'x', type: 'text' }], type: 'paragraph' }],
        type: 'root',
      },
    };
    render(<EditorCanvas defaultValue="**x**" editorData={bold} />);
    const editor = fakeEditor();

    editorProps.current.onInit(editor);

    expect(editor.calls).toEqual([['markdown', '**x**']]);
  });
});
