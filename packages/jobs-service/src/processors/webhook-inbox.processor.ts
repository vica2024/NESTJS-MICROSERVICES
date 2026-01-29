import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '@app/db';
import { JOBS, QUEUE_NAMES, ProcessWebhookInboxPayload } from '@app/queue';

@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookInboxProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== JOBS.PROCESS_WEBHOOK_INBOX) return;

    const { inboxId } = job.data as ProcessWebhookInboxPayload;

    // 并发抢锁：只允许 pending -> processing 成功的那个 worker 继续
    const locked = await this.prisma.webhookInbox.updateMany({
      where: { id: inboxId, status: 'pending' },
      data: { status: 'processing' },
    });

    if (locked.count === 0) return { skipped: true };

    try {
      const inbox = await this.prisma.webhookInbox.findUnique({ where: { id: inboxId } });
      if (!inbox) return { missing: true };

      // v1：先只做"处理完成标记"
      await this.prisma.webhookInbox.update({
        where: { id: inboxId },
        data: { status: 'done', processedAt: new Date(), error: null },
      });

      return { ok: true };
    } catch (e: any) {
      await this.prisma.webhookInbox.update({
        where: { id: inboxId },
        data: {
          status: 'failed',
          processedAt: new Date(),
          error: (e?.message ?? 'unknown').slice(0, 500),
        },
      });
      throw e; // 让 BullMQ retry
    }
  }
}
