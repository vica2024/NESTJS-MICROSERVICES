# 🛡️ NestJS Auth Service

一个基于 NestJS 的 权限认证微服务，支持 RESTful API 和 gRPC 微服务通信，用于用户登录验证与 JWT 生成。

🎯 本服务作为「鉴权微服务」，通常和「用户微服务」独立部署，并通过 gRPC 通信获取用户信息。

# 📁 项目结构


```bash

nestjs-auth-service/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts     # REST API 控制器
│   │   ├── auth.service.ts        # 鉴权核心逻辑
│   │   ├── jwt.strategy.ts        # JWT 策略验证
│   │   ├── auth.module.ts
│   ├── app.module.ts
│   ├── main.ts                    # 启动 REST + gRPC
│   ├── main.grpc.ts               # 启动纯 gRPC 模式（可选）
├── proto/
│   └── user.proto                 # gRPC 通信协议文件
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
npm run start:dev
# REST 服务运行在 http://localhost:3000
# gRPC 服务运行在 localhost:5001
```

# 🔐 鉴权流程说明

登录接口（REST）http

```bash

# POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "********"
}
```

成功返回：json

```bash

{
  "access_token": "xxxxxx.yyyyy.zzzzz"
}
```

鉴权接口（REST）http

```bash 
GET /auth/profile
Authorization: Bearer <access_token>
gRPC 接口（服务端）
服务定义在 proto/user.proto，如：
```

proto

```bash 
service UserService {
  rpc GetUserByEmail(GetUserByEmailRequest) returns (User) {}
}
```

AuthService 会通过 gRPC 客户端调用远程 UserService 获取用户信息完成登录认证。

# 🧩 环境配置

如需配置 JWT 密钥等敏感信息，建议使用 .env：


``` bash 

JWT_SECRET=yourSecretKey
JWT_EXPIRES_IN=3600s

```
并在 auth.module.ts 中使用 ConfigModule 加载。

# 🔗 gRPC 配置说明
gRPC 客户端配置（auth.module.ts 中）

``` bash 

ClientsModule.register([
  {
    name: 'USER_SERVICE',
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: join(__dirname, '../../proto/user.proto'),
      url: 'localhost:5002',
    },
  },
])
```

# 📦 安装依赖列表

```bash
npm install @nestjs/common @nestjs/core @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/microservices reflect-metadata rxjs grpc @grpc/proto-loader bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

🧪 单元测试（可选）
你可以使用 NestJS 提供的 TestingModule 写测试覆盖 REST 接口逻辑，具体可参考 auth.service.spec.ts。

📌 TODO（可拓展）
 ✅ 实现用户注册功能
 ✅ 支持角色权限管理（RBAC）
 ✅ 集成 OAuth2 / 社交登录
 ✅ 添加 Redis 缓存 token 状态

# 📞 联系与反馈

如需定制 NestJS 微服务架构、gRPC 接入、OAuth2 接入，欢迎联系项目维护者 。

