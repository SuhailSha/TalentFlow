import type { EmailDeliveryStatus } from './settings';

export interface EmailDelivery {
  id:                string;
  template:          string;
  provider:          string;
  recipientEmail:    string;
  recipientUserId:   string | null;
  subject:           string;
  status:            EmailDeliveryStatus;
  attempts:          number;
  lastAttemptAt:     string | null;
  sentAt:            string | null;
  failedAt:          string | null;
  failureReason:     string | null;
  providerMessageId: string | null;
  resourceType:      string | null;
  resourceId:        string | null;
  createdAt:         string;
  updatedAt:         string;
}

export interface ListDeliveriesParams {
  page?:           number;
  limit?:          number;
  status?:         EmailDeliveryStatus;
  template?:       string;
  recipientEmail?: string;
  resourceType?:   string;
}

export interface CommunicationsStats {
  total24h:  number;
  sent24h:   number;
  failed24h: number;
  pending:   number;
}
