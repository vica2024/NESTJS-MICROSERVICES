-- 初始建表（CockroachDB / Postgres 方言，由 `prisma migrate diff --from-empty` 生成）
-- 这个数据库是跟别的项目共用的，所以不用 Prisma Migrate 的 migrate dev/deploy
-- （它会扫描整库 drift），改成 scripts/migrate.mjs 只管理这几张 payrank_ 前缀的表。

CREATE TABLE "payrank_listings" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "url" STRING NOT NULL,
    "tagline" STRING,
    "category" STRING NOT NULL DEFAULT 'other',
    "avatar_url" STRING,
    "total_cents" INT4 NOT NULL DEFAULT 0,
    "clicks" INT4 NOT NULL DEFAULT 0,
    "created_at" INT8 NOT NULL,
    "updated_at" INT8 NOT NULL,

    CONSTRAINT "payrank_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payrank_bids" (
    "id" STRING NOT NULL,
    "listing_id" STRING NOT NULL,
    "amount_cents" INT4 NOT NULL,
    "status" STRING NOT NULL DEFAULT 'pending',
    "payment_session_id" STRING,
    "created_at" INT8 NOT NULL,
    "paid_at" INT8,

    CONSTRAINT "payrank_bids_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payrank_presence" (
    "session_id" STRING NOT NULL,
    "last_seen" INT8 NOT NULL,

    CONSTRAINT "payrank_presence_pkey" PRIMARY KEY ("session_id")
);

CREATE TABLE "payrank_site_stats" (
    "id" INT4 NOT NULL,
    "total_visits" INT4 NOT NULL DEFAULT 0,

    CONSTRAINT "payrank_site_stats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payrank_listings_total_cents_idx" ON "payrank_listings"("total_cents" DESC);
CREATE UNIQUE INDEX "payrank_bids_payment_session_id_key" ON "payrank_bids"("payment_session_id");
CREATE INDEX "payrank_bids_listing_id_idx" ON "payrank_bids"("listing_id");
CREATE INDEX "payrank_bids_status_paid_at_idx" ON "payrank_bids"("status", "paid_at" DESC);
CREATE INDEX "payrank_presence_last_seen_idx" ON "payrank_presence"("last_seen");

ALTER TABLE "payrank_bids" ADD CONSTRAINT "payrank_bids_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "payrank_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "payrank_site_stats" ("id", "total_visits") VALUES (1, 0);
