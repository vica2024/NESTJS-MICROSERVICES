import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@app/db';
import { QueueModule } from './infra/queue/queue.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ShopsModule } from './modules/shops/shops.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    QueueModule,
    ShopsModule,
    WebhooksModule,
  ],
})
export class AppModule {}
