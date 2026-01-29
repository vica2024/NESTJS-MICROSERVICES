import crypto from 'crypto';

/**
 * Shopify webhook HMAC 校验（后面你接入真实 webhook 再启用）
 * 注意：Shopify 是 base64 的 HMAC-SHA256
 */
export function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string, secret: string): boolean {
  const digest = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}
