import { nanoid } from 'nanoid';
import type { PrismaClient } from './generated/prisma/client';
import type { Bid, Listing, TickerRow } from './types';

// Workers 每次请求都是一个全新的连接（见 prisma.ts），跟 CockroachDB 建连 + 起事务比本地跑
// 慢不少，Prisma $transaction 默认的 maxWait/timeout（2s/5s）在这个场景下太紧张，容易超时。
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

function toListing(row: {
  id: string;
  name: string;
  url: string;
  tagline: string | null;
  category: string;
  avatarUrl: string | null;
  totalCents: number;
  clicks: number;
  createdAt: bigint;
  updatedAt: bigint;
}): Listing {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    tagline: row.tagline,
    category: row.category,
    avatar_url: row.avatarUrl,
    total_cents: row.totalCents,
    clicks: row.clicks,
    created_at: Number(row.createdAt),
    updated_at: Number(row.updatedAt),
  };
}

function toBid(row: {
  id: string;
  listingId: string;
  amountCents: number;
  status: string;
  paymentSessionId: string | null;
  createdAt: bigint;
  paidAt: bigint | null;
}): Bid {
  return {
    id: row.id,
    listing_id: row.listingId,
    amount_cents: row.amountCents,
    status: row.status as Bid['status'],
    payment_session_id: row.paymentSessionId,
    created_at: Number(row.createdAt),
    paid_at: row.paidAt === null ? null : Number(row.paidAt),
  };
}

// 榜单：只按累计出价金额降序，出价高的天然排前面，不需要额外的名次逻辑
export async function getLeaderboard(prisma: PrismaClient, limit = 200): Promise<Listing[]> {
  const rows = await prisma.listing.findMany({
    where: { totalCents: { gt: 0 } },
    orderBy: [{ totalCents: 'desc' }, { updatedAt: 'asc' }],
    take: limit,
  });
  return rows.map(toListing);
}

export async function getListing(prisma: PrismaClient, id: string): Promise<Listing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  return row ? toListing(row) : null;
}

// 用网址匹配已有条目：同一个网址/handle 再次提交时，追加出价而不是新建条目
export async function getListingByUrl(prisma: PrismaClient, url: string): Promise<Listing | null> {
  const row = await prisma.listing.findFirst({ where: { url } });
  return row ? toListing(row) : null;
}

const TOP_OVERTAKE_MARGIN_CENTS = 500; // 追平/超过第一名，要比第一名多至少 $5
const OVERTAKE_MARGIN_CENTS = 100; // 超过第一名以外的任意一位，只要比那一位多至少 $1（连带超过排在它后面的所有人）

// 算出「这次出价后的总额」至少要达到多少，才能真的往榜上挪一位——不看自己原来的总额，
// 只看紧挨着排在自己上面的那一位是谁：如果那一位正好是第一名，要求多 $5；否则只要多 $1。
// 已经是第一名（或榜上没有比自己高的）时不需要超过谁，返回 0。
export async function minRequiredTotalCents(
  prisma: PrismaClient,
  opts: { excludeListingId: string | null; existingTotalCents: number }
): Promise<number> {
  const nextAbove = await prisma.listing.findFirst({
    where: {
      totalCents: { gt: opts.existingTotalCents },
      ...(opts.excludeListingId ? { id: { not: opts.excludeListingId } } : {}),
    },
    orderBy: { totalCents: 'asc' },
  });
  if (!nextAbove) return 0;

  const top = await prisma.listing.findFirst({ orderBy: { totalCents: 'desc' } });
  const margin = top && top.id === nextAbove.id ? TOP_OVERTAKE_MARGIN_CENTS : OVERTAKE_MARGIN_CENTS;
  return nextAbove.totalCents + margin;
}

export async function createPendingListing(
  prisma: PrismaClient,
  data: { name: string; url: string; tagline: string; category: string; avatarUrl: string | null }
): Promise<Listing> {
  const id = nanoid(10);
  const now = Date.now();
  const row = await prisma.listing.create({
    data: {
      id,
      name: data.name,
      url: data.url,
      tagline: data.tagline || null,
      category: data.category,
      avatarUrl: data.avatarUrl,
      totalCents: 0,
      clicks: 0,
      createdAt: BigInt(now),
      updatedAt: BigInt(now),
    },
  });
  return toListing(row);
}

export async function createPendingBid(
  prisma: PrismaClient,
  listingId: string,
  amountCents: number,
  sessionId: string
): Promise<string> {
  const id = nanoid(12);
  await prisma.bid.create({
    data: {
      id,
      listingId,
      amountCents,
      status: 'pending',
      paymentSessionId: sessionId,
      createdAt: BigInt(Date.now()),
    },
  });
  return id;
}

export async function registerClick(prisma: PrismaClient, id: string): Promise<Listing | null> {
  const row = await prisma.listing.findUnique({ where: { id } });
  if (!row) return null;
  await prisma.listing.update({ where: { id }, data: { clicks: { increment: 1 } } });
  return toListing(row);
}

// 顶部走马灯用的最近成交记录
export async function recentPaidBids(prisma: PrismaClient, limit = 12): Promise<TickerRow[]> {
  const rows = await prisma.bid.findMany({
    where: { status: 'paid' },
    orderBy: { paidAt: 'desc' },
    take: limit,
    include: { listing: { select: { name: true } } },
  });
  return rows
    .filter((r) => r.paidAt !== null)
    .map((r) => ({
      id: r.listingId,
      name: r.listing.name,
      amount_cents: r.amountCents,
      paid_at: Number(r.paidAt),
    }));
}

export async function deleteListing(prisma: PrismaClient, id: string): Promise<void> {
  await prisma.$transaction(
    [prisma.bid.deleteMany({ where: { listingId: id } }), prisma.listing.delete({ where: { id } })],
    TRANSACTION_OPTIONS
  );
}

const ONLINE_WINDOW_MS = 90_000; // 90 秒内有心跳就算在线
const PRESENCE_STALE_MS = 10 * 60_000; // 顺手清掉 10 分钟前的旧记录，presence 表不会无限增长

// 记录/刷新一个访客的在线心跳，顺带清理过期记录
export async function touchPresence(prisma: PrismaClient, sessionId: string): Promise<void> {
  const now = Date.now();
  await prisma.$transaction(
    [
      prisma.presence.upsert({
        where: { sessionId },
        create: { sessionId, lastSeen: BigInt(now) },
        update: { lastSeen: BigInt(now) },
      }),
      prisma.presence.deleteMany({ where: { lastSeen: { lt: BigInt(now - PRESENCE_STALE_MS) } } }),
    ],
    TRANSACTION_OPTIONS
  );
}

export async function countOnline(prisma: PrismaClient): Promise<number> {
  return prisma.presence.count({ where: { lastSeen: { gt: BigInt(Date.now() - ONLINE_WINDOW_MS) } } });
}

// 只在新访客第一次来的时候 +1（靠客户端的 visitor_id cookie 判断是否是新访客）
// 用 upsert 而不是 update：这一行本该在建表时插好，一旦不知道什么原因丢了，
// 用 update 会直接抛错（P2025 记录不存在），首页每个新访客都会跟着 500，
// upsert 能自愈，不会因为这一行数据被删就拖垮整个首页
export async function incrementTotalVisits(prisma: PrismaClient): Promise<void> {
  await prisma.siteStats.upsert({
    where: { id: 1 },
    create: { id: 1, totalVisits: 1 },
    update: { totalVisits: { increment: 1 } },
  });
}

export async function getTotalVisits(prisma: PrismaClient): Promise<number> {
  const row = await prisma.siteStats.findUnique({ where: { id: 1 } });
  return row?.totalVisits ?? 0;
}
