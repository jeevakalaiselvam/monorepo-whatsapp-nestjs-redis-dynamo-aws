aws dynamodb create-table \
  --table-name whatsapp-messages \
  --attribute-definitions \
    AttributeName=chatId,AttributeType=S \
    AttributeName=messageId,AttributeType=S \
    AttributeName=clientMsgId,AttributeType=S \
  --key-schema \
    AttributeName=chatId,KeyType=HASH \
    AttributeName=messageId,KeyType=RANGE \
  --global-secondary-indexes '[{
    "IndexName":"clientMsgId-index",
    "KeySchema":[{"AttributeName":"clientMsgId","KeyType":"HASH"}],
    "Projection":{"ProjectionType":"ALL"},
    "ProvisionedThroughput":{"ReadCapacityUnits":5,"WriteCapacityUnits":5}
  }]' \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url http://localhost:8000 \
  --region ap-south-1