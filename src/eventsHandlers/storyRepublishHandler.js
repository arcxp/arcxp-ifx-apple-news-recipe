const { processStoryRepublish, processStoryUnpublish, getWebsitesFromEvent } = require('../utils/handlerHelpers')
const { scanIdMappings } = require('../services/idMappingRepository')
const { documentClient } = require('../utils/dynamoDBHelpers')
const { getStory } = require('../services/contentAPI')
const { isResponseStatusOk } = require('../utils/httpRequestHelpers')
const { namedLogger } = require('../utils/namedLogger')

const storyRepublishHandler = async (event) => {
  const logger = namedLogger('storyRepublishHandler').child({
    arcStoryId: event.body._id
  })

  const eventWebsites = getWebsitesFromEvent(event.body)
  const storyId = event.body._id

  const idMappingsQuery = {
    FilterExpression: 'arcStoryId = :arcStoryId',
    ExpressionAttributeValues: {
      ':arcStoryId': storyId
    }
  }

  const scanningResult = await scanIdMappings(documentClient, idMappingsQuery)

  if (!scanningResult.success) {
    const errorScanningResult = {
      status: 500,
      message: scanningResult.message,
      errorMessages: scanningResult.errorMessages
    }
    logger.error(errorScanningResult)
    return errorScanningResult
  }

  const idMappings = scanningResult.data
  const arcWebsiteIds = idMappings.map(idMappings => idMappings.arcWebsiteId)

  // republish to previously published circulations and publish to recently added circulations
  const websitesToRepublish = getWebsitesFromEvent(event.body)

  const getStoryResponse = await getStory(event.body._id, websitesToRepublish[0])
  if (!isResponseStatusOk(getStoryResponse.status)) {
    logger.error(getStoryResponse)
    return getStoryResponse
  }
  const ans = getStoryResponse.message

  const settledRepublishPromises = await Promise.allSettled(
    websitesToRepublish.map(website => (processStoryRepublish(ans, website, idMappings, arcWebsiteIds)))
  )
  const settledRepublishValues = settledRepublishPromises.map((promise) => (promise.value))

  // unpublish in the recently removed circulations
  const websitesToUnpublish = arcWebsiteIds.filter(w => !eventWebsites.includes(w))
  // to unpublish, it has to be PUBLISHED and the website should be in the list of websites that aren't in the event anymore
  const idMappingsToUnpublish = idMappings.filter((idMapping) => {
    return idMapping.articleStatus === 'PUBLISHED' && websitesToUnpublish.includes(idMapping.arcWebsiteId)
  })

  const settledUnpublishPromises = await Promise.allSettled(
    idMappingsToUnpublish.map(idMapping => (processStoryUnpublish(event, idMapping)))
  )
  const settledUnpublishValues = settledUnpublishPromises.map((promise) => (promise.value))

  return [...settledRepublishValues, ...settledUnpublishValues]
}

module.exports = storyRepublishHandler
