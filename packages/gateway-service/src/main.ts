import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(); // 启用跨域

  await app.listen(process.env.GATEWAY_HTTP_PORT); // 网关服务监听 3000 端口
    console.log(`GATEWAY_SERVICE:HTTP Server running on http://localhost:${process.env.GATEWAY_HTTP_PORT}`);
}

bootstrap();
