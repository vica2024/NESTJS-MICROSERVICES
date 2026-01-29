import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/db';
import { sha256Hex } from '@app/common';
import { QueueService } from '../../infra/queue/queue.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  hashPayload(payload: any) {
    return sha256Hex(JSON.stringify(payload));
  }

  async ingestShopify(input: { shopDomain: string; topic: string; eventId: string; payload: any }) {
    const shop = await this.prisma.shop.findUnique({ where: { shopDomain: input.shopDomain } });
    if (!shop) return;

    const inbox = await this.prisma.webhookInbox
      .create({
        data: {
          shopId: shop.id,
          provider: 'shopify',
          topic: input.topic || 'unknown',
          eventId: input.eventId,
          payload: input.payload,
        },
      })
      .catch((e) => {
        // Prisma unique 冲突：P2002
        if (e?.code === 'P2002') return null;
        throw e;
      });

    if (!inbox) return;

    await this.queue.enqueueProcessInbox({ shopId: shop.id, inboxId: inbox.id });
  }
}
