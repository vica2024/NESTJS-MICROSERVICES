# 项目快速启动指南

## 一键启动

### 1. 安装依赖
```bash
yarn bootstrap
```

### 2. 启动基础设施（PostgreSQL + Redis）
```bash
docker-compose up -d
```

### 3. 初始化数据库
```bash
yarn db:migrate
```

### 4. 启动两个服务
```bash
# 选项 A：并行启动
yarn start:all

# 选项 B：分别启动
# 终端 1
yarn start:shopify-loyalty

# 终端 2  
yarn start:jobs
```

## API 测试清单

### 1. Seed Shop（本地测试数据）
```bash
curl -X POST http://localhost:3000/shops/seed \
  -H "Content-Type: application/json" \
  -d '{
    "shopDomain": "demo.myshopify.com",
    "accessToken": "shpat_test123"
  }'
```

预期响应：Shop 记录（id、createdAt 等）

### 2. 发送 Webhook
```bash
curl -X POST "http://localhost:3000/webhooks/shopify?shop=demo.myshopify.com&topic=orders/create" \
  -H "Content-Type: application/json" \
  -H "x-shopify-webhook-id: webhook-123" \
  -d '{
    "id": "gid://shopify/Order/123",
    "email": "test@example.com",
    "total_price": "99.99"
  }'
```

预期响应：`{ "ok": true }`

观察终端：
- 📝 shopify-loyalty-service：Webhook 已接收，任务已入队
- 🔄 jobs-service：Worker 处理任务 → 标记为 done

### 3. 验证数据库（Prisma Studio）
```bash
yarn db:studio
```

浏览器打开 http://localhost:5555
- 查看 Shop 表 → 看到 demo.myshopify.com
- 查看 WebhookInbox 表 → 看到 status = 'done'

## 重要路径

### 关键业务逻辑
| 路径 | 职责 |
|-----|------|
| `shopify-loyalty-service/src/modules/webhooks/webhooks.service.ts` | Webhook 接收 + 幂等落库 |
| `jobs-service/src/processors/webhook-inbox.processor.ts` | Worker 处理 + 并发锁 + 重试 |

### 扩展点
- **添加业务逻辑**：在 `webhook-inbox.processor.ts` 的 `try` 块中添加（不改架构）
- **新增 Webhook 类型**：更新 `shops.controller.ts` 新增 `@Post(...)` 路由
- **新增队列任务**：在 `libs/queue/src/index.ts` 中添加 JOBS 常量

## 开发模式

### 编译检查
```bash
# 单个库
yarn workspace @app/db build

# 所有
yarn workspace shopify-loyalty-service build
yarn workspace jobs-service build
```

### 类型检查
```bash
npx tsc --noEmit -p libs/db/tsconfig.json
npx tsc --noEmit -p packages/shopify-loyalty-service/tsconfig.json
```

## 常见问题

### Q: Worker 没有处理 Webhook？
**A:**
1. 检查 Redis 是否运行：`docker ps | grep redis`
2. 检查 Shop 是否存在：打开 Prisma Studio 查看
3. 检查 Worker 日志：`yarn start:jobs` 的控制台输出
4. 手动重新入队：更新 WebhookInbox.status = 'pending'

### Q: 如何重复发送同一 Webhook？
**A:** Webhook 已入库（UNIQUE 约束），重复发送会被去重。需要修改 eventId 或删除记录后重试：
```sql
DELETE FROM "WebhookInbox" WHERE "eventId"='webhook-123';
```

### Q: 如何在 Worker 中添加业务逻辑？
**A:** 编辑 `webhook-inbox.processor.ts`：
```typescript
try {
  const inbox = await this.prisma.webhookInbox.findUnique({ where: { id: inboxId } });
  
  // ✅ 你的业务逻辑放这里
  // 示例：积分计算、库存扣减、用户更新等
  console.log('处理 payload:', inbox.payload);
  
  // 标记完成
  await this.prisma.webhookInbox.update({...});
}
```

## 构建 & 部署

### 生产构建
```bash
yarn workspace @app/db build
yarn workspace @app/queue build
yarn workspace @app/common build
yarn workspace @app/shopify build
yarn workspace shopify-loyalty-service build
yarn workspace jobs-service build
```

### Docker 部署示例（待补充）
```dockerfile
# 示例 Dockerfile for shopify-loyalty-service
FROM node:18-alpine
WORKDIR /app
COPY dist/ .
COPY node_modules/ node_modules/
CMD ["node", "packages/shopify-loyalty-service/dist/main.js"]
```

## 设置提示

✅ 所有库已编译通过
✅ 所有 TypeScript 类型正确
✅ Prisma 客户端已生成
✅ API 端点已实现
✅ Worker 已实现

**现在你可以：**
1. 运行本地测试
2. 修改业务逻辑
3. 添加新 API 端点
4. 部署到生产环境
