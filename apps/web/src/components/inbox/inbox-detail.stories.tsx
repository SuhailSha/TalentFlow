import type { Meta, StoryObj } from '@storybook/react';

import type { NotificationView } from '@/types/notifications';
import { InboxDetail } from './inbox-detail';

const meta: Meta<typeof InboxDetail> = {
  title: 'Inbox/InboxDetail',
  component: InboxDetail,
  parameters: { layout: 'fullscreen' },
};
export default meta;

type Story = StoryObj<typeof InboxDetail>;

const sample: NotificationView = {
  id: 'n-1',
  organizationId: 'org-1',
  recipientId: 'u-1',
  channel: 'IN_APP',
  status: 'DELIVERED',
  title: 'Alice on Sarah Smith × REQ-0014',
  body:
    'Phone screen with Sarah went well. She\'s strong on platform reliability ' +
    'and observability. Comms were clear and warm.\n\n' +
    'Bandwidth feels right — she said she could start in 4 weeks if we close ' +
    'fast. Mentioned two competing offers but didn\'t share names.\n\n' +
    '@alice want to push to onsite this week? I think we should move quickly ' +
    'given the competing offers.',
  reminderId: null,
  metadata: {},
  readAt: null,
  deliveredAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const Default: Story = {
  args: { notification: sample },
};

export const LinkedToReminder: Story = {
  args: {
    notification: {
      ...sample,
      reminderId: '11111111-1111-1111-1111-111111111111',
    },
  },
};
