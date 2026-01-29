import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/db';
import { MembershipService } from './membership.service';

/**
 * SubscriptionService 作为 API 层，负责接收订阅 webhook
 * 实际的业务逻辑处理由 jobs-service 中的 SubscriptionHandlerService 负责
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipService,
  ) {}

  /**
   * 验证订阅 webhook 并返回 shopifyCustomerId
   * 实际的处理由后台 worker 完成
   */
  async validateSubscriptionWebhook(payload: any): Promise<{
    shopifyCustomerId: string;
  }> {
    // 从 webhook payload 中提取关键信息
    const customerId = this.extractCustomerId(payload);

    if (!customerId) {
      this.logger.warn(`[Subscription] Missing customer ID in webhook`, payload);
      throw new Error('Invalid subscription webhook: missing customerId');
    }

    return { shopifyCustomerId: customerId };
  }

  private extractCustomerId(payload: any): string {
    // 根据具体 Shopify 数据结构调整
    // 示例: payload.customer_id 或 payload.billing_cycle?.customer?.id
    return (
      payload.customer_id ||
      payload.billing_cycle?.customer?.id ||
      payload.customer?.id ||
      ''
    );
  }
}
