import { Hono } from 'hono';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Bindings, Theme } from './types';
import { CATEGORY_KEYS } from './types';
import { getPolar } from './polar';
import { doc } from './render';
import * as db from './db';
import { prismaMiddleware } from './prisma';
import type { PrismaClient } from './prisma';
import { Layout } from './components/Layout';
import { HomePage } from './components/HomePage';
import { RulesPage } from './components/RulesPage';
import { AboutPage } from './components/AboutPage';
import { classifyInput, isPrivateHost, fetchUrlMeta } from './fetchMeta';
import { DEFAULT_LOCALE, ALL_LOCALES, NON_DEFAULT_LOCALES, isLocale, getDictionary, localizedPath } from './i18n';
import type { Locale } from './i18n';

type Env = { Bindings: Bindings; Variables: { prisma: PrismaClient } };

const app = new Hono<Env>();
app.use('*', prismaMiddleware());

function detectLocaleFromHeader(c: Context): Locale {
  const header = (c.req.header('accept-language') || '').toLowerCase();
  for (const l of ALL_LOCALES) {
    if (header.includes(l.toLowerCase())) return l;
  }
  return DEFAULT_LOCALE;
}

// 主题偏好存在 cookie 里，服务端渲染时就能带上正确的 data-theme，避免刷新时先闪一下默认主题
function resolveTheme(c: Context): Theme {
  return getCookie(c, 'theme') === 'light' ? 'light' : 'dark';
}

const VISITOR_COOKIE = 'visitor_id';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

// 匿名访客 id，只用来判断"在线"和"第一次来"，不做别的追踪
function getOrSetVisitorId(c: Context<Env>): { id: string; isNew: boolean } {
  const existing = getCookie(c, VISITOR_COOKIE);
  if (existing) return { id: existing, isNew: false };
  const id = crypto.randomUUID();
  setCookie(c, VISITOR_COOKIE, id, {
    maxAge: VISITOR_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  });
  return { id, isNew: true };
}

// 每种语言各自的一套页面路由（挂在不同前缀下）。之所以不用 Hono 的 :lang{a|b|c} 正则参数，
// 是因为在这个 Hono 版本里，正则里排在第一位的分支会被当成前缀匹配，把 /ja/rules 这种子路径也
// 错误地匹配到 /ja 首页——改成每种语言各自的字面量前缀子应用就没有这个问题。
function createLocaleRoutes(locale: Locale) {
  const sub = new Hono<Env>();
  const t = getDictionary(locale);

  sub.get('/', async (c) => {
    const prisma = c.get('prisma');
    const { id: visitorId, isNew } = getOrSetVisitorId(c);

    // presence/visit 写入和榜单读取互不依赖，并成一批并发请求，不再串行等两趟数据库往返
    const [leaderboard, online, totalVisits] = await Promise.all([
      db.getLeaderboard(prisma),
      db.countOnline(prisma),
      db.getTotalVisits(prisma),
      db.touchPresence(prisma, visitorId),
      isNew ? db.incrementTotalVisits(prisma) : Promise.resolve(),
    ]);
    return c.html(
      doc(
        <Layout title={t.pageTitles.home} t={t} locale={locale} path="" theme={resolveTheme(c)}>
          <HomePage leaderboard={leaderboard} online={online} totalVisits={totalVisits} t={t} locale={locale} />
        </Layout>
      )
    );
  });

  sub.get('/rules', (c) =>
    c.html(
      doc(
        <Layout title={t.pageTitles.rules} t={t} locale={locale} path="/rules" theme={resolveTheme(c)}>
          <RulesPage t={t} />
        </Layout>
      )
    )
  );

  sub.get('/about', (c) =>
    c.html(
      doc(
        <Layout title={t.pageTitles.about} t={t} locale={locale} path="/about" theme={resolveTheme(c)}>
          <AboutPage t={t} />
        </Layout>
      )
    )
  );

  return sub;
}

for (const locale of NON_DEFAULT_LOCALES) {
  app.route(`/${locale}`, createLocaleRoutes(locale));
}
app.route('/', createLocaleRoutes(DEFAULT_LOCALE));

// 心跳：前端每隔一段时间调用一次，刷新这个访客的在线状态
app.post('/api/presence/ping', async (c) => {
  const { id: visitorId } = getOrSetVisitorId(c);
  await db.touchPresence(c.get('prisma'), visitorId);
  return c.json({ ok: true });
});

app.get('/api/leaderboard', async (c) => c.json(await db.getLeaderboard(c.get('prisma'))));
app.get('/api/ticker', async (c) => c.json(await db.recentPaidBids(c.get('prisma'), 12)));

// 创建 Stripe Checkout：新条目 或 给已有条目追加出价
// 错误统一返回语义化的 code（不返回已翻译好的文案），由前端按当前语言的字典翻译显示
const MAX_BID_CENTS = 100_000_00; // 客户端出价的上限保护，10 万美元，防止异常大数值打到 Stripe

app.post('/api/checkout', async (c) => {
  const prisma = c.get('prisma');
  const body = await c.req.parseBody();
  const lang: Locale = isLocale(String(body.lang || '')) ? (body.lang as Locale) : DEFAULT_LOCALE;
  const t = getDictionary(lang);
  const existingId = body.listing_id ? String(body.listing_id) : '';
  const baseMinBid = Number(c.env.MIN_BID_CENTS || '500');

  // 每一笔支付本身的绝对下限（防止金额小到 Polar 自己都拒），具体够不够往榜上挪位置，
  // 等下面知道目标条目之后再按排名规则判断
  const requestedCents = Math.round(Number(body.bid_amount_cents));
  if (!Number.isFinite(requestedCents) || requestedCents < baseMinBid || requestedCents > MAX_BID_CENTS) {
    return c.json({ error: 'BID_TOO_LOW' }, 400);
  }
  const amountCents = requestedCents;

  let listing = existingId ? await db.getListing(prisma, existingId) : null;
  // 新条目要等出价校验通过了才真正 insert，不然出价不够时会留一堆 total_cents=0 的孤儿条目
  let pendingListing: { name: string; url: string; tagline: string; category: string; avatarUrl: string | null } | null =
    null;

  if (!listing) {
    // 新建条目分支：名称/简介/头像完全靠抓取网址或 Twitter handle 自动生成，不需要用户手填
    const raw = String(body.input || '').trim();
    const category = String(body.category || '');
    if (!raw) return c.json({ error: 'MISSING_INPUT' }, 400);
    if (!CATEGORY_KEYS.includes(category as (typeof CATEGORY_KEYS)[number])) {
      return c.json({ error: 'MISSING_CATEGORY' }, 400);
    }

    const parsed = classifyInput(raw);
    if (!parsed) return c.json({ error: 'INVALID_INPUT' }, 400);

    let url: string;
    let name = '';
    let tagline = '';
    let avatarUrl: string | null = null;

    if (parsed.type === 'twitter') {
      // 暂时跳过账号是否存在的校验：依赖的第三方服务 unavatar.io 偶尔会超时/变慢，
      // 之前误把超时当成"账号不存在"挡在支付页外面，先去掉这道检查，直接允许提交
      url = `https://x.com/${parsed.handle}`;
      name = `@${parsed.handle}`;
      avatarUrl = `https://unavatar.io/twitter/${parsed.handle}`;
    } else {
      let target: URL;
      try {
        target = new URL(parsed.url);
      } catch {
        return c.json({ error: 'INVALID_URL_FORMAT' }, 400);
      }
      if (!/^https?:$/.test(target.protocol) || isPrivateHost(target.hostname)) {
        return c.json({ error: 'UNSUPPORTED_URL' }, 400);
      }
      url = target.toString();
      // 先确认这个网址真的能访问，访问不了就不允许继续到支付页
      try {
        const meta = await fetchUrlMeta(target);
        name = meta.name;
        tagline = meta.tagline;
        avatarUrl = meta.avatar_url;
      } catch {
        return c.json({ error: 'URL_UNREACHABLE' }, 400);
      }
      if (!name) name = target.hostname.replace(/^www\./, '');
    }

    // 同一个网址/handle 已经在榜上，视为追加出价，而不是新建一条重复条目
    const existing = await db.getListingByUrl(prisma, url);
    if (existing) {
      listing = existing;
    } else {
      pendingListing = { name: name.slice(0, 60), url, tagline: tagline.slice(0, 140), category, avatarUrl };
    }
  }

  // 出价要跟目标名次挂钩：追平/超过第一名，这笔之后的总额要比第一名多至少 $5；
  // 超过第一名以外的任意一位，只要比那一位的总额多至少 $1 就行（见 db.minRequiredTotalCents）
  const existingTotal = listing ? listing.total_cents : 0;
  const minRequiredTotal = await db.minRequiredTotalCents(prisma, {
    excludeListingId: listing?.id ?? null,
    existingTotalCents: existingTotal,
  });
  if (existingTotal + amountCents < minRequiredTotal) {
    return c.json({ error: 'BID_TOO_LOW' }, 400);
  }

  if (!listing) {
    listing = await db.createPendingListing(prisma, pendingListing!);
  }

  // Polar 是 Merchant of Record，出价对应的产品要在 Polar 后台建成 "Pay what you want"
  // 定价类型，这里创建 checkout 时才能按用户选的金额（amountCents）覆盖价格。
  const polar = getPolar(c.env);
  const checkout = await polar.checkouts.create({
    products: [c.env.POLAR_PRODUCT_ID],
    amount: amountCents,
    metadata: { listing_id: listing.id },
    successUrl: `${c.env.SITE_URL}${localizedPath(lang, '/')}?paid=1&listing=${listing.id}`,
    // Polar 结账页没有单独的 cancel_url，returnUrl 是用户点"返回"时去的地方，语义上最接近
    returnUrl: `${c.env.SITE_URL}${localizedPath(lang, '/')}?canceled=1`,
  });

  if (!checkout.url) return c.json({ error: 'CHECKOUT_FAILED' }, 500);

  await db.createPendingBid(prisma, listing.id, amountCents, checkout.id);
  return c.json({ url: checkout.url });
});

// 点击跳转：先记一次点击，再 302 到目标站点
app.get('/go/:id', async (c) => {
  const listing = await db.registerClick(c.get('prisma'), c.req.param('id'));
  if (!listing) {
    const t = getDictionary(detectLocaleFromHeader(c));
    return c.text(t.listingNotFound, 404);
  }
  return c.redirect(listing.url, 302);
});

// 极简管理接口：下架违规条目，用 Bearer token 鉴权
app.delete('/api/admin/listing/:id', async (c) => {
  const token = c.req.header('authorization')?.replace('Bearer ', '');
  if (!token || token !== c.env.ADMIN_TOKEN) return c.text('unauthorized', 401);
  await db.deleteListing(c.get('prisma'), c.req.param('id'));
  return c.json({ ok: true });
});

export default app;
