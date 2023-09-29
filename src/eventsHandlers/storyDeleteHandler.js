const { processStoryDelete } = require('../utils/handlerHelpers')
const { scanIdMappings } = require('../services/idMappingRepository')
const { documentClient } = require('../utils/dynamoDBHelpers')
const { namedLogger } = require('../utils/namedLogger')

const storyDeleteHandler = async (event) => {
  const logger = namedLogger('storyDeleteHandler').child({
    arcStoryId: event.body._id
  })

  const storyId = event.body._id
  const allStoryIdMappingsQuery = {
    FilterExpression: 'arcStoryId = :arcStoryId',
    ExpressionAttributeValues: {
      ':arcStoryId': storyId
    }
  }

  const scanningResult = await scanIdMappings(documentClient, allStoryIdMappingsQuery)

  if (!scanningResult.success) {
    const errorScanningResult = {
      status: 500,
      message: scanningResult.message,
      errorMessages: scanningResult.errorMessages
    }
    logger.error(errorScanningResult)
    return errorScanningResult
  }

  if (!scanningResult.data.length) {
    const errorScanningResult = {
      status: 404,
      message: 'No ID mappings found for deletion',
      errorMessages: ['NO_ID_MAPPINGS_FOUND']
    }
    logger.error(errorScanningResult)
    return errorScanningResult
  }

  const idMappings = scanningResult.data
  const websitesToDelete = idMappings.map(idMapping => idMapping.arcWebsiteId)

  const settledDeletePromises = await Promise.allSettled(websitesToDelete.map(website => (processStoryDelete(website, idMappings))))
  const settledDeleteValues = settledDeletePromises.map((promise) => (promise.value))

  return settledDeleteValues
}

module.exports = storyDeleteHandler
