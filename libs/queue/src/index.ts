export const QUEUE_NAMES = {
  WEBHOOKS: 'webhooks',
} as const;

export const JOBS = {
  PROCESS_WEBHOOK_INBOX: 'process-webhook-inbox',
} as const;

export * from './types';
