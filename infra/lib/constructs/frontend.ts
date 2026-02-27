import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';
import { Construct } from 'constructs';

export interface FrontendProps {
  // No required props
}

export class Frontend extends Construct {
  public readonly siteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, _props: FrontendProps = {}) {
    super(scope, id);

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, 'DeployAssets', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '..', '..', '..', 'frontend', 'dist')),
      ],
      destinationBucket: this.siteBucket,
    });
  }
}
