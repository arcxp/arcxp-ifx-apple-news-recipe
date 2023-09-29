const { scanIdMappings } = require('../services/idMappingRepository')
const { documentClient } = require('../utils/dynamoDBHelpers')
const { processStoryUnpublish } = require('../utils/handlerHelpers')
const { namedLogger } = require('../utils/namedLogger')

const storyUnpublishHandler = async (event) => {
  const logger = namedLogger('storyUnpublishHandler').child({
    arcStoryId: event.body._id
  })

  const storyId = event.body._id

  const publishedIdMappingsQuery = {
    FilterExpression: `arcStoryId = :arcStoryId and
     articleStatus = :articleStatus`,
    ExpressionAttributeValues: {
      ':arcStoryId': storyId,
      ':articleStatus': 'PUBLISHED'
    }
  }

  const scanningResult = await scanIdMappings(documentClient, publishedIdMappingsQuery)

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
      message: 'No idMappings found for unpublishing',
      errorMessages: ['NO_ID_MAPPINGS_FOUND']
    }
    logger.error(errorScanningResult)
    return errorScanningResult
  }

  const idMappings = scanningResult.data
  const settledUnpublishPromises = await Promise.allSettled(idMappings.map(idMapping => (processStoryUnpublish(event, idMapping))))
  return settledUnpublishPromises.map((promise) => (promise.value))
}

module.exports = storyUnpublishHandler
