import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '@app/db';
import { QUEUE_NAMES, JOBS, SyncCustomerTagPayload } from '@app/queue';

export interface SubscriptionWebhookPayload {
  id?: string;
  status?: string;
  admin_api_id?: string;
  customer_id?: string;
  current_period_end?: string;
  created_at?: string;
  occurred_at?: string;
  updated_at?: string;
  // Shopify App Billing structure
  app_subscription?: {
    id: string;
    status: string;
    current_period_end?: string;
    created_at?: string;
    updated_at?: string;
  };
  billing_cycle?: {
    activated_on?: string;
    billing_on?: string;
    end_date?: string;
  };
  // 其他可能的字段
  [key: string]: any;
}

export interface MembershipState {
  tier: 'guest' | 'pro';
  isProEffective: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  pastDueSince?: Date;
}

@Injectable()
export class SubscriptionHandlerService {
  private readonly logger = new Logger(SubscriptionHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.MEMBERSHIP) private readonly membershipQueue: Queue,
  ) {}

  /**
   * 处理 Shopify subscription webhook
   * 支持多种 topic: billing_subscription_contracts/create|update|delete
   */
  async handleSubscriptionEvent(input: {
    shopId: string;
    inboxId: string;
    topic: string;
    payload: SubscriptionWebhookPayload;
    receivedAt: Date;
  }): Promise<{ customerId: string; tier: 'guest' | 'pro' }> {
    const { shopId, topic, payload, receivedAt } = input;

    // 1. 提取关键信息
    const subscriptionId = this.extractSubscriptionId(payload);
    const customerId = this.extractCustomerId(payload);
    const eventTimestamp = this.extractEventTimestamp(payload, receivedAt);
    const status = this.normalizeStatus(this.extractStatus(payload));

    if (!subscriptionId || !customerId) {
      this.logger.warn(`[SubscriptionHandler] Missing required fields: subscriptionId=${subscriptionId}, customerId=${customerId}`, {
        topic,
        payload,
      });
      throw new Error('Missing subscriptionId or customerId in subscription webhook');
    }

    this.logger.log(`[SubscriptionHandler] Processing ${topic}: sub=${subscriptionId}, customer=${customerId}, status=${status}`);

    // 2. 确保 customer 存在
    const customer = await this.ensureCustomer(shopId, customerId);

    // 3. 处理事件
    if (topic.includes('delete')) {
      return this.handleSubscriptionDelete(shopId, customer.id, customer.shopifyCustomerId);
    } else {
      return this.handleSubscriptionUpsert(shopId, customer.id, customer.shopifyCustomerId, subscriptionId, status, eventTimestamp, payload);
    }
  }

  private async ensureCustomer(shopId: string, shopifyCustomerId: string) {
    let customer = await this.prisma.customer.findUnique({
      where: { shopId_shopifyCustomerId: { shopId, shopifyCustomerId } },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          shopId,
          shopifyCustomerId,
        },
      });
      this.logger.log(`[SubscriptionHandler] Created customer: ${customer.id}`);
    }

    return customer;
  }

  private async handleSubscriptionUpsert(
    shopId: string,
    customerId: string,
    shopifyCustomerId: string,
    subscriptionId: string,
    status: string,
    eventTimestamp: Date,
    payload: SubscriptionWebhookPayload,
  ): Promise<{ customerId: string; tier: 'guest' | 'pro' }> {
    // 1. 获取 period end
    const currentPeriodEnd = this.extractCurrentPeriodEnd(payload);

    // 2. 获取 past_due_since (仅当 status=past_due 时)
    const pastDueSince = status === 'past_due' ? eventTimestamp : null;

    // 3. Upsert SubscriptionRecord（防止乱序：检查 updated_at）
    const existingRecord = await this.prisma.subscriptionRecord.findUnique({
      where: { shopId_provider_subscriptionId: { shopId, provider: 'shopify', subscriptionId } },
    });

    // 如果现有记录更新时间更晚，跳过此更新（防止乱序覆盖）
    if (existingRecord && existingRecord.updatedAt > eventTimestamp) {
      this.logger.warn(
        `[SubscriptionHandler] Skipping outdated event for subscription ${subscriptionId}: existingUpdate=${existingRecord.updatedAt}, eventTime=${eventTimestamp}`,
      );
      // 返回现有的 tier 状态
      const membership = await this.prisma.membershipStatus.findUnique({
        where: { customerId },
      });
      return {
        customerId: shopifyCustomerId,
        tier: (membership?.tier || 'guest') as 'guest' | 'pro',
      };
    }

    const subscription = await this.prisma.subscriptionRecord.upsert({
      where: { shopId_provider_subscriptionId: { shopId, provider: 'shopify', subscriptionId } },
      update: {
        status,
        currentPeriodEnd,
        pastDueSince,
        raw: payload,
        updatedAt: eventTimestamp,
      },
      create: {
        shopId,
        customerId,
        provider: 'shopify',
        subscriptionId,
        status,
        currentPeriodEnd,
        pastDueSince,
        raw: payload,
      },
    });

    this.logger.log(`[SubscriptionHandler] Upserted subscription ${subscriptionId}: status=${status}`);

    // 4. 计算新的 membership 状态
    const membershipState = this.calculateMembershipState(status, currentPeriodEnd, pastDueSince);

    // 5. Upsert MembershipStatus
    const membership = await this.prisma.membershipStatus.upsert({
      where: { customerId },
      update: {
        tier: membershipState.tier,
        isProEffective: membershipState.isProEffective,
        effectiveFrom: membershipState.effectiveFrom,
        effectiveTo: membershipState.effectiveTo,
        pastDueSince: membershipState.pastDueSince,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        customerId,
        tier: membershipState.tier,
        isProEffective: membershipState.isProEffective,
        effectiveFrom: membershipState.effectiveFrom,
        effectiveTo: membershipState.effectiveTo,
        pastDueSince: membershipState.pastDueSince,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(
      `[SubscriptionHandler] Updated membership for customer ${customerId}: tier=${membership.tier}, isProEffective=${membership.isProEffective}`,
    );

    // 6. 入队 tag 同步任务
    await this.enqueueTagSync(shopId, shopifyCustomerId, membership.tier === 'pro');

    return {
      customerId: shopifyCustomerId,
      tier: membership.tier as 'guest' | 'pro',
    };
  }

  private async handleSubscriptionDelete(shopId: string, customerId: string, shopifyCustomerId: string): Promise<{ customerId: string; tier: 'guest' | 'pro' }> {
    // 订阅被删除 → 客户变为 Guest
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });

    if (!customer) {
      return { customerId: '', tier: 'guest' };
    }

    const membership = await this.prisma.membershipStatus.upsert({
      where: { customerId },
      update: {
        tier: 'guest',
        isProEffective: false,
        effectiveFrom: null,
        effectiveTo: null,
        pastDueSince: null,
        lastSyncedAt: new Date(),
      },
      create: {
        customerId,
        tier: 'guest',
        isProEffective: false,
        lastSyncedAt: new Date(),
      },
    });

    this.logger.log(`[SubscriptionHandler] Deleted subscription, set customer to guest: ${customerId}`);

    // 入队 tag 同步任务（移除 pro tag）
    await this.enqueueTagSync(shopId, shopifyCustomerId, false);

    return {
      customerId: shopifyCustomerId,
      tier: 'guest',
    };
  }

  /**
   * 根据订阅状态计算会员状态
   */
  private calculateMembershipState(status: string, currentPeriodEnd: Date, pastDueSince: Date | null): MembershipState {
    const now = new Date();

    switch (status) {
      case 'active':
        return {
          tier: 'pro',
          isProEffective: true,
          effectiveFrom: now,
          effectiveTo: currentPeriodEnd,
        };

      case 'past_due':
        // past_due: 3天宽限期
        const gracePeriodEnd = pastDueSince ? new Date(pastDueSince) : now;
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

        const isStillInGracePeriod = now <= gracePeriodEnd;

        return {
          tier: isStillInGracePeriod ? 'pro' : 'guest',
          isProEffective: isStillInGracePeriod,
          effectiveFrom: pastDueSince || undefined,
          effectiveTo: gracePeriodEnd,
          pastDueSince: pastDueSince || undefined,
        };

      case 'canceled':
        // canceled: 有效期至 current_period_end
        const isCanceledButValid = now < currentPeriodEnd;

        return {
          tier: isCanceledButValid ? 'pro' : 'guest',
          isProEffective: isCanceledButValid,
          effectiveTo: currentPeriodEnd,
        };

      case 'expired':
      default:
        return {
          tier: 'guest',
          isProEffective: false,
        };
    }
  }

  // ========== 辅助方法 ==========

  private extractSubscriptionId(payload: SubscriptionWebhookPayload): string {
    return payload.id || payload.admin_api_id || payload.app_subscription?.id || '';
  }

  private extractCustomerId(payload: SubscriptionWebhookPayload): string {
    return payload.customer_id || (payload.billing_cycle as any)?.customer_id || '';
  }

  private extractStatus(payload: SubscriptionWebhookPayload): string {
    return payload.status || payload.app_subscription?.status || 'active';
  }

  private normalizeStatus(status: string): string {
    const lowerStatus = status.toLowerCase().trim();
    const validStatuses = ['active', 'past_due', 'canceled', 'expired'];
    return validStatuses.includes(lowerStatus) ? lowerStatus : 'active';
  }

  private extractEventTimestamp(payload: SubscriptionWebhookPayload, fallback: Date): Date {
    // 优先级: occurred_at > updated_at > created_at > fallback
    const timestamps = [payload.occurred_at, payload.updated_at, payload.app_subscription?.updated_at, payload.created_at];

    for (const ts of timestamps) {
      if (ts) {
        try {
          const parsed = new Date(ts);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    return fallback;
  }

  private extractCurrentPeriodEnd(payload: SubscriptionWebhookPayload): Date {
    let endDateStr = payload.current_period_end || payload.app_subscription?.current_period_end || payload.billing_cycle?.end_date;

    try {
      if (endDateStr) {
        const parsed = new Date(endDateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }

    // 默认: 30天后
    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    return defaultEnd;
  }

  /**
   * 入队客户 tag 同步任务
   */
  private async enqueueTagSync(shopId: string, shopifyCustomerId: string, shouldBePro: boolean): Promise<void> {
    try {
      // 获取 Shop 信息以获取 shopDomain 和 accessToken
      const shop = await this.prisma.shop.findUnique({
        where: { id: shopId },
      });

      if (!shop) {
        this.logger.warn(`[SubscriptionHandler] Shop not found: ${shopId}`);
        return;
      }

      const payload: SyncCustomerTagPayload = {
        shopId,
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        shopifyCustomerId,
        shouldBePro,
      };

      await this.membershipQueue.add(JOBS.SYNC_CUSTOMER_TAG, payload, {
        attempts: 5, // 最多重试 5 次
        backoff: {
          type: 'exponential',
          delay: 2000, // 初始延迟 2 秒
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `[SubscriptionHandler] Enqueued tag sync job: shopDomain=${shop.shopDomain}, customerId=${shopifyCustomerId}, shouldBePro=${shouldBePro}`,
      );
    } catch (error: any) {
      // 不影响主流程，仅记录错误
      this.logger.error(
        `[SubscriptionHandler] Failed to enqueue tag sync job for ${shopifyCustomerId}:`,
        error.message,
      );
    }
  }
}
