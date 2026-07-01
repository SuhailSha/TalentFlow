import type { Meta, StoryObj } from '@storybook/react';

import { CommandPalette } from './command-palette';

/**
 * The CommandPalette is a controlled Dialog. In-Storybook interaction
 * uses a wrapper that flips `open` to true so the palette is visible.
 * When Storybook lands, add a `SearchDecorator` that mocks the
 * useSearch hook + useRecentRecords so the search-results state is
 * deterministic.
 */

const meta: Meta<typeof CommandPalette> = {
  title: 'Shell/Command Palette',
  component: CommandPalette,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof CommandPalette>;

export const Empty: Story = {
  args: {
    open: true,
    onOpenChange: () => { /* noop */ },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Palette open with no query. Shows Jump-to + Create sections + ' +
          'Tips section teaching the entity-prefix shortcuts. If the user ' +
          'has recents in localStorage, a "Recent" section appears at top.',
      },
    },
  },
};

export const SearchResults: Story = {
  args: {
    open: true,
    onOpenChange: () => { /* noop */ },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Query "sarah" typed. Results grouped by entity type (Candidates ' +
          'first, then Jobs, Vendors, Submissions). The prefix `c:sarah` ' +
          'filters to candidates only.',
      },
    },
    mockData: [
      { query: 'sarah', results: 4 },  // wired up when the mock is real
    ],
  },
};

export const KeyboardHints: Story = {
  args: {
    open: true,
    onOpenChange: () => { /* noop */ },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Shortcut hints. The Create section shows entity prefixes ' +
          '(c: j: s: i: v:) as right-aligned kbd chips. The Tips section ' +
          'documents ⌘K for opening the palette from anywhere.',
      },
    },
  },
};
