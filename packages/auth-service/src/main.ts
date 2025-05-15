import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启动 HTTP 接口
  await app.listen(process.env.AUTH_HTTP_PORT);
  // 启动 gRPC 微服务端
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth', 
      protoPath: join(__dirname, '../../proto/auth_service.proto'),
      url: `localhost:${process.env.AUTH_GRPC_PORT}`,
    },
  });
  
  await app.startAllMicroservices();

  console.log(`AUTH_SERVICE:HTTP Server running on http://localhost:${process.env.AUTH_HTTP_PORT}`);
  console.log(`AUTH_SERVICE:gRPC Server running on localhost:${process.env.AUTH_GRPC_PORT}`);
}

bootstrap();
