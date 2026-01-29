import { Body, Controller, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  // POST /webhooks/shopify?shop=demo.myshopify.com&topic=test
  @Post('shopify')
  @HttpCode(200)
  async shopifyWebhook(
    @Query('shop') shopDomain: string,
    @Query('topic') topic: string,
    @Headers('x-shopify-webhook-id') webhookId: string | undefined,
    @Body() body: any,
  ) {
    await this.webhooks.ingestShopify({
      shopDomain,
      topic: topic || 'unknown',
      eventId: webhookId ?? this.webhooks.hashPayload(body),
      payload: body,
    });
    return { ok: true };
  }
}
