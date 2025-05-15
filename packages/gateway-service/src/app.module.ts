import { Module } from '@nestjs/common';
import { AuthModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      envFilePath: ['.env'], // 可以指定多个
    }),
    AuthModule, // 导入鉴权模块
  ],
})
export class AppModule {}
