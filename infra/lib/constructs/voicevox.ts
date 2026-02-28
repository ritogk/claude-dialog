import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';

export class Voicevox extends Construct {
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const handler = new lambda.DockerImageFunction(this, 'Handler', {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, '..', '..', '..', 'voicevox'),
      ),
      memorySize: 2048,
      timeout: cdk.Duration.seconds(120),
      ephemeralStorageSize: cdk.Size.mebibytes(2048),
      architecture: lambda.Architecture.X86_64,
    });

    this.functionUrl = handler.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['Content-Type'],
        maxAge: cdk.Duration.hours(1),
      },
    });
  }
}
