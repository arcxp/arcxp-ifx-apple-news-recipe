const {
  delay,
  getWebsitesFromEvent,
  getWebsiteCredentials,
  processStoryPublish,
  processStoryRepublish,
  processStoryUnpublish,
  processStoryDelete
} = require('../../src/utils/handlerHelpers')
const {
  mockedFirstPublishEvent,
  mockedWebsiteCredentials,
  mockedIdMapping,
  mockedAns
} = require('../mocks')
const { postArticle, updateArticle, updateArticleMetadata, deleteArticle } = require('../../src/services/appleNewsAPI')
const { createIdMapping, updateIdMapping, deleteIdMapping } = require('../../src/services/idMappingRepository')
const { ansToAppleNews, buildAppleNewsArticleMetadata } = require('../../src/utils/appleNewsHelpers')

jest.mock('../../src/services/contentAPI', () => ({
  getStory: jest.fn()
}))

jest.mock('../../src/services/appleNewsAPI', () => ({
  postArticle: jest.fn(),
  updateArticle: jest.fn(),
  updateArticleMetadata: jest.fn(),
  deleteArticle: jest.fn()
}))

jest.mock('../../src/services/idMappingRepository', () => ({
  createIdMapping: jest.fn(),
  updateIdMapping: jest.fn(),
  deleteIdMapping: jest.fn()
}))

const logSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {})
jest.spyOn(global, 'setTimeout')

describe('handler helpers', () => {
  beforeEach(() => {
    logSpy.mockClear()
  })

  test('delay triggers a setTimeout with a configured number of ms', async () => {
    const milisecondsToDelay = process.env.CONTENT_API_REQUEST_DELAY
    await delay(milisecondsToDelay)

    expect(setTimeout).toHaveBeenCalledTimes(1)
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), milisecondsToDelay)
  })

  test('getWebsitesFromEvent returns a list of strings', () => {
    const websites = getWebsitesFromEvent(mockedFirstPublishEvent.body)
    const expectedWebsites = mockedFirstPublishEvent.body._website_ids
    expect(websites.sort()).toEqual(expectedWebsites.sort())

    expect(getWebsitesFromEvent({})).toStrictEqual([])
  })

  test('getWebsiteCredentials returns credentials', () => {
    const website = getWebsitesFromEvent(mockedFirstPublishEvent.body)[0]
    const websiteInUpperCase = website.toUpperCase()

    process.env[`${websiteInUpperCase}_APPLE_NEWS_CHANNEL_ID`] = '1234567890'
    process.env[`${websiteInUpperCase}_APPLE_NEWS_KEY_ID`] = '1234567890'
    process.env[`${websiteInUpperCase}_APPLE_NEWS_KEY_SECRET`] = '1234567890'

    const websiteCredentials = getWebsiteCredentials(website)
    expect(mockedWebsiteCredentials).toMatchObject(websiteCredentials)
  })

  test('processStoryPublish returns the expected response', async () => {
    postArticle.mockResolvedValue({
      status: 201,
      message: 'Article publish processed correctly',
      data: {
        id: 'a91760f1-c169-47d2-9fc4-a7711341264d',
        revision: 'AAAAAAAAAAAAAAAAAAAAew=='
      }
    })
    createIdMapping.mockResolvedValue({ success: true, message: 'IdMapping created successfully' })
    const response = await processStoryPublish(mockedAns, 'example')

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    expect(response.status).toBe(201)
    expect(response.message).toBe('Article publish processed correctly')
  })

  test('processStoryPublish handles errors from postArticle', async () => {
    postArticle.mockResolvedValue({
      status: 400,
      errorMessages: ['INVALID_DOCUMENT'],
      message: 'The JSON in the Apple News Format document (article.json) is invalid'
    })
    const response = await processStoryPublish(mockedAns, 'example')
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toBe(400)
    expect(response.message).toBe('The JSON in the Apple News Format document (article.json) is invalid')
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
      '"level":"error",' +
      '"loggerName":"processStoryPublish",' +
      '"arcStoryId":"MGBRL5R32BHPLBAXC5NTIWV5YQ",' +
      '"arcWebsiteId":"example",' +
      '"status":400,' +
      '"errorMessages":["INVALID_DOCUMENT"],' +
      '"message":"The JSON in the Apple News Format document (article.json) is invalid"}\n'
    )
  })

  test('processStoryPublish handles errors from createIdMapping', async () => {
    postArticle.mockResolvedValue({
      status: 201,
      message: 'Article publish processed correctly',
      data: {
        id: 'a91760f1-c169-47d2-9fc4-a7711341264d',
        revision: 'AAAAAAAAAAAAAAAAAAAAew=='
      }
    })
    createIdMapping.mockResolvedValue({
      success: false,
      message: 'connect ECONNREFUSED',
      errorMessages: ['ID_MAPPING_CREATION_ERROR']
    })
    const response = await processStoryPublish(mockedAns, 'example')
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toBe(500)
    expect(response.message).toBe('connect ECONNREFUSED')
    expect(response.errorMessages).toEqual(['ID_MAPPING_CREATION_ERROR'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryPublish returns the expected response if postArticle response data is null', async () => {
    postArticle.mockResolvedValue({
      status: 201,
      message: 'Article publish processed correctly',
      data: null
    })
    createIdMapping.mockResolvedValue({ success: true, message: 'IdMapping created successfully' })
    const response = await processStoryPublish(mockedAns, 'example')

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    expect(response.status).toBe(201)
    expect(response.message).toBe('Article publish processed correctly')
  })

  test('processStoryRepublish returns the expected response', async () => {
    updateArticle.mockResolvedValue({
      status: 200,
      message: 'Article updated correctly'
    })
    updateIdMapping.mockResolvedValue({ success: true, message: 'IdMapping updated successfully' })
    const idMappings = [mockedIdMapping]
    const idMappingsWebsites = ['example']
    const response = await processStoryRepublish(mockedAns, 'example', idMappings, idMappingsWebsites)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    const expectedArticleMetadata = {
      data: {
        isHidden: false,
        revision: mockedIdMapping.articleMetadataRevision
      }
    }
    const expectedWebsiteCredentials = getWebsiteCredentials('example')
    const expectedArticle = await ansToAppleNews(mockedAns, 'example')

    expect(updateArticle).toHaveBeenCalledWith(mockedIdMapping.articleId,
      { article: expectedArticle, articleMetadata: expectedArticleMetadata },
      { website: 'example', websiteCredentials: expectedWebsiteCredentials })
    expect(response.status).toBe(200)
    expect(response.message).toBe('Article updated correctly')
  })

  test('processStoryRepublish will return an error if updateArticle response data is null', async () => {
    updateArticle.mockResolvedValue({
      status: 200,
      message: 'Article updated correctly',
      data: null
    })

    const message = 'One or more parameter values are not valid. The AttributeValue for a key attribute cannot contain an empty string value. Key: arcWebsiteId'

    updateIdMapping.mockResolvedValue({
      success: false,
      message,
      errorMessages: ['VALIDATION_EXCEPTION']
    })
    const idMappings = [mockedIdMapping]
    const idMappingsWebsites = ['example']
    const response = await processStoryRepublish(mockedAns, 'example', idMappings, idMappingsWebsites)
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual(message)
    expect(response.errorMessages).toEqual(['VALIDATION_EXCEPTION'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryRepublish returns the expected response if idMappingsWebsites array is empty', async () => {
    postArticle.mockResolvedValue({
      status: 201,
      message: 'Article publish processed correctly'
    })
    createIdMapping.mockResolvedValue({ success: true, message: 'IdMapping created successfully' })

    const response = await processStoryRepublish(mockedAns, 'example', [], [])

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    const expectedArticle = await ansToAppleNews(mockedAns, 'example')
    const expectedArticleMetadata = buildAppleNewsArticleMetadata(mockedAns, 'example')
    const expectedWebsiteCredentials = getWebsiteCredentials('example')

    expect(postArticle).toHaveBeenCalledWith(
      { article: expectedArticle, articleMetadata: expectedArticleMetadata },
      {
        website: 'example',
        websiteCredentials: expectedWebsiteCredentials
      })
    expect(response.status).toBe(201)
    expect(response.message).toBe('Article publish processed correctly')
  })

  test('processStoryRepublish handles errors from the updateArticle function', async () => {
    updateArticle.mockResolvedValue({
      status: 400,
      message: 'The JSON in the Apple News Format document (article.json) is invalid.'
    })
    const response = await processStoryRepublish(mockedAns, 'example', [mockedIdMapping], ['example'])

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    expect(response.status).toBe(400)
    expect(response.message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryRepublish handles errors from the postArticle function', async () => {
    postArticle.mockResolvedValue({
      status: 400,
      message: 'The JSON in the Apple News Format document (article.json) is invalid.'
    })

    const response = await processStoryRepublish(mockedAns, 'example', [], [])

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    expect(response.status).toBe(400)
    expect(response.message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryRepublish handles errors if the database operation fails', async () => {
    updateArticle.mockResolvedValue({
      status: 200,
      message: 'Article updated correctly'
    })
    updateIdMapping.mockResolvedValue({
      success: false,
      message: 'Unable to update IdMapping',
      errorMessages: ['ID_MAPPING_UPDATING_ERROR']
    })

    const response = await processStoryRepublish(mockedAns, 'example', [mockedIdMapping], ['example'])

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Unable to update IdMapping')
    expect(response.errorMessages).toEqual(['ID_MAPPING_UPDATING_ERROR'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryUnpublish handler returns the expected response', async () => {
    const idMapping = {
      ...mockedIdMapping,
      arcWebsiteId: 'second-example'
    }
    updateArticleMetadata.mockResolvedValue({
      status: 200,
      message: 'Article update processed correctly'
    })
    updateIdMapping.mockResolvedValue({ success: true, message: 'IdMapping updated successfully' })

    const eventWithNoWebsiteIds = {
      body: {
        _website_ids: [],
        revision: {
          user_id: 'testId@example.com'
        },
        headlines: {
          basic: 'APSR Test headline'
        }
      }
    }
    const response = await processStoryUnpublish(eventWithNoWebsiteIds, idMapping)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).not.toHaveProperty('errorMessages')
  })

  test('processStoryUnpublish handles errors from the updateArticleMetadata function', async () => {
    const idMapping = {
      ...mockedIdMapping,
      arcWebsiteId: 'second-example'
    }
    postArticle.mockResolvedValue({
      status: 201,
      message: 'Article publish processed correctly'
    })
    updateArticleMetadata.mockResolvedValue({
      status: 400,
      message: 'The section you specified doesn’t belong to the given channel',
      errorMessages: ['NOT_ALLOWED']
    })

    const eventWithNoWebsiteIds = {
      body: {
        _website_ids: [],
        revision: {
          user_id: 'testId@example.com'
        },
        headlines: {
          basic: 'APSR Test headline'
        }
      }
    }
    const response = await processStoryUnpublish(eventWithNoWebsiteIds, idMapping)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')
    expect(response.status).toEqual(400)
    expect(response.message).toEqual('The section you specified doesn’t belong to the given channel')
    expect(response.errorMessages).toEqual(['NOT_ALLOWED'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryUnpublish handles errors if the update idMapping operation fails', async () => {
    const idMapping = {
      ...mockedIdMapping,
      arcWebsiteId: 'second-example'
    }
    updateArticleMetadata.mockResolvedValue({
      status: 200,
      message: 'Article update processed correctly'
    })

    const eventWithNoWebsiteIds = {
      body: {
        _website_ids: [],
        revision: {
          user_id: 'testId@example.com'
        },
        headlines: {
          basic: 'APSR Test headline'
        }
      }
    }

    updateIdMapping.mockResolvedValue({
      success: false,
      message: 'Unable to update IdMapping',
      errorMessages: ['ID_MAPPING_UPDATING_ERROR']
    })

    const response = await processStoryUnpublish(eventWithNoWebsiteIds, idMapping)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')
    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Unable to update IdMapping')
    expect(response.errorMessages).toEqual(['ID_MAPPING_UPDATING_ERROR'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryDelete returns the expected response', async () => {
    deleteArticle.mockResolvedValue({
      status: 204,
      message: 'No Content'
    })

    deleteIdMapping.mockResolvedValue({
      success: true,
      message: 'IdMapping deleted successfully'
    })

    const idMappings = [mockedIdMapping]
    const website = 'example'

    const response = await processStoryDelete(website, idMappings)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')

    expect(response.status).toBe(204)
    expect(response.message).toBe('No Content')
  })

  test('processStoryDelete handles errors from deleteArticle function', async () => {
    deleteArticle.mockResolvedValue({
      status: 403,
      message: 'You tried to access an article your API key doesn’t have permission to access. Key path: N/A',
      errorMessages: ['FORBIDDEN']
    })

    const idMappings = [mockedIdMapping]
    const website = 'example'

    const response = await processStoryDelete(website, idMappings)

    expect(response.status).toEqual(403)
    expect(response.message).toEqual('You tried to access an article your API key doesn’t have permission to access. Key path: N/A')
    expect(response.errorMessages).toEqual(['FORBIDDEN'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })

  test('processStoryDelete handles errors from deleteIdMapping function', async () => {
    deleteArticle.mockResolvedValue({
      status: 204,
      message: 'No Content'
    })

    deleteIdMapping.mockResolvedValue({
      success: false,
      message: 'Unable to delete IdMapping',
      errorMessages: ['ID_MAPPING_DELETING_ERROR']
    })

    const idMappings = [mockedIdMapping]
    const website = 'example'

    const response = await processStoryDelete(website, idMappings)

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Unable to delete IdMapping')
    expect(response.errorMessages).toEqual(['ID_MAPPING_DELETING_ERROR'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
  })
})
