import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@app/db';
import { JOBS, QUEUE_NAMES, SyncCustomerTagPayload } from '@app/queue';
import { ShopifyAdminApiClient } from '@app/shopify';

/**
 * 同步客户标签到 Shopify
 * - 可重试（由 BullMQ 管理重试逻辑）
 * - 幂等操作：重复执行不产生副作用
 * - 失败时更新 MembershipStatus 的 tagSyncError 字段
 */
@Processor(QUEUE_NAMES.MEMBERSHIP)
export class TagSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(TagSyncProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name !== JOBS.SYNC_CUSTOMER_TAG) return;

    const { shopId, shopDomain, accessToken, shopifyCustomerId, shouldBePro } = job.data as SyncCustomerTagPayload;

    try {
      // 1. 获取客户
      const customer = await this.prisma.customer.findUnique({
        where: { shopId_shopifyCustomerId: { shopId, shopifyCustomerId } },
      });

      if (!customer) {
        this.logger.warn(
          `[TagSyncProcessor] Customer not found: shopDomain=${shopDomain}, customerId=${shopifyCustomerId}`,
        );
        return { skipped: true, reason: 'customer_not_found' };
      }

      const membership = await this.prisma.membershipStatus.findUnique({
        where: { customerId: customer.id },
      });

      if (!membership) {
        this.logger.warn(`[TagSyncProcessor] Membership not found for customer ${customer.id}`);
        return { skipped: true, reason: 'membership_not_found' };
      }

      // 2. 调用 Shopify API 同步标签
      const apiClient = new ShopifyAdminApiClient({
        shopDomain,
        accessToken,
      });

      const result = await apiClient.syncCustomerTag(shopifyCustomerId, shouldBePro);

      // 3. 处理结果
      if (!result.success) {
        // 同步失败，记录错误
        await this.prisma.membershipStatus.update({
          where: { customerId: customer.id },
          data: {
            tagSyncError: result.error || 'Unknown error',
          },
        });

        this.logger.error(
          `[TagSyncProcessor] Failed to sync tag: shopDomain=${shopDomain}, customerId=${shopifyCustomerId}, shouldBePro=${shouldBePro}, error=${result.error}`,
        );

        // 由 BullMQ 的 retry 机制处理重试
        throw new Error(`Tag sync failed: ${result.error}`);
      }

      // 4. 同步成功，清除错误标记
      await this.prisma.membershipStatus.update({
        where: { customerId: customer.id },
        data: {
          lastSyncedAt: new Date(),
          tagSyncError: null, // 清除错误
        },
      });

      this.logger.log(
        `[TagSyncProcessor] Successfully synced tag: shopDomain=${shopDomain}, customerId=${shopifyCustomerId}, shouldBePro=${shouldBePro}, action=${result.action}, tags=[${result.tags.join(', ')}]`,
      );

      return {
        success: true,
        action: result.action,
        tags: result.tags,
      };
    } catch (error: any) {
      this.logger.error(
        `[TagSyncProcessor] Error processing tag sync for ${shopifyCustomerId} (attempt ${job.attemptsMade}/${job.opts.attempts}):`,
        error.message,
      );

      // 抛出错误让 BullMQ 处理重试
      throw error;
    }
  }
}


