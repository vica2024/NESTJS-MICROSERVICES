import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/db';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取或创建客户
   */
  async ensureCustomer(shopId: string, shopifyCustomerId: string, email?: string) {
    return this.prisma.customer.upsert({
      where: {
        shopId_shopifyCustomerId: { shopId, shopifyCustomerId },
      },
      create: {
        shopId,
        shopifyCustomerId,
        email: email || '',
      },
      update: {
        email: email || undefined,
      },
    });
  }

  /**
   * 获取客户 membership 状态
   */
  async getCustomerMembership(shopId: string, shopifyCustomerId: string) {
    const customer = await this.ensureCustomer(shopId, shopifyCustomerId);

    const membership = await this.prisma.membershipStatus.findUnique({
      where: { customerId: customer.id },
      include: {
        customer: true,
      },
    });

    if (!membership) {
      // 创建默认 Guest 状态
      return this.prisma.membershipStatus.create({
        data: {
          customerId: customer.id,
          tier: 'guest',
          isProEffective: false,
        },
        include: { customer: true },
      });
    }

    return membership;
  }

  /**
   * 获取所有需要同步标签的客户
   */
  async getPendingTagSyncMembers(shopId: string, limit: number = 10) {
    return this.prisma.membershipStatus.findMany({
      where: {
        customer: { shopId },
      },
      include: { customer: true },
      take: limit,
    });
  }
}
