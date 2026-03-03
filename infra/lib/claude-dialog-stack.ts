import * as cdk from 'aws-cdk-lib';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';
import { Database } from './constructs/database';
import { Api } from './constructs/api';
import { Frontend } from './constructs/frontend';
import { Distribution } from './constructs/distribution';

export class ClaudeDialogStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, { ...props, crossRegionReferences: true });

    const domainName = this.node.tryGetContext('domainName') as string;
    const hostedZoneName = this.node.tryGetContext('hostedZoneName') as string;

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? '';
    const apiKey = process.env.API_KEY ?? '';

    const database = new Database(this, 'Database');

    const api = new Api(this, 'Api', {
      table: database.table,
      anthropicApiKey,
      apiKey,
    });

    const frontend = new Frontend(this, 'Frontend');

    const dist = new Distribution(this, 'Distribution', {
      siteBucket: frontend.siteBucket,
      functionUrl: api.functionUrl,
      domainName,
      hostedZoneName,
    });

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '..', '..', 'frontend', 'dist')),
      ],
      destinationBucket: frontend.siteBucket,
      distribution: dist.distribution,
      distributionPaths: ['/*'],
    });
  }
}
