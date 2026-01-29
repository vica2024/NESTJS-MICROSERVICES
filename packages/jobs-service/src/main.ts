import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // worker 不需要开 HTTP
  await NestFactory.createApplicationContext(AppModule);
  // eslint-disable-next-line no-console
  console.log('jobs-service started (worker mode)');
}
bootstrap();
