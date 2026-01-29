# Shopify Customer Tag 投影同步 - 实现总结

## 概述
实现了完整的 Shopify customer tag 投影同步功能，用于在会员状态变更后自动同步 "pro" 标签到 Shopify。

采用异步 job 队列设计：
- 订阅 webhook → 计算会员状态 → 入队 tag 同步任务 → 后台 worker 异步同步

## 新增/修改文件列表

### 1. 新增文件

#### `libs/shopify/src/admin-api.client.ts` (新增)
Shopify Admin API GraphQL 客户端，提供幂等的标签操作

**功能：**
- `addCustomerTag(customerId, tag)` - 为客户添加标签（幂等）
- `removeCustomerTag(customerId, tag)` - 移除客户标签（幂等）
- `syncCustomerTag(customerId, shouldBePro)` - 同步客户标签

**特点：**
- 使用 GraphQL API
- 完全幂等：重复执行不产生副作用
- 支持自定义 API 版本
- 完整错误处理和日志

#### `packages/jobs-service/src/handlers/shopify/subscription.handler.ts` (修改)
订阅事件处理器，新增了 tag 同步的入队逻辑

**新增方法：**
- `enqueueTagSync(shopId, shopifyCustomerId, shouldBePro)` - 入队 tag 同步任务

**改进：**
- 在更新 membership_status 后自动入队 tag 同步任务
- 获取 Shop 的 shopDomain 和 accessToken，传入 job payload
- 错误不影响主流程（日志记录但继续）

### 2. 修改文件

#### `libs/shopify/package.json`
```json
"dependencies": {
  "axios": "^1.7.7",  // 新增，用于 GraphQL 请求
  "crypto": "^1.0.1"
}
```

#### `libs/shopify/src/index.ts`
```typescript
export * from './admin-api.client';  // 新增导出
```

#### `libs/queue/src/types.ts`
更新 `SyncCustomerTagPayload` 类型定义：
```typescript
export type SyncCustomerTagPayload = {
  shopId: string;
  shopDomain: string;        // 新增
  accessToken: string;       // 新增
  shopifyCustomerId: string;
  shouldBePro: boolean;      // 改为 boolean（替代 tier）
};
```

#### `packages/jobs-service/src/processors/tag-sync.processor.ts`
完整重写，使用新的 API client

**改进：**
- 使用 `ShopifyAdminApiClient` 调用真实 API
- 幂等操作：重复执行不产生副作用
- 完整的错误处理和重试
- 将失败的 tag 同步错误记录到 `membershipStatus.tagSyncError`
- 同步成功后清除错误标记

#### `packages/shopify-loyalty-service/src/infra/queue/queue.service.ts`
更新 `enqueueTagSync` 方法：
```typescript
async enqueueTagSync(payload: SyncCustomerTagPayload) {
  await this.membershipQueue.add(JOBS.SYNC_CUSTOMER_TAG, payload, {
    attempts: 5,  // BullMQ 管理重试（改为 5 次）
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
}
```

#### `packages/shopify-loyalty-service/src/modules/membership/tag-sync.service.ts`
更新 `enqueueMembershipTagSync` 方法签名以接收 shopDomain 和 accessToken

## 工作流程

### 订阅 Webhook 处理流程

```
1. POST /webhooks/shopify
   ↓
2. WebhookInboxProcessor (幂等锁)
   ↓
3. SubscriptionHandlerService.handleSubscriptionEvent()
   ├─ 解析事件
   ├─ 确保 Customer 存在
   ├─ Upsert SubscriptionRecord
   ├─ 计算 MembershipStatus (tier + isProEffective)
   ├─ Upsert MembershipStatus
   └─ enqueueTagSync() ← 重要：入队异步任务
   ↓
4. 立即返回 200 OK （tag 同步不阻塞 webhook 处理）
   ↓
5. BullMQ 队列消费 SYNC_CUSTOMER_TAG 任务
   ↓
6. TagSyncProcessor
   ├─ 获取 Shop 信息
   ├─ 创建 ShopifyAdminApiClient
   ├─ syncCustomerTag(customerId, shouldBePro)
   │  ├─ shouldBePro=true → 添加 "pro" 标签
   │  └─ shouldBePro=false → 移除 "pro" 标签
   ├─ 更新 membershipStatus.lastSyncedAt（成功时）
   ├─ 更新 membershipStatus.tagSyncError（失败时）
   └─ 自动重试 (最多 5 次，指数退避)
```

## 关键设计决策

### 1. 异步非阻塞
- Tag 同步不阻塞 webhook 处理
- webhook_inbox 立即标记为 done
- 只有 tag 同步失败时，membershipStatus.tagSyncError 被记录

### 2. 完全幂等
- 重复执行同一个 tag 同步任务 → 相同结果
- `shouldBePro=true` 时，即使已有 "pro" 标签也不报错
- `shouldBePro=false` 时，即使没有 "pro" 标签也不报错
- 所有操作都是 upsert 语义

### 3. 自动重试机制
- BullMQ 指数退避: 2s, 4s, 8s, 16s, 32s（5 次尝试）
- 重试不影响 webhook 处理
- 最终失败被记录到数据库供人工处理

### 4. 错误隔离
```
webhook 处理 ✅        (总是成功)
└─ tag 同步 ❌         (可能失败，但不影响上层)
   └─ 记录到 tagSyncError，等待重试或人工处理
```

## 配置项（可选）

### 环境变量
```bash
# Shopify Admin API 版本（默认 2024-01）
# SHOPIFY_ADMIN_API_VERSION=2024-01

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # 可选

# 数据库
DATABASE_URL=postgresql://...
```

## 数据库变更

### MembershipStatus 表新增字段
```sql
ALTER TABLE membership_status ADD COLUMN tag_sync_error VARCHAR(500) NULL;
```

**已通过迁移 20260129041028 自动创建**

## 测试验证

### 端到端流程测试

```bash
# 1. 创建店铺
curl -X POST http://localhost:3000/shops/seed

# 2. 发送订阅 webhook
curl -X POST http://localhost:3000/webhooks/shopify \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "billing_subscription_contracts/create",
    "payload": {
      "id": "sub-001",
      "customer_id": "cust-001",
      "status": "active",
      "current_period_end": "2026-02-28T00:00:00Z",
      "occurred_at": "2026-01-29T04:24:00Z"
    }
  }'

# 3. 查询会员状态（等待 2 秒让 tag 同步完成）
sleep 2
curl http://localhost:3000/membership/cust-001
```

### 预期行为

1. ✅ webhook 立即返回 200 OK
2. ✅ webhook_inbox 立即标记为 done
3. ✅ membershipStatus 更新为 tier=pro, isProEffective=true
4. ✅ tag 同步 job 入队（不阻塞）
5. ✅ 后台 worker 异步同步 tag
6. ✅ membershipStatus.lastSyncedAt 更新
7. ✅ 如果 Shopify API 调用失败，membershipStatus.tagSyncError 被设置

## 日志输出示例

```
[SubscriptionHandler] Processing billing_subscription_contracts/create: sub=sub-001, customer=cust-001, status=active
[SubscriptionHandler] Updated membership for customer ...: tier=pro, isProEffective=true
[SubscriptionHandler] Enqueued tag sync job: shopDomain=test-shop.myshopify.com, customerId=cust-001, shouldBePro=true

[TagSyncProcessor] Successfully synced tag: shopDomain=test-shop.myshopify.com, customerId=cust-001, shouldBePro=true, action=added, tags=[pro]
```

## 文件统计

- **新增文件**: 1 (admin-api.client.ts)
- **修改文件**: 6
- **总代码行数**: ~500+ 行（含注释）

## 下一步

1. **与 Shopify Functions 集成** - "pro" 标签已同步到 Shopify，可在 Functions 中使用
2. **标签同步失败告警** - 监控 membershipStatus.tagSyncError，人工处理
3. **API 版本升级** - 根据 Shopify API 更新修改 admin-api.client.ts
4. **性能优化** - 批量同步多个客户的标签（如需要）
