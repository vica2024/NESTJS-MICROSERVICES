import { Module,OnModuleInit } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.GRPC,
        options: {
          package: 'auth', // 与 proto 文件中定义的 package 保持一致
          protoPath: join(__dirname, '../../../proto/auth_service.proto'), // 这里请确认路径是否正确
          url: 'localhost:5001', 
        },
      },
    ]),
  ],
  controllers: [AuthController],
  exports: [ClientsModule], // 导出以供 Controller 使用
  providers: [],
})

export class AuthModule {}
