/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MessageContent from './MessageContent';

vi.mock('@/features/Conversation/Markdown', () => ({
  default: ({ children }: any) => <div data-testid="markdown-message">{children}</div>,
}));

vi.mock('../useMarkdown', () => ({
  useMarkdown: () => ({}),
}));

vi.mock('./FileListViewer', () => ({ default: () => null }));
vi.mock('./ImageFileListViewer', () => ({ default: () => null }));
vi.mock('./VideoFileListViewer', () => ({ default: () => null }));
vi.mock('./AudioFileListViewer', () => ({ default: () => null }));
vi.mock('./PageSelections', () => ({ default: () => null }));
vi.mock('@/components/CollapsibleContent', () => ({
  default: ({ children }: any) => <>{children}</>,
}));
vi.mock('@/store/chat/utils/cleanSpeakerTag', () => ({
  cleanSpeakerTag: (content: string) => content,
}));

describe('msm User MessageContent markdown', () => {
  it('renders markdown even when editorData exists', () => {
    render(
      <MessageContent
        content={'markdown-content'}
        createdAt={Date.now()}
        editorData={{ root: { children: [], type: 'root', version: 1 } }}
        id={'msg-1'}
        role={'user'}
        updatedAt={Date.now()}
      />,
    );

    expect(screen.getByTestId('markdown-message')).toHaveTextContent('markdown-content');
    expect(screen.queryByTestId('rich-message')).not.toBeInTheDocument();
  });
});
