const { documentClient } = require('../../src/utils/dynamoDBHelpers')
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')

describe('dynamoDBHelpers', () => {
  const env = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  test('documentClient is an instance of the DynamoDBDocumentClient class', () => {
    expect(documentClient).toBeInstanceOf(DynamoDBDocumentClient)
  })

  test('documentClient is an instance of the DB', () => {
    process.env.NODE_ENV = 'sandbox'
    process.env.INTEGRATION_NAME = 'my-integration'
    process.env.APPLE_NEWS_PUB_AWS_REGION = 'us-east-1'

    process.env.APPLE_NEWS_PUB_AWS_ACCESS_KEY_ID = 'example'
    process.env.APPLE_NEWS_PUB_AWS_SECRET_ACCESS_KEY = 'example'
    const { documentClient: sandboxDocumentClient } = require('../../src/utils/dynamoDBHelpers')
    expect(sandboxDocumentClient).toBeInstanceOf(Object)
  })
})
