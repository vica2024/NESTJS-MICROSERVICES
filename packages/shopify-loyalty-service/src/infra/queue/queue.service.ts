import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { JOBS, QUEUE_NAMES, ProcessWebhookInboxPayload } from '@app/queue';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(QUEUE_NAMES.WEBHOOKS) private readonly queue: Queue) {}

  async enqueueProcessInbox(payload: ProcessWebhookInboxPayload) {
    await this.queue.add(JOBS.PROCESS_WEBHOOK_INBOX, payload, {
      attempts: 10,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
