export default () => ({
  port: parseInt(process.env.PORT || '3001'),
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: '7d',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'whatsapp-clone-server',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  dynamo: {
    region: process.env.AWS_REGION || 'ap-south-1',
    tableName: process.env.DYNAMO_TABLE || 'whatsapp-messages',
    endpoint: process.env.DYNAMO_ENDPOINT,   // set for local DynamoDB
  },
  sns: {
    topicArn: process.env.SNS_TOPIC_ARN || '',
  },
});