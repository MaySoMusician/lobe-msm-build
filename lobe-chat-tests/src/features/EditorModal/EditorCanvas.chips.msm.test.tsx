/**
 * @vitest-environment happy-dom
 */
import { type IEditor, moment } from '@lobehub/editor';
import { useEditor } from '@lobehub/editor/react';
import { act, cleanup, render } from '@testing-library/react';
import { memo } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import EditorCanvas from './EditorCanvas';

afterEach(() => cleanup());

const Harness = memo<{ editorData: unknown; onReady: (editor: IEditor) => void; text: string }>(
  ({ editorData, onReady, text }) => {
    const editor = useEditor();
    if (editor) onReady(editor);
    if (!editor) return null;
    return <EditorCanvas defaultValue={text} editor={editor} editorData={editorData} />;
  },
);

const toolChipState = {
  root: {
    children: [
      {
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text: 'run ', type: 'text', version: 1 },
          {
            actionCategory: 'tool',
            actionLabel: 'MSM Tool',
            actionType: 'msm-tool',
            type: 'action-tag',
            version: 1,
          },
        ],
        direction: null,
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
};

describe('msm edit dialog renders saved chips outside a composer', () => {
  it('shows a tool chip without crashing and saves it back as its tag', async () => {
    let editor: IEditor | undefined;
    const { container } = render(
      <Harness
        editorData={toolChipState}
        text={'run <tool name="msm-tool" label="MSM Tool" />'}
        onReady={(e) => (editor = e)}
      />,
    );

    await act(async () => {
      await moment();
    });

    expect(container.textContent).not.toContain('An error was thrown');
    expect(container.textContent).toContain('MSM Tool');
    expect(editor!.getDocument('markdown')).toBe('run <tool name="msm-tool" label="MSM Tool" />');
  });
});
