#!/usr/bin/env node
import * as dotenv from "dotenv";
import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { ClaudeDialogStack } from "../lib/claude-dialog-stack";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const app = new cdk.App();

new ClaudeDialogStack(app, "ClaudeDialogStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
