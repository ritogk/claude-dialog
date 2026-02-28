import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Database } from './constructs/database';
import { Api } from './constructs/api';
import { Frontend } from './constructs/frontend';
import { Distribution } from './constructs/distribution';
import { Voicevox } from './constructs/voicevox';

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

    const voicevox = new Voicevox(this, 'Voicevox');

    new Distribution(this, 'Distribution', {
      siteBucket: frontend.siteBucket,
      functionUrl: api.functionUrl,
      voicevoxFunctionUrl: voicevox.functionUrl,
      domainName,
      hostedZoneName,
    });
  }
}
