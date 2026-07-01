import type { Meta, StoryObj } from '@storybook/react';

import { WorkspaceSwitcher } from './workspace-switcher';

/**
 * Storybook stories (CSF 3) for the WorkspaceSwitcher. Storybook is not
 * yet installed; these files sit alongside the components ready for
 * `npx storybook@latest init --type nextjs` to pick them up.
 *
 * Auth context is required at runtime — an in-app mock decorator will
 * be added when Storybook is wired in Phase 7. For now, the stories
 * document the visual states we expect a designer / QA to review.
 */

const meta: Meta<typeof WorkspaceSwitcher> = {
  title: 'Shell/Workspace Switcher',
  component: WorkspaceSwitcher,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Clickable header row that shows the active workspace and opens ' +
          'a dropdown for tenant switching. Two visual modes: expanded ' +
          '(240px sidebar) and collapsed (60px icon rail).',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof WorkspaceSwitcher>;

export const Expanded: Story = {
  args: { collapsed: false },
  parameters: {
    docs: {
      description: {
        story:
          'Full trigger with monogram, workspace name, role subline, and ' +
          'chevron. Click to open the workspace picker.',
      },
    },
  },
};

export const Collapsed: Story = {
  args: { collapsed: true },
  parameters: {
    docs: {
      description: {
        story:
          'Icon-only trigger (56px sidebar mode). Popover anchors to the ' +
          'right so it never overlaps the icon rail.',
      },
    },
  },
};
