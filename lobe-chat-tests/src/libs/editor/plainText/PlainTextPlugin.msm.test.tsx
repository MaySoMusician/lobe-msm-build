/**
 * @vitest-environment happy-dom
 */
import { type IEditor, moment, ReactLiteXmlPlugin } from '@lobehub/editor';
import { Editor, useEditor } from '@lobehub/editor/react';
import { act, cleanup, render } from '@testing-library/react';
import { $getRoot, FORMAT_TEXT_COMMAND } from 'lexical';
import { memo, useEffect } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { CHAT_INPUT_EMBED_PLUGINS } from '@/features/ChatInput/InputEditor/plugins';

import { PLAIN_TEXT_EDITOR_PROPS, PLAIN_TEXT_PLUGINS } from './index';

afterEach(() => cleanup());

const Harness = memo<{ onReady: (editor: IEditor) => void }>(({ onReady }) => {
  const editor = useEditor();
  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);
  if (!editor) return null;
  return (
    <Editor
      {...PLAIN_TEXT_EDITOR_PROPS}
      content={''}
      editor={editor}
      plugins={[ReactLiteXmlPlugin, ...PLAIN_TEXT_PLUGINS, ...CHAT_INPUT_EMBED_PLUGINS]}
      type={'text'}
    />
  );
});

const mountEditor = async () => {
  let editor: IEditor | undefined;
  render(<Harness onReady={(e) => (editor = e)} />);
  await act(async () => {
    await moment();
  });
  return editor!;
};

const roundTrip = async (editor: IEditor, markdown: string) => {
  await act(async () => {
    editor.setDocument('markdown', markdown);
    await moment();
  });
  return editor.getDocument('markdown') as unknown as string;
};

describe('msm PlainTextPlugin', () => {
  it('reads and writes Markdown text verbatim, across repeated round trips', async () => {
    const editor = await mountEditor();
    const source = '**x** _y_\n- a\n1. b\n# h\n> q\n\tA  b \\* [x] a * b\n\nend.\n';

    let current = source;
    for (let i = 0; i < 3; i++) current = await roundTrip(editor, current);

    expect(current).toBe(source);
    const json = JSON.stringify(editor.getDocument('json'));
    expect(json).not.toMatch(/"type":"(heading|quote|list|listitem|code)"/);
    expect(json).not.toMatch(/"format":[1-9]/);
  });

  it('swallows formatting commands', async () => {
    const editor = await mountEditor();
    await roundTrip(editor, 'plain');

    await act(async () => {
      editor.getLexicalEditor()!.update(() => {
        $getRoot().select(0, 1);
      });
      editor.getLexicalEditor()!.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
      await moment();
    });

    expect(JSON.stringify(editor.getDocument('json'))).not.toMatch(/"format":[1-9]/);
    expect(editor.getDocument('markdown')).toBe('plain');
  });

  it('turns rich JSON back into Markdown source', async () => {
    const editor = await mountEditor();
    const text = (value: string, format = 0) => ({
      detail: 0,
      format,
      mode: 'normal',
      style: '',
      text: value,
      type: 'text',
      version: 1,
    });
    const block = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
      children,
      direction: null,
      format: '',
      indent: 0,
      type,
      version: 1,
      ...extra,
    });

    await act(async () => {
      editor.setDocument('json', {
        root: block('root', [
          block('heading', [text('Title')], { tag: 'h2' }),
          block('paragraph', [text('a '), text('bold', 1), text(' b')]),
          block('quote', [text('cited')]),
        ]),
      });
      await moment();
    });

    expect(editor.getDocument('markdown')).toBe('## Title\na **bold** b\n> cited');
    expect(JSON.stringify(editor.getDocument('json'))).not.toMatch(/"type":"(heading|quote)"/);
  });

  it('keeps chips when a skill tag is loaded from text', async () => {
    const editor = await mountEditor();
    const result = await roundTrip(editor, 'use <skill name="web" label="Web" /> now');

    expect(JSON.stringify(editor.getDocument('json'))).toContain('"actionType":"web"');
    expect(result).toBe('use <skill name="web" label="Web" /> now');
  });

  it('turns agent LiteXML blocks into their Markdown source instead of failing', async () => {
    const editor = await mountEditor();

    await act(async () => {
      editor.setDocument(
        'litexml',
        '<root><h2>Plan</h2><ul><li>first</li><li>second</li></ul><p>see <code>x</code></p></root>',
      );
      await moment();
    });

    expect(editor.getDocument('markdown')).toBe('## Plan\n- first\n- second\nsee `x`');
    expect(JSON.stringify(editor.getDocument('json'))).not.toMatch(
      /"type":"(heading|list|listitem|codeInline)"/,
    );
  });

  it('copies a selection as its plain text', async () => {
    const editor = await mountEditor();
    await roundTrip(editor, 'a * b [x]');

    await act(async () => {
      editor.getLexicalEditor()!.update(() => {
        $getRoot().selectEnd();
        $getRoot().select(0, 1);
      });
      await moment();
    });

    expect(editor.getSelectionDocument('markdown')).toBe('a * b [x]');
  });
});
