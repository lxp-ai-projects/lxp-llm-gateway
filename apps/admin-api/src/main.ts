import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.ADMIN_WEB_ORIGIN ?? 'http://localhost:3003',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3002);
}

void bootstrap();
