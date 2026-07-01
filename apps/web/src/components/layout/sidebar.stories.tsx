import type { Meta, StoryObj } from '@storybook/react';

import { Sidebar } from './sidebar';

/**
 * Storybook stories (CSF 3) for the Sidebar. Written to spec so
 * Storybook picks them up when it lands. Every visual state from
 * the approved Phase 1 mockup is represented.
 */

const meta: Meta<typeof Sidebar> = {
  title: 'Shell/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Primary navigation. Same surface mode as canvas (not the ' +
          'dark opaque bar). Two width states: 240px expanded, 60px ' +
          'collapsed. Active state uses a 3px brand-500 left bar in ' +
          'expanded mode; filled brand background in collapsed mode.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Expanded: Story = {
  args: { collapsed: false },
};

export const Collapsed: Story = {
  args: { collapsed: true },
  parameters: {
    docs: {
      description: {
        story:
          'Icon-only rail with hover tooltips showing item labels. ' +
          'Group headers become divider lines; live badges shrink to ' +
          'a 9px dot in the icon\'s top-right corner.',
      },
    },
  },
};

export const DarkMode: Story = {
  args: { collapsed: false },
  parameters: {
    themes: { themeOverride: 'dark' },
    docs: {
      description: {
        story:
          'Same layout in dark mode. Verify contrast on active state and ' +
          'badge fills against the deep-navy surface.',
      },
    },
  },
};

export const CollapsedDarkMode: Story = {
  args: { collapsed: true },
  parameters: {
    themes: { themeOverride: 'dark' },
  },
};
