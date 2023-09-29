const { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb')
const { CreateTableCommand } = require('@aws-sdk/client-dynamodb')

const TableName = `${process.env.INTEGRATION_NAME}-${process.env.NODE_ENV}-IdMappings`

async function createIdMappingsTableIfNotExists (database) {
  const params = {
    TableName,
    KeySchema: [
      { AttributeName: 'arcStoryId', KeyType: 'HASH' }, // Partition key
      { AttributeName: 'arcWebsiteId', KeyType: 'RANGE' } // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: 'arcStoryId', AttributeType: 'S' },
      { AttributeName: 'arcWebsiteId', AttributeType: 'S' }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 1,
      WriteCapacityUnits: 1
    }
  }
  try {
    const command = new CreateTableCommand(params)
    await database.send(command)
    return { success: true, message: 'IdMappings table created successfully' }
  } catch (error) {
    if (error.name !== 'ResourceInUseException') {
      return {
        success: false,
        message: error.message,
        errorMessages: ['ID_MAPPING_CREATING_TABLE_ERROR']
      }
    }
    return { success: true, message: 'IdMappings table already exists' }
  }
}

async function createIdMapping (database, { arcStoryId, arcWebsiteId, articleId, articleMetadataRevision, articleStatus, arcUserId }) {
  const getCommand = new GetCommand({
    TableName,
    Key: {
      arcStoryId,
      arcWebsiteId
    }
  })

  try {
    const record = await database.send(getCommand)
    if (record.Item !== undefined) {
      return {
        success: false,
        message: 'Key conflict: IdMapping already exists',
        errorMessages: ['DUPLICATED_ID_MAPPING']
      }
    }

    const createdDate = new Date().toISOString()

    const command = new PutCommand({
      TableName,
      Item: {
        arcStoryId,
        arcWebsiteId,
        articleId,
        articleMetadataRevision,
        articleStatus,
        arcUserId,
        createdDate
      }
    })
    await database.send(command)
    return { success: true, message: 'IdMapping created successfully' }
  } catch (error) {
    return { success: false, message: error.message, errorMessages: ['ID_MAPPING_CREATION_ERROR'] }
  }
}

async function readIdMapping (database, { arcStoryId, arcWebsiteId }) {
  const command = new GetCommand({
    TableName,
    Key: {
      arcStoryId,
      arcWebsiteId
    }
  })

  try {
    const idMapping = await database.send(command)
    if (!idMapping.Item) {
      return { success: false, message: 'IdMapping not found', errorMessages: ['ID_MAPPING_NOT_FOUND'] }
    }
    return { success: true, message: 'IdMapping reading success', data: idMapping.Item }
  } catch (error) {
    return { success: false, message: error.message, errorMessages: ['ID_MAPPING_READING_ERROR'] }
  }
}

async function updateIdMapping (database, { arcStoryId, arcWebsiteId }, { articleId, articleMetadataRevision, articleStatus, arcUserId }) {
  const updatedDate = new Date().toISOString()

  const command = new UpdateCommand({
    TableName,
    Key: {
      arcStoryId,
      arcWebsiteId
    },
    UpdateExpression: 'SET articleId = :articleId, ' +
            'articleMetadataRevision = :articleMetadataRevision, articleStatus = :articleStatus, ' +
            'arcUserId = :arcUserId, updatedDate = :updatedDate',
    ExpressionAttributeValues: {
      ':articleId': articleId,
      ':articleMetadataRevision': articleMetadataRevision,
      ':articleStatus': articleStatus,
      ':arcUserId': arcUserId,
      ':updatedDate': updatedDate
    },
    ReturnValues: 'ALL_NEW'
  })

  try {
    const idMapping = await database.send(command)
    if (!idMapping.Attributes) {
      return { success: false, message: 'Unable to update IdMapping', errorMessages: ['ID_MAPPING_UPDATING_ERROR'] }
    }
    return { success: true, message: 'IdMapping updated successfully', data: idMapping.Attributes }
  } catch (error) {
    return { success: false, message: error.message, errorMessages: ['ID_MAPPING_UPDATING_ERROR'] }
  }
}

async function deleteIdMapping (database, { arcStoryId, arcWebsiteId }) {
  const command = new DeleteCommand({
    TableName,
    Key: {
      arcStoryId,
      arcWebsiteId
    }
  })
  try {
    await database.send(command)
    return { success: true, message: 'IdMapping deleted successfully' }
  } catch (error) {
    return { success: false, message: error.message, errorMessages: ['ID_MAPPING_DELETING_ERROR'] }
  }
}

async function scanIdMappings (database, scanParams) {
  const params = {
    TableName,
    ...scanParams
  }
  const command = new ScanCommand(params)
  try {
    const scanResult = await database.send(command)
    return { success: true, message: 'IdMapping scan executed successfully', data: scanResult.Items || [] }
  } catch (error) {
    return { success: false, message: error.message, errorMessages: ['ID_MAPPING_SCANNING_ERROR'] }
  }
}

module.exports = {
  createIdMappingsTableIfNotExists,
  createIdMapping,
  readIdMapping,
  updateIdMapping,
  deleteIdMapping,
  scanIdMappings
}
