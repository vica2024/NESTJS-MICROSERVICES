import type { MiddlewareHandler } from 'hono';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import type { Bindings } from './types';

export type { PrismaClient } from './generated/prisma/client';

// Workers 里每个请求还是建一个短命的 pg.Pool（通过 PrismaPg adapter），请求结束后断开——
// 但连的是 HYPERDRIVE 绑定给的连接串，不是直连 CockroachDB。Hyperdrive 在 Cloudflare 边缘
// 维护到 CockroachDB 的连接池，Worker 这边"新建连接"实际上是连到就近的 Hyperdrive 节点，
// 省掉了每次请求都跟 us-east-2 握手一次 TCP+TLS 的延迟。
export function prismaMiddleware(): MiddlewareHandler<{ Bindings: Bindings; Variables: { prisma: PrismaClient } }> {
  return async (c, next) => {
    const adapter = new PrismaPg({ connectionString: c.env.HYPERDRIVE.connectionString });
    const prisma = new PrismaClient({ adapter });
    c.set('prisma', prisma);
    await next();
    c.executionCtx.waitUntil(prisma.$disconnect());
  };
}
