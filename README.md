# 🛡️ NestJS Auth Service

该NestJS仓库构建了一个基于微服务架构的可扩展SaaS解决方案，采用模块化设计和清晰的代码结构，利用TypeScript确保类型安全。核心功能包括多租户支持、JWT身份验证和基于角色的访问控制。系统集成RESTful API和WebSocket实现实时通信，主数据库使用PostgreSQL，Redis负责缓存和队列管理。Docker容器化部署，Kubernetes实现弹性扩缩容。监控集成Prometheus和Grafana。代码强调可测试性，包含Jest单元测试和集成测试。CI/CD流水线自动化部署，遵循领域驱动设计（DDD）原则划分服务边界，确保可维护性。

# 📁 项目结构


```bash

nestjs-saas-project/
│
├── packages/                      #微服务应用包
│   ├── auth-service/              #权鉴服务
│   │   └── ...
│   ├── config-service/            #统一配置中心
│   │   └── ...
│   ├── gateway-service/           #网关服务
│   │   └── ...
│   ├── user-service/              #用户服务
│   │   └── ...
│   └── libs                       #公共服务
│
├── proto/
│   └── user_service.proto         # gRPC 通信协议文件
├── package.json
├── README.md


```

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

