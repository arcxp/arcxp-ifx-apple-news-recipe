const { getWebsitesFromEvent, processStoryPublish, delay } = require('../utils/handlerHelpers')
const { getStory } = require('../services/contentAPI')
const { isResponseStatusOk } = require('../utils/httpRequestHelpers')
const { namedLogger } = require('../utils/namedLogger')

const storyPublishHandler = async (event) => {
  const logger = namedLogger('storyPublishHandler').child({
    arcStoryId: event.body._id
  })

  const websites = getWebsitesFromEvent(event.body)

  if (process.env.CONTENT_API_REQUEST_DELAY > 0) {
    await delay(process.env.CONTENT_API_REQUEST_DELAY)
  }

  const getStoryResponse = await getStory(event.body._id, websites[0])
  if (!isResponseStatusOk(getStoryResponse.status)) {
    logger.error(getStoryResponse)
    return getStoryResponse
  }

  const ans = getStoryResponse.message
  const settledPromises = await Promise.allSettled(websites.map(website => (processStoryPublish(ans, website))))
  return settledPromises.map((promise) => (promise.value))
}

module.exports = storyPublishHandler
