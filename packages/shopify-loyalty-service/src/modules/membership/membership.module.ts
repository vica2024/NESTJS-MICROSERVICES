import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/db';
import { QueueModule } from '../../infra/queue/queue.module';
import { MembershipService } from './membership.service';
import { SubscriptionService } from './subscription.service';
import { TagSyncService } from './tag-sync.service';
import { MembershipController } from './membership.controller';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [MembershipController],
  providers: [MembershipService, SubscriptionService, TagSyncService],
  exports: [MembershipService, SubscriptionService, TagSyncService],
})
export class MembershipModule {}
