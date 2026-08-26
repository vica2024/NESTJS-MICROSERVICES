# PayRank（灵感来自 outbid.lol · Hono + Cloudflare Workers + CockroachDB/Prisma）

一个纯"谁出价高谁排第一"的公开排行榜。核心链路：
提交条目 → 创建 Polar Checkout → 支付成功后由另一个统一处理 Polar webhook 的服务回调 → 累加金额 → 榜单实时更新 → 点击跳转计数。

⚠️ 本项目本身**不接收 Polar webhook**——`order.paid` 事件由另一个网站统一接收，
再直接写这个项目共用的 CockroachDB（改 `payrank_bids`/`payrank_listings` 两张表，
逻辑跟以前 `db.ts` 里的 `markBidPaid` 一样：按 `payment_session_id` 查到 bid，
`status <> 'paid'` 才加钱，同一事务里把 bid 标成 paid、listing 的 `total_cents` 加上去）。

已经过 `tsc --noEmit` 类型检查和 `wrangler deploy --dry-run` 打包验证，可以直接部署。

## 项目简介

PayRank 是一个仿照 [outbid.lol](https://outbid.lol) 思路做的"付费排行榜"网站,技术栈是 **Hono + Cloudflare Workers + CockroachDB (Postgres 协议，通过 Prisma ORM 的 driver adapter 访问)**。核心玩法很纯粹:谁出价高谁排第一。用户提交一个条目(比如产品/项目链接),通过 Polar Checkout 支付一笔钱,支付成功后由另一个统一处理 Polar webhook 的网站回调把金额累加到该条目的总出价上(本项目自己不接收 webhook),榜单按 `total_cents` 降序实时重排——没有单独的排名字段,出价永久生效,不做每日衰减,超越即夺位。首页还有跑马灯、第一名大屏展示,以及点击跳转统计(通过服务端 `/go/:id` 302 而非前端埋点,避免被广告拦截器影响准确性)。

技术上已经跑通提交/展示/点击这部分闭环(webhook 回调交给外部服务处理),通过了 `tsc` 类型检查和 `wrangler deploy --dry-run` 打包验证,配有 GitHub Actions 自动化部署(PR 只做类型检查,合并 main 才跑数据库迁移+部署)。

项目文档也坦诚列出了 MVP 阶段的已知短板:缺少防刷/验证码限流、内容审核靠人工、没有真实在线人数统计(用跑马灯代替)、分类筛选 UI 未做。⚠️ **付费排行榜这个玩法本身跟 Polar 的 Acceptable Use Policy 有冲突**（Polar 明确禁止"付费推广/排名"类产品），账号审核大概率会被拒——详见下面"关于收款方式"一节，上线前务必先确认你的 Polar 账号能不能实际收款，不要假设代码跑通了就等于能收到钱。

## Project Overview

PayRank is a "pay-to-rank" leaderboard site modeled after [outbid.lol](https://outbid.lol), built with **Hono + Cloudflare Workers + CockroachDB (Postgres wire protocol, accessed through Prisma ORM's driver adapter)**. The gameplay is simple: whoever pays the most ranks first. A user submits an entry (e.g. a product or project link), pays through Polar Checkout, and once payment succeeds a separate site that centrally handles Polar webhooks (this project does not receive webhooks itself) adds that amount to the entry's running total — the board re-sorts in real time by `total_cents` descending. There's no separate rank field; bids accumulate permanently with no daily decay, so the top spot belongs to whoever has paid the most until someone outbids them. The homepage also features a scrolling ticker, a hero display for the #1 entry, and click-through tracking done server-side via a `/go/:id` 302 redirect (rather than client-side analytics) so counts stay accurate even with ad blockers or private browsing.

The submit → pay → display loop (excluding the webhook callback, which is handled by an external service) is working end to end, passing `tsc` type checking and a `wrangler deploy --dry-run` build check, with GitHub Actions handling deployment (PRs only run type checks; merging to `main` runs DB migrations and deploys).

The README is upfront about the MVP's current gaps: no anti-spam or rate limiting on submissions, content moderation is manual only, no real online-user count (a ticker stands in for now), category filtering isn't wired into the UI yet. ⚠️ **The pay-to-rank mechanic itself conflicts with Polar's Acceptable Use Policy** (Polar explicitly bans "paid promotion / ranking" products), so account review is likely to reject it — see "About payment methods" below. Confirm your Polar account can actually accept payments before launch; a working build does not mean money will actually move.

## 目录结构

```
prisma/
  schema.prisma        数据模型定义（CockroachDB provider，driver adapter 模式）
src/
  index.tsx           路由入口：页面 + API（不含 webhook，见上方说明）
  db.ts                Prisma 读写封装
  prisma.ts               每请求建一个 PrismaClient 的 Hono 中间件
  polar.ts               Polar 客户端（fetch-based SDK，Workers 上直接用）
  types.ts               类型定义 + 分类枚举
  utils.ts                金额/时间格式化
  render.ts                 拼 <!DOCTYPE html>
  styles.ts                  全局样式（内联注入，无需单独构建 CSS）
  generated/prisma            Prisma 生成的 client 代码（不入库，装依赖时自动生成）
  components/
    Layout.tsx                页面外壳
    HomePage.tsx                跑马灯 + 第一名大屏 + 榜单 + 出价对话框
    RulesPage.tsx, AboutPage.tsx
scripts/
  migrate.mjs           跑 migrations/*.sql，只管理带 payrank_ 前缀的表（这个库跟别的项目共用）
  seed.mjs                跑 seed.sql 铺测试数据
migrations/            手写的 SQL 迁移文件（Postgres/CockroachDB 方言）
seed.sql               测试数据
wrangler.toml          Workers 部署配置
```

## 本地跑起来

```bash
npm install
cp .dev.vars.example .dev.vars   # 填入 Polar sandbox 的 access token + CockroachDB 的 DATABASE_URL
npm run db:migrate                # 建表（跑 migrations/*.sql，只碰带 payrank_ 前缀的表）
npm run db:seed                   # 可选：铺一批测试用的榜单数据
npm run dev                        # http://localhost:8787
```

⚠️ 数据库是跟别的项目共用的一个 CockroachDB 实例（同一个连接串），本地开发和线上环境
连的是**同一个**库，不像以前 D1 那样有 `--local` 隔离的 SQLite；本项目自己的表都带
`payrank_` 前缀，`scripts/migrate.mjs` 只会碰这些表，不会动其它项目的表。

去 [Polar 后台](https://polar.sh)（sandbox 环境）创建一个 **Pay what you want** 类型的一次性产品，把它的 id 填进 `wrangler.toml` 的 `POLAR_PRODUCT_ID`。

⚠️ Polar 的 webhook（`order.paid` 事件）不在这个项目里配置、也不在这里接收——统一
在另一个网站处理，那边直接连这个项目共用的 CockroachDB 改 `payrank_bids` /
`payrank_listings` 两张表。如果要新接一个复用这套 checkout 流程的项目，webhook 那边
要按 `payment_session_id`（也就是 Polar 的 checkout id）找到对应的 bid，具体字段和
幂等要求见上面「本项目不接收 webhook」那段说明。

## 首次手动部署（跑自动化之前先跑一次，把密钥和域名配置好）

```bash
npm run db:migrate                                  # 建表（跟本地用的是同一个库，一般不用重复跑）
wrangler secret put POLAR_ACCESS_TOKEN              # polar_oat_...
wrangler secret put ADMIN_TOKEN                       # 随便一串长随机字符串
npm run deploy
```

Worker 连库不再需要单独设 `DATABASE_URL` 密钥——`wrangler.toml` 里的 `[[hyperdrive]]`
绑定已经在创建时把连接串交给 Cloudflare 托管了，Worker 运行时只从 `env.HYPERDRIVE.connectionString`
拿连接串，密钥本身不会出现在 Worker 的环境变量里。`DATABASE_URL` 只有本地跑
`scripts/migrate.mjs` / `scripts/seed.mjs` / `prisma generate` 这些工具脚本时才用得到，
从 `.dev.vars` 读。如果 CockroachDB 密码轮换了，要重新跑一次
`wrangler hyperdrive update payrank-db --connection-string="新连接串"`。

部署前把 `wrangler.toml` 里的 `POLAR_SERVER` 从 `sandbox` 改成 `production`，`POLAR_PRODUCT_ID`
也要换成 Polar 生产环境下重新创建的那个产品 id（sandbox 和 production 的产品/id 是完全隔离的）。

再把 `wrangler.toml` 里的 `SITE_URL` 改成真实域名后重新部署一次
（Checkout 的 success_url / cancel_url 依赖这个值）。

`wrangler secret put` 设置的密钥保存在 Cloudflare 侧，不是每次部署都要重新设置，
只有密钥轮换的时候才需要再跑一次。

## 自动化部署（GitHub Actions）

代码里已经有 `.github/workflows/deploy.yml`：PR 阶段只跑类型检查，
合并到 `main` 才会依次执行「数据库迁移（scripts/migrate.mjs） → wrangler deploy」，
顺序不能反，不然新代码可能会打到还没建好的表结构上。

CI 里跑迁移需要 `DATABASE_URL` 这个 secret，除了下面的 `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID`，还要在仓库 *Settings → Secrets and variables → Actions*
里再加一条 `DATABASE_URL`（同一个 CockroachDB 连接串）。

### 1. 拿一个 Cloudflare API Token

Cloudflare 后台 → 右上角头像 → *My Profile* → *API Tokens* → *Create Token*，
用自定义权限，至少给这一项（数据库迁移现在是直接连 CockroachDB 跑的，不经过
Cloudflare API，所以不再需要 D1 权限）：

- **Account → Workers Scripts → Edit**

（如果绑了自定义域名，再加一条 **Zone → Workers Routes → Edit**）

### 2. 拿 Account ID

Cloudflare 后台任意 Workers 页面右侧栏能看到 *Account ID*，直接复制。

### 3. 把两个值存进 GitHub Secrets

仓库页面 → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*：

| Name | 值 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 第 1 步生成的 token |
| `CLOUDFLARE_ACCOUNT_ID` | 第 2 步复制的 account id |

### 4. push 到 main 就会自动部署

```bash
git push origin main
```

去仓库的 *Actions* 标签页能看到 `check` → `deploy` 两个 job 依次跑完。
Polar 密钥不在这个流程里——它们是通过 `wrangler secret put` 一次性设置在
Cloudflare 侧的，CI 只负责代码和数据库结构，不需要也不应该把 Polar 密钥
放进 GitHub Secrets 里重复下发。

### 分支策略建议

现在的 workflow 只认 `main` 分支触发部署。功能开发建议开 feature 分支提 PR，
PR 里只跑类型检查（不会碰生产数据库和线上服务），review 通过合并到 `main`
才会真正部署。如果之后想要「PR 也能有独立的预览环境」，需要给 Worker
按 PR 号动态起名（比如 `payrank-pr-42`）并配一个共享的测试用数据库，
这个复杂度更高，等真的需要多人协作测试的时候再加。

## ⚠️ 关于收款方式，这点很重要

**PayRank 这个"付费排行榜"玩法本身，跟 Polar 的 Acceptable Use Policy 有直接冲突。**
Polar 的自动审核明确禁止"付费推广/排行榜排名"类产品，这不是账户资料填得好不好
的问题——已经实测走过一轮申诉，结果是拒绝。而且这条规则是全球统一的，跟商户
注册在哪个国家无关（Polar 走 Stripe Connect Express，150+ 国家/地区都能开户，
但能不能开户和能不能卖这类产品是两回事），Paddle / Lemon Squeezy 这类
Merchant of Record 大概率也是同样的政策，不是换一家就能绕开的结构性限制。

也就是说：**代码能跑通、sandbox 能测通，不代表 production 真的能收到钱**——
Polar 账户审核大概率会在真实开户/上线阶段把这个产品挡下来。上线前务必自己在
Polar 后台走一遍真实的商户审核流程确认清楚，不要假设这份代码等于"已经能收款"。

如果 Polar 这条路走不通，实际可行的替代方案：
- **换回 Stripe**（普通支付网关，不是 Merchant of Record，不需要为你卖的商业
  模式背审核责任）——这个项目最早就是用 Stripe 跑通的完整闭环，代码结构改动
  不大，[src/polar.ts](src/polar.ts) 换成 `stripe.checkout.sessions.create()`
  即可，参考本文件早期版本的 git 历史。
- 如果收款主体在中国大陆、Stripe 也开不了户，需要换成支付宝开放平台当面付 /
  微信支付商户 API，或者接入 PingPP、收钱吧这类聚合支付服务商——这部分需要
  单独接一套签名和回调逻辑，工作量比切换 Stripe/Polar 大得多。

## 已知限制 / 上线前建议再做的事

这是一个能跑通核心链路的 MVP，离"能扛住原版那种爆量流量还不出岔子"还差几件事：

- **防刷 / 反垃圾**：现在谁都能无限提交条目和调用 `/api/checkout`，
  没有验证码或频率限制。建议接 Cloudflare Turnstile，或者对 IP 做简单限流。
- **内容审核**：规则页面写了"不允许色情/诈骗/纯邀请码链接"，但目前完全
  靠人工事后用 `/api/admin/listing/:id` 下架，没有自动关键词过滤。
- **在线人数 / 实时性**：原版有"643 online"这种实时在线人数，这个需要
  Durable Objects 做 WebSocket 连接计数，当前版本没做，先留了跑马灯代替。
- **分类筛选**：`CATEGORIES` 已经定义好了，但首页还没做按分类过滤的
  UI，目前是一个全量榜单。
- **Polar 幂等性**：webhook 处理逻辑现在在另一个网站那边，那边要照着以前
  `markBidPaid` 的做法用 `status = 'paid'` 做幂等判断，不然 webhook 重复投递
  会重复加钱；生产环境建议再加个 Polar 事件 ID 去重表，更保险。

## 一些设计上的取舍

- 排名逻辑就是 `ORDER BY total_cents DESC`，没有单独的"名次"字段，
  这样任何人出价之后榜单自动重新排列，不需要额外维护排名。
- 出价永久累加、不做"每日衰减"（不像 topple.lol 那种每天掉一半），
  和原版 outbid.lol 的规则一致：一旦花了钱，名次就是你的，直到被超越。
- 点击统计走服务端 `/go/:id` 302 跳转而不是前端埋点，这样即使用户
  关广告拦截器 / 隐私模式，点击数也是准的。
