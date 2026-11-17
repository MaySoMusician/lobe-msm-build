import {
  ReactCodemirrorPlugin,
  ReactCodePlugin,
  ReactHRPlugin,
  ReactLinkHighlightPlugin,
  ReactLinkPlugin,
  ReactListPlugin,
  ReactMathPlugin,
  ReactMentionPlugin,
} from '@lobehub/editor';
import { describe, expect, it } from 'vitest';

import ReactPlainTextPlugin from '@/libs/editor/plainText/ReactPlainTextPlugin';

import {
  CHAT_INPUT_EMBED_PLUGINS,
  createChatInputPlainPlugins,
  createChatInputRichPlugins,
  writeChatInputMentionMarkdown,
} from './plugins';

const RICH_PLUGINS = [
  ReactCodemirrorPlugin,
  ReactCodePlugin,
  ReactHRPlugin,
  ReactLinkHighlightPlugin,
  ReactLinkPlugin,
  ReactListPlugin,
  ReactMathPlugin,
];

describe('msm chat input plugins stay plain text', () => {
  it('loads the plain-text plugin and every chip plugin, whatever the options', () => {
    for (const plugins of [
      createChatInputPlainPlugins(),
      createChatInputRichPlugins(),
      createChatInputRichPlugins({ linkPlugin: ReactLinkPlugin, mathPlugin: ReactMathPlugin }),
    ]) {
      expect(plugins[0]).toBe(ReactPlainTextPlugin);
      for (const chip of CHAT_INPUT_EMBED_PLUGINS) expect(plugins).toContain(chip);
      for (const rich of RICH_PLUGINS) expect(plugins).not.toContain(rich);
    }
    expect(CHAT_INPUT_EMBED_PLUGINS).toContain(ReactMentionPlugin);
  });

  it('writes mention chips in the format messages are sent in', () => {
    expect(writeChatInputMentionMarkdown({ label: 'Agent A', metadata: { id: 'a1' } })).toBe(
      '<mention name="Agent A" id="a1" />',
    );
    expect(
      writeChatInputMentionMarkdown({
        label: 'x',
        metadata: { topicId: 't1', topicTitle: 'Plan', type: 'topic' },
      }),
    ).toBe('<refer_topic name="Plan" id="t1" />');
  });
});
