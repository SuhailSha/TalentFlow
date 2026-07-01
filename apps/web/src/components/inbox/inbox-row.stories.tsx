import type { Meta, StoryObj } from '@storybook/react';

import type { NotificationView } from '@/types/notifications';
import { InboxRow } from './inbox-row';

const meta: Meta<typeof InboxRow> = {
  title: 'Inbox/InboxRow',
  component: InboxRow,
  parameters: {
    layout: 'padded',
  },
};
export default meta;

type Story = StoryObj<typeof InboxRow>;

const base: NotificationView = {
  id: 'n-1',
  organizationId: 'org-1',
  recipientId: 'u-1',
  channel: 'IN_APP',
  status: 'DELIVERED',
  title: 'Alice on Sarah Smith × REQ-0014',
  body: 'Great fit. Want to push to onsite? Comms were solid, tech screen average.',
  reminderId: null,
  metadata: {},
  readAt: null,
  deliveredAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const Unread: Story = {
  args: { notification: base },
};

export const Read: Story = {
  args: {
    notification: { ...base, readAt: new Date().toISOString() },
  },
};

export const Selected: Story = {
  args: { notification: base, selected: true },
  parameters: {
    docs: {
      description: {
        story: 'Selected in detail view — brand-tinted background + 2px left bar.',
      },
    },
  },
};

export const LongTitle: Story = {
  args: {
    notification: {
      ...base,
      title: 'Diego mentioned you in Maria López notes about work authorization for the federal contract role',
      body: 'Can we check work auth before we push the offer? She mentioned needing sponsorship.',
    },
  },
};
