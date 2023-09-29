const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')
let documentClient

if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
  documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'us-east-1'
  }))
} else {
  const integrationName = process.env.INTEGRATION_NAME
  const integrationNameInScreamingSnakeCase = integrationName.toUpperCase().replaceAll('-', '_')

  const region = `${integrationNameInScreamingSnakeCase}_AWS_REGION`
  const accessKeyId = `${integrationNameInScreamingSnakeCase}_AWS_ACCESS_KEY_ID`
  const secretAccessKey = `${integrationNameInScreamingSnakeCase}_AWS_SECRET_ACCESS_KEY`

  documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({
    region: process.env[region],
    credentials: {
      accessKeyId: process.env[accessKeyId],
      secretAccessKey: process.env[secretAccessKey]
    }
  }))
}

module.exports = {
  documentClient
}
