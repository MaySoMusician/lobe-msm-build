/**
 * @vitest-environment happy-dom
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EditorCanvas } from '@/features/EditorCanvas';
import ReadOnlyMarkdown from '@/features/EditorCanvas/ReadOnlyMarkdown';

import SkillViewer from './index';

vi.mock('@/features/EditorCanvas', () => ({ EditorCanvas: vi.fn(() => null) }));
vi.mock('@/features/EditorCanvas/ReadOnlyMarkdown', () => ({ default: vi.fn(() => null) }));
vi.mock('@/features/AgentSkillDetail/ContentViewer', () => ({ default: () => null }));
vi.mock('@/features/FileTree', () => ({ default: () => null }));
vi.mock('@/features/Portal/Document/SkillFrontmatterCard', () => ({ default: () => null }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('msm SkillViewer renders the skill body as Markdown', () => {
  it('uses the Markdown renderer, not an editor, without the frontmatter', () => {
    render(
      <SkillViewer
        content={'---\nname: demo\ndescription: d\n---\n\n# Steps\n\n- one'}
        entityId="skill-1"
      />,
    );

    expect(EditorCanvas).not.toHaveBeenCalled();
    const props = vi.mocked(ReadOnlyMarkdown).mock.lastCall?.[0];
    expect(props?.content).toContain('# Steps');
    expect(props?.content).not.toContain('name: demo');
  });
});
