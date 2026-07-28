/**
 * @vitest-environment happy-dom
 */
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const regenerateUserMessage = vi.hoisted(() => vi.fn());
const updateMessageContent = vi.hoisted(() => vi.fn(async () => undefined));
const toggleMessageEditing = vi.hoisted(() => vi.fn());
const editorModalProps = vi.hoisted(() => ({ current: null as any }));

vi.mock('@/libs/next/dynamic', () => ({
  default: () => (props: any) => {
    editorModalProps.current = props;
    return props.open ? <div data-testid="editor-modal" /> : null;
  },
}));

vi.mock('@/features/Conversation/store', () => ({
  dataSelectors: {
    getDisplayMessageById: () => () => ({ editorData: undefined }),
  },
  useConversationStore: (selector: (s: any) => unknown) =>
    selector({
      regenerateUserMessage,
      toggleMessageEditing,
      updateMessageContent,
    }),
}));

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ allowed: true }),
}));

vi.mock('@lobehub/ui', () => ({
  Flexbox: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('antd-style', () => ({
  createStaticStyles: () => ({
    bubble: 'bubble',
    disabled: 'disabled',
    message: 'message',
  }),
  cssVar: { borderRadiusLG: '8px', colorFillTertiary: '#eee', colorTextSecondary: '#999' },
  cx: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

import MessageContent from './index';

describe('msm ChatItem MessageContent save-only', () => {
  beforeEach(() => {
    regenerateUserMessage.mockClear();
    updateMessageContent.mockClear();
    toggleMessageEditing.mockClear();
    editorModalProps.current = null;
  });

  it('saves edits without regenerating the user message', async () => {
    render(<MessageContent editing id="msg-1" message="original" />);

    expect(editorModalProps.current?.okText).toBe('save');

    await act(async () => {
      await editorModalProps.current.onConfirm('saved', {});
    });

    expect(updateMessageContent).toHaveBeenCalledWith('msg-1', 'saved', {
      editorData: {},
    });
    expect(regenerateUserMessage).not.toHaveBeenCalled();
  });
});
