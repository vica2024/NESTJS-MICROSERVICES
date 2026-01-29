import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOBS, QUEUE_NAMES, ProcessWebhookInboxPayload, ProcessSubscriptionWebhookPayload, SyncCustomerTagPayload } from '@app/queue';

@Injectable()
export class QueueService {
  @InjectQueue(QUEUE_NAMES.WEBHOOKS) private readonly webhookQueue!: Queue;
  @InjectQueue(QUEUE_NAMES.MEMBERSHIP) private readonly membershipQueue!: Queue;

  async enqueueProcessInbox(payload: ProcessWebhookInboxPayload) {
    await this.webhookQueue.add(JOBS.PROCESS_WEBHOOK_INBOX, payload, {
      attempts: 10,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async enqueueProcessSubscriptionWebhook(payload: ProcessSubscriptionWebhookPayload) {
    await this.membershipQueue.add(JOBS.PROCESS_SUBSCRIPTION_WEBHOOK, payload, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async enqueueTagSync(payload: SyncCustomerTagPayload) {
    await this.membershipQueue.add(JOBS.SYNC_CUSTOMER_TAG, payload, {
      attempts: 5, // BullMQ 管理重试次数
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
