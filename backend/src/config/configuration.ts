export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  apiKey: process.env.API_KEY || '',
  dynamodb: {
    endpoint: process.env.DYNAMODB_ENDPOINT || '',
    tableName: process.env.DYNAMODB_TABLE_NAME || 'claude-dialog',
    region: process.env.AWS_REGION || 'us-east-1',
  },
});
