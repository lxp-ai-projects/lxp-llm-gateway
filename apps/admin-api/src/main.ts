import 'dotenv/config';
import 'reflect-metadata';

import { randomUUID } from 'node:crypto';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';

import { AppModule } from './app.module';

const requestIdPattern = /^[A-Za-z0-9._-]{1,128}$/u;

function resolveCorsOrigins(): string[] {
  const configuredOrigins = (
    process.env.ADMIN_WEB_ORIGIN ?? 'http://localhost:3003'
  )
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(
    new Set([
      ...configuredOrigins,
      'http://localhost:3003',
      'http://127.0.0.1:3003',
    ]),
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const httpLogger = new Logger('AdminHttp');
  const requestBodyLimit = process.env.LXP_REQUEST_BODY_LIMIT ?? '10mb';
  app.setGlobalPrefix('api/v1');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const candidate = request.header('x-request-id');
    const requestId =
      candidate && requestIdPattern.test(candidate) ? candidate : randomUUID();
    const startedAt = Date.now();
    request.headers['x-request-id'] = requestId;
    response.setHeader('x-request-id', requestId);
    httpLogger.log({
      event: 'admin.http_request',
      status: 'received',
      requestId,
      method: request.method,
      path: request.path,
    });
    response.on('finish', () => {
      httpLogger.log({
        event: 'admin.http_request',
        status: 'completed',
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        latencyMs: Date.now() - startedAt,
      });
    });
    next();
  });
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: requestBodyLimit }));
  app.use(cookieParser(process.env.LXP_COOKIE_SECRET ?? ''));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: resolveCorsOrigins(),
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3002, process.env.APP_HOST ?? '0.0.0.0');
}

void bootstrap();
