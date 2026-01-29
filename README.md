# 🎯 Shopify Checkout-Safe 会员/积分系统

企业级微服务项目，基于 NestJS + Prisma + PostgreSQL + BullMQ + Redis，实现 Shopify Webhook 幂等处理、状态可追溯、积分不乱账、Worker 可重试的完整链路。

## 架构原则

- **Webhook 幂等性**：单一真值源（UNIQUE 约束），重复消息自动去重
- **状态机完整**：pending → processing → done|failed，支持人工介入
- **原子操作**：并发抢锁（updateMany + 条件），避免脑裂
- **可重试性**：指数退避 + 10 次重试，失败记录详情
- **宁可少，不乱账**：v1 只做 inbox 落库 + 标记，严谨保守

## 快速开始

### 1. 依赖安装
```bash
yarn install
```

### 2. 启动基础设施
```bash
docker-compose up -d
```

### 3. 数据库迁移
```bash
yarn db:migrate
```

### 4. 启动服务
```bash
# 终端 1: API (3000)
yarn start:shopify-loyalty

# 终端 2: Worker
yarn start:jobs

# 或并行
yarn start:all
```

## 本地测试

### Seed Shop
```bash
curl -X POST http://localhost:3000/shops/seed \
  -H "Content-Type: application/json" \
  -d '{"shopDomain":"demo.myshopify.com","accessToken":"shpat_xxx"}'
```

### 发送 Webhook
```bash
curl -X POST "http://localhost:3000/webhooks/shopify?shop=demo.myshopify.com&topic=orders/create" \
  -H "Content-Type: application/json" \
  -H "x-shopify-webhook-id: test-webhook-id-1" \
  -d '{"order_id":123,"total":99.99}'
```

返回 `{ "ok": true }` → 自动入队 → Worker 处理

# 🚀 快速开始

1. 安装依赖

```bash
npm install
```

or

```bash
yarn install
```

2. 启动服务

默认 REST + gRPC 同时启动：

```bash
npm run start:all
# REST 服务运行在 http://localhost:3000
# gRPC 服务运行在 localhost:5001
```

# 📞 联系与反馈

如需定制 NestJS 微服务架构、gRPC 接入、OAuth2 接入，欢迎联系项目维护者 。

