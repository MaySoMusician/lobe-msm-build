/**
 * @vitest-environment happy-dom
 */
import { type IEditor } from '@lobehub/editor';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import InternalEditor from './InternalEditor';

const captured = vi.hoisted(() => ({
  editor: undefined as any,
  toolbar: undefined as any,
}));

vi.mock('@lobehub/editor/react', () => ({
  Editor: Object.assign(
    vi.fn((props: any) => {
      captured.editor = props;
      return <div data-testid="editor" />;
    }),
    {
      withProps: (plugin: any, props: any) => {
        if (props?.children?.props?.floating) captured.toolbar = props.children.props;
        return plugin;
      },
    },
  ),
  useEditorState: () => ({}),
}));

vi.mock('@lobehub/editor', () => {
  const plugin = (name: string) => Object.assign(vi.fn(), { pluginName: name });
  return {
    ReactAlertPlugin: plugin('alert'),
    ReactChartPlugin: plugin('chart'),
    ReactFootnotePlugin: plugin('footnote'),
    ReactImagePlugin: plugin('image'),
    ReactLinkPlugin: plugin('link'),
    ReactLiteXmlPlugin: plugin('litexml'),
    ReactMathPlugin: plugin('math'),
    ReactMentionPlugin: plugin('mention'),
    ReactTablePlugin: plugin('table'),
    ReactToolbarPlugin: plugin('toolbar'),
    ReactVideoPlugin: plugin('video'),
  };
});

vi.mock('@/libs/editor/plainText/ReactPlainTextPlugin', () => ({
  default: Object.assign(vi.fn(), { pluginName: 'plainText' }),
}));

vi.mock('@/features/ChatInput/InputEditor/plugins', () => ({
  createChatInputRichPlugins: () => [Object.assign(vi.fn(), { pluginName: 'chips' })],
}));

vi.mock('./richList/RichListPlugin', () => ({
  LIST_HEADING_ATTRIBUTE: 'data-list-heading',
  ReactRichListPlugin: Object.assign(vi.fn(), { pluginName: 'richList' }),
}));
vi.mock('./richList/OrderedListNumberMenu', () => ({ default: () => null }));
vi.mock('./rehostImage', () => ({ needsImageRehost: () => true, rehostImage: vi.fn() }));
vi.mock('./InlineToolbar', () => ({ default: () => <div /> }));
vi.mock('./useImageUpload', () => ({ useFileUpload: () => vi.fn(), useImageUpload: () => vi.fn() }));
vi.mock('@lobechat/const', () => ({ isDesktop: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const editor = {
  getDocument: vi.fn(),
  getLexicalEditor: vi.fn(() => undefined),
  setDocument: vi.fn(),
} as unknown as IEditor;

const names = () => (captured.editor.plugins as any[]).map((plugin) => plugin.pluginName);

describe('msm InternalEditor stays plain text', () => {
  beforeEach(() => {
    captured.editor = undefined;
    captured.toolbar = undefined;
  });

  it('loads plain-text props and only chip, LiteXML and attachment plugins', () => {
    render(<InternalEditor editor={editor} />);

    expect(captured.editor).toMatchObject({
      autoFormatMarkdown: false,
      enablePasteMarkdown: false,
      markdownOption: false,
      pasteAsPlainText: true,
      pasteVSCodeAsCodeBlock: false,
    });
    expect(names()).toEqual(
      expect.arrayContaining(['litexml', 'chips', 'mention', 'image', 'video']),
    );
    for (const rich of ['alert', 'chart', 'footnote', 'link', 'math', 'table', 'richList']) {
      expect(names()).not.toContain(rich);
    }
  });

  it('keeps custom plugin sets plain text too', () => {
    const custom = Object.assign(vi.fn(), { pluginName: 'custom' });

    render(<InternalEditor editor={editor} plugins={[custom]} />);

    expect(names()).toEqual(['plainText', 'custom']);
  });

  it('shows no formatting toolbar, only a selection toolbar for given actions', () => {
    render(<InternalEditor editor={editor} />);
    expect(names()).not.toContain('toolbar');

    const ask = { key: 'ask', label: 'Ask' };
    render(<InternalEditor editor={editor} toolbarExtraItems={[ask]} />);
    expect(names()).toContain('toolbar');
    expect(captured.toolbar).toMatchObject({ extraItems: [ask], selectionOnly: true });
  });
});
