import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('Claude Dialog API')
    .setDescription('Backend API for Claude Dialog')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const yamlString = yaml.dump(document, { noRefs: true });
  fs.writeFileSync('openapi.yml', yamlString, 'utf8');

  console.log('OpenAPI spec written to openapi.yml');

  await app.close();
}

generateOpenApi();
