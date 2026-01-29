export const QUEUE_NAMES = {
  WEBHOOKS: 'webhooks',
  MEMBERSHIP: 'membership', // subscription + tag sync jobs
} as const;

export const JOBS = {
  PROCESS_WEBHOOK_INBOX: 'process-webhook-inbox',
  PROCESS_SUBSCRIPTION_WEBHOOK: 'process-subscription-webhook',
  SYNC_CUSTOMER_TAG: 'sync-customer-tag',
} as const;

export * from './types';
