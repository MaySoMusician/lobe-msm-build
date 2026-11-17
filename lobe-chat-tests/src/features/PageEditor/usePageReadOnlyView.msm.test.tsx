/**
 * @vitest-environment happy-dom
 */
import { render, renderHook } from '@testing-library/react';
import { isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EditorCanvas as SharedEditorCanvas } from '@/features/EditorCanvas';
import ReadOnlyMarkdown from '@/features/EditorCanvas/ReadOnlyMarkdown';

import EditorCanvas from './EditorCanvas';
import { usePageReadOnlyView } from './usePageReadOnlyView';

const state = vi.hoisted(() => ({
  canEditResource: true,
  editable: true,
  hasEditPermission: true,
  lockedByOther: false,
  page: {} as Record<string, unknown>,
}));

vi.mock('./store', () => ({
  usePageEditorStore: (selector: (s: Record<string, unknown>) => unknown) => selector(state.page),
}));
vi.mock('./usePageLockedByOther', () => ({ usePageLockedByOther: () => state.lockedByOther }));
vi.mock('./usePageEditable', () => ({ usePageEditable: () => state.editable }));
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ allowed: state.hasEditPermission }),
}));
vi.mock('@/features/ResourcePermission/useResourceAccess', () => ({
  useResourceAccess: () => ({ canEditResource: state.canEditResource }),
}));
vi.mock('@/store/document', () => ({
  useDocumentStore: (selector: (s: unknown) => unknown) =>
    selector({ documents: { doc_1: { content: 'stored **body**' } } }),
}));
vi.mock('@/features/EditorCanvas', () => ({ EditorCanvas: vi.fn(() => null) }));
vi.mock('@/features/EditorCanvas/ReadOnlyMarkdown', () => ({ default: vi.fn(() => null) }));
vi.mock('./collab/usePageCollab', () => ({ usePageCollab: () => undefined }));
vi.mock('./EditorCanvas/useAddCommentItem', () => ({ useAddCommentItem: () => [{ key: 'c' }] }));
vi.mock('./EditorCanvas/useAskCopilotItem', () => ({ useAskCopilotItem: () => [{ key: 'a' }] }));
vi.mock('./EditorCanvas/useDocumentMentionOption', () => ({
  useDocumentMentionOption: () => undefined,
}));
vi.mock('./EditorCanvas/useSlashItems', () => ({ useSlashItems: () => [] }));
vi.mock('@lobehub/editor', () => ({ ReactBlockPlugin: vi.fn() }));
vi.mock('@lobehub/editor/react', () => ({ Editor: { withProps: (plugin: unknown) => plugin } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const pendingBody = () => vi.mocked(SharedEditorCanvas).mock.lastCall?.[0]?.pendingBody;

beforeEach(() => {
  Object.assign(state, {
    canEditResource: true,
    editable: true,
    hasEditPermission: true,
    lockedByOther: false,
    page: { documentId: 'doc_1', editor: { id: 'editor' }, isWorkspacePage: true },
  });
  vi.mocked(SharedEditorCanvas).mockClear();
});

describe('msm read-only pages render Markdown', () => {
  it('is read-only only while the page stays unwritable for this user', () => {
    const view = () => renderHook(() => usePageReadOnlyView()).result.current;
    expect(view()).toBe(false);

    state.lockedByOther = true;
    expect(view()).toBe(true);
    state.lockedByOther = false;

    state.canEditResource = false;
    expect(view()).toBe(true);
    state.canEditResource = true;

    state.page = { ...state.page, collab: { access: 'view', status: 'synced' } };
    expect(view()).toBe(true);
  });

  it('keeps the editor through transient states (lock pending, room connecting)', () => {
    state.page = {
      ...state.page,
      collab: { access: 'edit', status: 'connecting' },
      isLockPending: true,
    };

    expect(renderHook(() => usePageReadOnlyView()).result.current).toBe(false);
  });

  it('shows the live Markdown view in place of the editor on a locked page', () => {
    state.editable = false;
    state.lockedByOther = true;

    render(<EditorCanvas />);

    const body = pendingBody();
    expect(isValidElement(body) && body.type).toBe(ReadOnlyMarkdown);
    expect((body as any).props).toMatchObject({
      content: 'stored **body**',
      editor: { id: 'editor' },
    });
    expect(vi.mocked(SharedEditorCanvas).mock.lastCall?.[0]?.readonlySelectionItems).toBe(
      undefined,
    );
  });

  it('edits in the plain editor when writable', () => {
    render(<EditorCanvas />);

    expect(pendingBody()).toBeUndefined();
  });
});
