import { Module } from '@nestjs/common';
import { ConfigController } from './config.controller';
import { ConfigModule } from '@nestjs/config';
@Module({
  controllers: [ConfigController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      envFilePath: ['.env'], // 可以指定多个
    }),
  ],

})
export class ConstomConfigModule {

}
