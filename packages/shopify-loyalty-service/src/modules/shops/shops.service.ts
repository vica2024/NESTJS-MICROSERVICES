import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/db';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(shopDomain: string, accessToken: string) {
    return this.prisma.shop.upsert({
      where: { shopDomain },
      update: { accessToken },
      create: { shopDomain, accessToken },
    });
  }
}
