import { NestFactory } from '@nestjs/core';
import { ConstomConfigModule as ConfigModule } from './config.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
async function bootstrap() {
  const port = process.env.CONFIG_SERVICE_PORT || 6000;  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(ConfigModule, {
    transport: Transport.GRPC,
    options: {
      package: 'config',
      protoPath: join(__dirname, '../../proto/config_service.proto'),
      url: `0.0.0.0:${port}`, // 配置服务监听端口
    },
  });
  await app.listen();
  console.log('CONFIG_SERVICE: running on port', port);
}

bootstrap();
