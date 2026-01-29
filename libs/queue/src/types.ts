export type ProcessWebhookInboxPayload = {
  shopId: string;
  inboxId: string;
};

export type ProcessSubscriptionWebhookPayload = {
  shopId: string;
  inboxId: string;
};

export type SyncCustomerTagPayload = {
  shopId: string;
  shopDomain: string; // 用于调用 Shopify API
  accessToken: string; // Shopify access token
  shopifyCustomerId: string;
  shouldBePro: boolean; // true: 确保有 pro tag, false: 确保没有 pro tag
};
