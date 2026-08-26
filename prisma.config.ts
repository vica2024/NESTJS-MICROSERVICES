import { defineConfig } from 'prisma/config';

// 用 process.env 直接读，而不是 prisma/config 的 env() helper：后者在变量缺失时会直接抛错，
// 但 CI 的类型检查 job 不需要真的连库，只是跑 `npm ci` 触发 postinstall 的 `prisma generate`
// （它只读 schema 生成代码，不会真的连接 datasource），所以给个占位符即可。
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://placeholder:placeholder@localhost:26257/placeholder',
  },
});
