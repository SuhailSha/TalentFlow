import type { Meta, StoryObj } from '@storybook/react';

import { InboxEmptyState } from './inbox-empty-state';

const meta: Meta<typeof InboxEmptyState> = {
  title: 'Inbox/InboxEmptyState',
  component: InboxEmptyState,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof InboxEmptyState>;

export const InboxZero: Story = {
  args: { variant: 'zero' },
  parameters: {
    docs: {
      description: {
        story:
          'The "you\'re all caught up" state. Success-tinted checkmark + ' +
          'nudge back to actionable work. Never a plain "no items" — ' +
          'the mockup calls for an achievement framing.',
      },
    },
  },
};

export const FilteredEmpty: Story = {
  args: { variant: 'filtered' },
  parameters: {
    docs: {
      description: {
        story:
          'A filter (Mentions / Assigned / Watching) matches nothing. ' +
          'No illustration — this is a transient state; the user just ' +
          'needs a nudge to try another tab.',
      },
    },
  },
};
