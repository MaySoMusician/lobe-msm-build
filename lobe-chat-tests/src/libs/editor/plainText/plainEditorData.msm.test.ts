import { describe, expect, it } from 'vitest';

import { EMPTY_EDITOR_STATE } from '@/libs/editor/constants';

import { extractPlainText, hasRichEditorNodes, loadPlainDocument } from './plainEditorData';

const text = (value: string, format = 0) => ({ format, text: value, type: 'text' });
const doc = (...children: unknown[]) => ({ root: { children, type: 'root' } });
const paragraph = (...children: unknown[]) => ({ children, type: 'paragraph' });
const mention = { label: 'Agent A', type: 'mention' };

const recorder = (failJson = false) => {
  const calls: Array<[string, unknown]> = [];
  return {
    calls,
    setDocument: (type: string, content: unknown) => {
      if (type === 'json' && failJson) throw new Error('unregistered node');
      calls.push([type, content]);
    },
  };
};

describe('msm hasRichEditorNodes', () => {
  it('flags headings, quotes and formatted text, at any depth', () => {
    expect(hasRichEditorNodes(doc({ children: [text('t')], tag: 'h1', type: 'heading' }))).toBe(
      true,
    );
    expect(hasRichEditorNodes(doc({ children: [], type: 'quote' }))).toBe(true);
    expect(hasRichEditorNodes(doc(paragraph(text('a'), text('b', 1))))).toBe(true);
  });

  it('accepts plain paragraphs with chips, and anything without a root', () => {
    expect(hasRichEditorNodes(doc(paragraph(mention, text(' hi'))))).toBe(false);
    expect(hasRichEditorNodes(undefined)).toBe(false);
    expect(hasRichEditorNodes({ content: [], type: 'doc' })).toBe(false);
  });
});

describe('msm extractPlainText', () => {
  it('keeps one line per block, with chip labels', () => {
    expect(extractPlainText(doc(paragraph(mention, text(' hi')), paragraph(text('end'))))).toBe(
      'Agent A hi\nend',
    );
  });
});

describe('msm loadPlainDocument', () => {
  it('loads chip JSON as is', () => {
    const editor = recorder();
    const data = doc(paragraph(mention, text(' hi')));

    expect(loadPlainDocument(editor, { editorData: data, markdown: 'x' })).toBe('json');
    expect(editor.calls).toEqual([['json', data]]);
  });

  it('loads formatted JSON from its markdown text', () => {
    const editor = recorder();

    loadPlainDocument(editor, { editorData: doc(paragraph(text('b', 1))), markdown: '**b**' });

    expect(editor.calls).toEqual([['markdown', '**b**']]);
  });

  it('falls back to the text when the JSON cannot load, or to its own text without one', () => {
    const failing = recorder(true);
    loadPlainDocument(failing, { editorData: doc(paragraph(text('a'))), markdown: 'a' });
    expect(failing.calls).toEqual([['markdown', 'a']]);

    const noMarkdown = recorder(true);
    loadPlainDocument(noMarkdown, { editorData: doc(paragraph(mention, text(' hi'))) });
    expect(noMarkdown.calls).toEqual([['markdown', 'Agent A hi']]);
  });

  it('loads the empty state only when there is no text at all', () => {
    const editor = recorder();

    expect(loadPlainDocument(editor, {})).toBe('empty');
    expect(editor.calls).toEqual([['json', EMPTY_EDITOR_STATE]]);
  });
});
