import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ApiProps {
  table: dynamodb.Table;
  anthropicApiKey: string;
  apiKey: string;
}

export class Api extends Construct {
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: ApiProps) {
    super(scope, id);

    const backendPath = path.join(__dirname, '..', '..', '..', 'backend');

    const handler = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'dist/lambda.handler',
      code: lambda.Code.fromAsset(backendPath, {
        bundling: {
          image: lambda.Runtime.NODEJS_22_X.bundlingImage,
          environment: {
            NPM_CONFIG_CACHE: '/tmp/.npm',
          },
          command: [
            'bash', '-c', [
              'cp -r /asset-input/dist /asset-output/dist',
              'cp /asset-input/package.json /asset-output/',
              'cd /asset-output',
              'npm install --omit=dev --no-package-lock --legacy-peer-deps',
            ].join(' && '),
          ],
        },
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(120),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        ANTHROPIC_API_KEY: props.anthropicApiKey,
        API_KEY: props.apiKey,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    });

    props.table.grantReadWriteData(handler);

    this.functionUrl = handler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['Content-Type', 'X-API-Key'],
        maxAge: cdk.Duration.hours(1),
      },
    });
  }
}
