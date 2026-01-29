-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopifyCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipStatus" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'guest',
    "isProEffective" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "pastDueSince" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionRecord" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'shopify',
    "subscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "pastDueSince" TIMESTAMP(3),
    "raw" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_shopId_idx" ON "Customer"("shopId");

-- CreateIndex
CREATE INDEX "Customer_shopId_email_idx" ON "Customer"("shopId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_shopId_shopifyCustomerId_key" ON "Customer"("shopId", "shopifyCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipStatus_customerId_key" ON "MembershipStatus"("customerId");

-- CreateIndex
CREATE INDEX "MembershipStatus_tier_idx" ON "MembershipStatus"("tier");

-- CreateIndex
CREATE INDEX "MembershipStatus_isProEffective_idx" ON "MembershipStatus"("isProEffective");

-- CreateIndex
CREATE INDEX "SubscriptionRecord_shopId_customerId_status_idx" ON "SubscriptionRecord"("shopId", "customerId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionRecord_shopId_status_idx" ON "SubscriptionRecord"("shopId", "status");

-- CreateIndex
CREATE INDEX "SubscriptionRecord_currentPeriodEnd_idx" ON "SubscriptionRecord"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionRecord_shopId_provider_subscriptionId_key" ON "SubscriptionRecord"("shopId", "provider", "subscriptionId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipStatus" ADD CONSTRAINT "MembershipStatus_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRecord" ADD CONSTRAINT "SubscriptionRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRecord" ADD CONSTRAINT "SubscriptionRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
