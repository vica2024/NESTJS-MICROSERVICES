import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { MembershipService } from './membership.service';

@Controller('membership')
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  /**
   * GET /membership/:customerId
   * 查询客户的 membership 状态
   * 用于 Shopify Functions 查询 Pro 权益
   */
  @Get(':customerId')
  async getCustomerMembership(
    @Param('customerId') customerId: string,
  ) {
    // 注意: 这里简化处理，实际需要从 request context 获取 shopId
    // TODO: 使用 NestJS guards 从 request 中提取 shopId
    const shopId = 'demo-shop'; // 待调整
    return this.membership.getCustomerMembership(shopId, customerId);
  }

  /**
   * POST /membership/admin/sync-tags
   * 手动触发标签同步 (for testing)
   */
  @Post('admin/sync-tags')
  async syncTags(@Body() body: { shopId: string; batchSize?: number }) {
    // TODO: 调用 TagSyncService.syncPendingTags
    return { ok: true, message: 'Sync queued' };
  }
}
