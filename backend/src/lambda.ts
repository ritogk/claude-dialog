import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication } from '@nestjs/common';
import serverlessExpress from '@codegenie/serverless-express';
import express from 'express';
import { AppModule } from './app.module';
import { MessageService } from './message/message.service';
import { ConfigService } from '@nestjs/config';

declare const awslambda: {
  streamifyResponse: (handler: any) => any;
  HttpResponseStream: {
    from: (stream: any, metadata: any) => any;
  };
};

let cachedApp: INestApplication;
let cachedServer: any;

async function bootstrap() {
  if (!cachedApp) {
    const expressApp = express();
    cachedApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
    );
    cachedApp.enableCors();
    await cachedApp.init();
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return { app: cachedApp, server: cachedServer };
}

function isSSERequest(event: any): boolean {
  const path = event.rawPath || event.path || '';
  const method = event.requestContext?.http?.method || event.httpMethod || '';
  return (
    method === 'POST' && /\/api\/conversations\/[^/]+\/messages\/stream/.test(path)
  );
}

function checkAuth(event: any, configService: ConfigService): boolean {
  const expectedKey = configService.get<string>('apiKey');
  if (!expectedKey) return true;
  const apiKey = event.headers?.['x-api-key'] || '';
  return apiKey === expectedKey;
}

async function handleSSE(event: any, responseStream: any) {
  const { app } = await bootstrap();
  const messageService = app.get(MessageService);
  const configService = app.get(ConfigService);

  if (!checkAuth(event, configService)) {
    const httpStream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
    });
    httpStream.write(JSON.stringify({ message: 'Unauthorized' }));
    httpStream.end();
    return;
  }

  const path = event.rawPath || event.path || '';
  const match = path.match(/\/api\/conversations\/([^/]+)\/messages\/stream/);
  const conversationId = match?.[1] || '';
  const body = event.body
    ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body)
    : {};

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });

  try {
    for await (const chunk of messageService.sendAndStream(
      conversationId,
      body.content,
    )) {
      httpStream.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (error: any) {
    const errorEvent = JSON.stringify({
      type: 'error',
      error: error.message || 'An unexpected error occurred',
    });
    httpStream.write(`data: ${errorEvent}\n\n`);
  }

  httpStream.end();
}

async function handleRegular(
  event: any,
  responseStream: any,
  context: any,
) {
  const { server } = await bootstrap();

  // serverless-express returns a promise (not callback-based)
  const response: any = await server(event, context);

  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: response.statusCode,
    headers: response.headers || {},
  });

  if (response.body) {
    const body = response.isBase64Encoded
      ? Buffer.from(response.body, 'base64')
      : response.body;
    httpStream.write(body);
  }

  httpStream.end();
}

export const handler = awslambda.streamifyResponse(
  async (event: any, responseStream: any, context: any) => {
    if (isSSERequest(event)) {
      await handleSSE(event, responseStream);
    } else {
      await handleRegular(event, responseStream, context);
    }
  },
);
