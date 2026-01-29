import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/db';
import { QueueService } from '../../infra/queue/queue.service';
import { SyncCustomerTagPayload } from '@app/queue';

/**
 * TagSyncService 作为 API 层
 * 实际的 tag 同步处理由 jobs-service 中的 TagSyncProcessor 负责
 */
@Injectable()
export class TagSyncService {
  private readonly logger = new Logger(TagSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  /**
   * 标记客户标签需要同步
   * 实际同步由后台 worker 完成
   */
  async enqueueMembershipTagSync(
    shopId: string,
    customerId: string,
    shopDomain: string,
    accessToken: string,
    shouldBePro: boolean,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    await this.queue.enqueueTagSync({
      shopId,
      shopDomain,
      accessToken,
      shopifyCustomerId: customer.shopifyCustomerId,
      shouldBePro,
    });

    this.logger.log(
      `[TagSync] Enqueued tag sync for customer ${customer.shopifyCustomerId}: shouldBePro=${shouldBePro}`,
    );
  }
}
