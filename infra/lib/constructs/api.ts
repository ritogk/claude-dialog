import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ApiProps {
  table: dynamodb.Table;
  anthropicApiKey: string;
  apiKey: string;
}

export class Api extends Construct {
  public readonly httpApi: apigatewayv2.HttpApi;
  public readonly apiEndpoint: string;

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
              'npm install --omit=dev --no-package-lock',
            ].join(' && '),
          ],
        },
      }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      environment: {
        DYNAMODB_TABLE_NAME: props.table.tableName,
        ANTHROPIC_API_KEY: props.anthropicApiKey,
        API_KEY: props.apiKey,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    });

    props.table.grantReadWriteData(handler);

    const integration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      handler,
    );

    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: 'claude-dialog-api',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'X-API-Key'],
        maxAge: cdk.Duration.hours(1),
      },
    });

    this.httpApi.addRoutes({
      path: '/api/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration,
    });

    this.apiEndpoint = this.httpApi.apiEndpoint;
  }
}
