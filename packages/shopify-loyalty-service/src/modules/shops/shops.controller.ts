import { Body, Controller, Post } from '@nestjs/common';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shops: ShopsService) {}

  // v1：方便你本地插一条 shop（真实环境由 OAuth 安装流程创建）
  @Post('seed')
  async seed(@Body() body: { shopDomain: string; accessToken: string }) {
    return this.shops.upsert(body.shopDomain, body.accessToken);
  }
}
