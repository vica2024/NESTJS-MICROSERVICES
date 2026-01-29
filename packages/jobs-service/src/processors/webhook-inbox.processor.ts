import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@app/db';
import { JOBS, QUEUE_NAMES, ProcessWebhookInboxPayload } from '@app/queue';
import { WebhookHandlerFactory } from '../handlers/webhook.handler.factory';

/**
 * Webhook Inbox 处理器
 * 
 * 职责：
 * 1. 从 DB 读取 webhook 记录（幂等）
 * 2. 根据 provider/topic 分发到对应 handler
 * 3. Handler 成功 → 标记 done
 * 4. Handler 失败 → 标记 failed，然后 throw 让 BullMQ 自动重试
 * 
 * 流程：
 * pending → [抢锁] → processing → [handler 处理] → done/failed
 */
@Processor(QUEUE_NAMES.WEBHOOKS)
export class WebhookInboxProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookInboxProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly handlerFactory: WebhookHandlerFactory,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== JOBS.PROCESS_WEBHOOK_INBOX) return;

    const { inboxId } = job.data as ProcessWebhookInboxPayload;

    // ============ 第一步：原子抢锁 ============
    // 并发场景下，只允许一个 worker 成功做 pending → processing
    // 其他 worker 会看到 count=0，直接跳过
    const locked = await this.prisma.webhookInbox.updateMany({
      where: { id: inboxId, status: 'pending' },
      data: { status: 'processing' },
    });

    if (locked.count === 0) {
      this.logger.debug(
        `[WebhookInboxProcessor] Inbox ${inboxId} already processing or not pending, skipping`,
      );
      return { skipped: true };
    }

    try {
      // ============ 第二步：读取 inbox 记录 ============
      const inbox = await this.prisma.webhookInbox.findUnique({
        where: { id: inboxId },
      });

      if (!inbox) {
        this.logger.warn(`[WebhookInboxProcessor] Inbox ${inboxId} not found`);
        // 标记为 done，虽然找不到（可能被其他流程删除）
        return { missing: true };
      }

      this.logger.log(
        `[WebhookInboxProcessor] Processing inbox ${inboxId}: provider=${inbox.provider}, topic=${inbox.topic}, eventId=${inbox.eventId}`,
      );

      // ============ 第三步：根据 provider/topic 分发到 handler ============
      const handler = this.handlerFactory.getHandler(inbox.topic);

      if (!handler) {
        // 无对应 handler，记录警告但标记为 done（不重试）
        this.logger.warn(
          `[WebhookInboxProcessor] No handler found for topic: ${inbox.topic}, provider: ${inbox.provider}`,
        );

        await this.prisma.webhookInbox.update({
          where: { id: inboxId },
          data: {
            status: 'done',
            processedAt: new Date(),
            error: `No handler for topic: ${inbox.topic}`,
          },
        });

        return { handled: false, reason: 'no_handler' };
      }

      // ============ 第四步：调用 handler 处理业务逻辑 ============
      const handlerResult = await handler.handle({
        shopId: inbox.shopId,
        inboxId: inbox.id,
        topic: inbox.topic,
        payload: inbox.payload as any,
        receivedAt: inbox.receivedAt,
      });

      this.logger.log(
        `[WebhookInboxProcessor] Handler processed inbox ${inboxId} successfully: ${JSON.stringify(handlerResult).slice(0, 200)}`,
      );

      // ============ 第五步：标记 inbox 为 done ============
      await this.prisma.webhookInbox.update({
        where: { id: inboxId },
        data: {
          status: 'done',
          processedAt: new Date(),
          error: null,
        },
      });

      this.logger.log(`[WebhookInboxProcessor] Inbox ${inboxId} marked as done`);

      return { ok: true, handled: true };
    } catch (error: any) {
      this.logger.error(
        `[WebhookInboxProcessor] Failed to process inbox ${inboxId} (attempt ${job.attemptsMade}):`,
        error.message,
      );

      // ============ 第六步：标记 inbox 为 failed ============
      try {
        await this.prisma.webhookInbox.update({
          where: { id: inboxId },
          data: {
            status: 'failed',
            processedAt: new Date(),
            error: (error?.message ?? 'Unknown error').slice(0, 500),
          },
        });
        this.logger.log(`[WebhookInboxProcessor] Inbox ${inboxId} marked as failed`);
      } catch (updateError: any) {
        this.logger.error(
          `[WebhookInboxProcessor] Failed to update inbox status:`,
          updateError.message,
        );
      }

      // ============ 第七步：抛出错误让 BullMQ 重试 ============
      // BullMQ 会根据 queue 的 retry 配置自动重试
      throw error;
    }
  }
}


