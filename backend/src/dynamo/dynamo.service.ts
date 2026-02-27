import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

export interface QueryParams {
  pk: string;
  skPrefix?: string;
  indexName?: string;
  gsi1pk?: string;
  scanIndexForward?: boolean;
  limit?: number;
}

@Injectable()
export class DynamoService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('dynamodb.endpoint');
    const region = this.configService.get<string>('dynamodb.region') || 'us-east-1';
    this.tableName = this.configService.get<string>('dynamodb.tableName') || 'claude-dialog';

    const clientConfig: ConstructorParameters<typeof DynamoDBClient>[0] = {
      region,
    };

    if (endpoint) {
      clientConfig.endpoint = endpoint;
    }

    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  async putItem(item: Record<string, any>): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );
  }

  async getItem(pk: string, sk: string): Promise<Record<string, any> | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      }),
    );
    return result.Item || null;
  }

  async query(params: QueryParams): Promise<Record<string, any>[]> {
    const {
      pk,
      skPrefix,
      indexName,
      gsi1pk,
      scanIndexForward,
      limit,
    } = params;

    let keyConditionExpression: string;
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    if (indexName && gsi1pk) {
      // Query on GSI1
      keyConditionExpression = '#gsi1pk = :gsi1pk';
      expressionAttributeNames['#gsi1pk'] = 'GSI1PK';
      expressionAttributeValues[':gsi1pk'] = gsi1pk;
    } else {
      // Query on primary key
      keyConditionExpression = '#pk = :pk';
      expressionAttributeNames['#pk'] = 'PK';
      expressionAttributeValues[':pk'] = pk;

      if (skPrefix) {
        keyConditionExpression += ' AND begins_with(#sk, :skPrefix)';
        expressionAttributeNames['#sk'] = 'SK';
        expressionAttributeValues[':skPrefix'] = skPrefix;
      }
    }

    const queryInput: any = {
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    if (indexName) {
      queryInput.IndexName = indexName;
    }

    if (scanIndexForward !== undefined) {
      queryInput.ScanIndexForward = scanIndexForward;
    }

    if (limit !== undefined) {
      queryInput.Limit = limit;
    }

    const result = await this.docClient.send(new QueryCommand(queryInput));
    return result.Items || [];
  }

  async deleteItem(pk: string, sk: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
      }),
    );
  }

  async batchDelete(keys: { PK: string; SK: string }[]): Promise<void> {
    // DynamoDB BatchWriteItem supports max 25 items per request
    const chunks: { PK: string; SK: string }[][] = [];
    for (let i = 0; i < keys.length; i += 25) {
      chunks.push(keys.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((key) => ({
              DeleteRequest: {
                Key: { PK: key.PK, SK: key.SK },
              },
            })),
          },
        }),
      );
    }
  }
}
