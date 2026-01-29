import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  // eslint-disable-next-line no-console
  console.log('shopify-loyalty-service listening on http://localhost:3000');
}
bootstrap();
