import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/db';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { WebhookInboxProcessor } from './processors/webhook-inbox.processor';
import { TagSyncProcessor } from './processors/tag-sync.processor';
import { SubscriptionHandlerService } from './handlers/shopify/subscription.handler';
import { WebhookHandlerFactory } from './handlers/webhook.handler.factory';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WEBHOOKS },
      { name: QUEUE_NAMES.MEMBERSHIP },
    ),
  ],
  providers: [
    WebhookInboxProcessor,
    TagSyncProcessor,
    SubscriptionHandlerService,
    WebhookHandlerFactory,
  ],
})
export class AppModule {}


