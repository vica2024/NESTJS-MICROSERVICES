import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/db';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '@app/queue';
import { WebhookInboxProcessor } from './processors/webhook-inbox.processor';

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
    BullModule.registerQueue({ name: QUEUE_NAMES.WEBHOOKS }),
  ],
  providers: [WebhookInboxProcessor],
})
export class AppModule {}
