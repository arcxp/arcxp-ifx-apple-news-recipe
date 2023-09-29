const axios = require('axios')
const { postArticle, updateArticleMetadata, deleteArticle } = require('../../src/services/appleNewsAPI')
const {
  mockedWebsiteCredentials: websiteCredentials,
  mockedAppleNewsArticle,
  mockedAppleNewsArticleMetadata,
  mockedIdMapping
} = require('../mocks')
const { updateArticle } = require('../../src/services/appleNewsAPI')
jest.mock('axios')

describe('appleNewsAPI', () => {
  const website = 'example'
  const env = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  test('postArticle returns a valid response', async () => {
    const article = { ...mockedAppleNewsArticle, ...mockedAppleNewsArticleMetadata }
    axios.mockResolvedValue({
      status: 201,
      statusText: 'Ok',
      data: {
        data: article
      }
    })

    const response = await postArticle({ article: mockedAppleNewsArticle, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials })
    const { status, message, data } = response
    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('data')
    expect(status).toBe(201)
    expect(message).toBe('Ok')
    expect(data).toMatchObject(article)
  })

  test('postArticle returns error if the request doesn\'t contain an article', async () => {
    const response = await postArticle({ article: {}, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials })
    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(500)
    expect(message).toBe('Error while trying to build form data')
    expect(errorMessages).toHaveLength(2)
  })

  test('postArticle should return an error when APPLE_NEWS_URL environment variable is missing', async () => {
    process.env.APPLE_NEWS_URL = null
    const result = await postArticle(
      { article: {}, articleMetadata: {} },
      {
        website: 'example',
        websiteCredentials: {
          APPLE_NEWS_CHANNEL_ID: 'channel_id',
          APPLE_NEWS_KEY_ID: 'key_id',
          APPLE_NEWS_KEY_SECRET: 'key_secret'
        }
      }
    )

    expect(result.status).toBe(500)
    expect(result.message).toBe('Missing APPLE_NEWS_URL environment variable')
    expect(result.errorMessages).toEqual(['MISSING_APPLE_NEWS_ENV_VARIABLES'])
  })

  test('postArticle returns error if apple news credentials are invalid', async () => {
    const invalidCredentials = { APPLE_NEWS_CHANNEL_ID: null, APPLE_NEWS_KEY_ID: null, APPLE_NEWS_KEY_SECRET: undefined }
    const response = await postArticle({ article: mockedAppleNewsArticle, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials: invalidCredentials })
    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Missing AppleNews secrets for website example')
  })

  test('postArticle handles AppleNews API errors', async () => {
    axios.mockRejectedValue({ message: 'The JSON in the Apple News Format document (article.json) is invalid.', response: { status: 400, data: { errors: ['INVALID_DOCUMENT'] } } })
    const response = await postArticle({ article: mockedAppleNewsArticle, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(400)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toHaveLength(1)
  })

  test('postArticle formats AppleNews API errors', async () => {
    axios.mockRejectedValue({ message: 'The JSON in the Apple News Format document (article.json) is invalid.', response: { status: 400, data: { errors: [{ code: 'INVALID_SCHEME', keyPath: 'data.links.sections' }] } } })
    const response = await postArticle({ article: mockedAppleNewsArticle, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response
    expect(status).toBe(400)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toEqual(['INVALID_SCHEME data.links.sections'])
  })

  test('postArticle handles null error response', async () => {
    axios.mockRejectedValue({
      message: 'The JSON in the Apple News Format document (article.json) is invalid.',
      response: null
    })
    const response = await postArticle({ article: mockedAppleNewsArticle, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(500)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toHaveLength(0)
  })

  test('updateArticle returns a valid response', async () => {
    const articleId = mockedIdMapping.articleId
    const article = { ...mockedAppleNewsArticle, ...mockedAppleNewsArticleMetadata }
    axios.mockResolvedValue({
      status: 200,
      statusText: 'Ok',
      data: {
        data: article
      }
    })

    const response = await updateArticle(articleId, { article: mockedAppleNewsArticle, articleMetadata: mockedAppleNewsArticleMetadata }, { website, websiteCredentials })
    const { status, message, data } = response
    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('data')
    expect(status).toBe(200)
    expect(message).toBe('Ok')
    expect(data).toMatchObject(article)
  })

  test('updateArticle returns error if the request doesn\'t contain an article', async () => {
    const articleId = mockedIdMapping.articleId
    const response = await updateArticle(articleId, {
      article: {},
      articleMetadata: mockedAppleNewsArticleMetadata
    }, {
      website,
      websiteCredentials
    })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(500)
    expect(message).toBe('Error while trying to build form data')
    expect(errorMessages).toHaveLength(2)
  })

  test('updateArticle returns error if apple news credentials are invalid', async () => {
    const invalidCredentials = { APPLE_NEWS_CHANNEL_ID: null, APPLE_NEWS_KEY_ID: null, APPLE_NEWS_KEY_SECRET: undefined }
    const articleId = mockedIdMapping.articleId
    const response = await updateArticle(articleId, {
      article: mockedAppleNewsArticle,
      articleMetadata: mockedAppleNewsArticleMetadata
    }, {
      website,
      websiteCredentials: invalidCredentials
    })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Missing AppleNews secrets for website example')
  })

  test('updateArticle handles AppleNews API errors', async () => {
    const articleId = mockedIdMapping.articleId
    axios.mockRejectedValue({
      message: 'The JSON in the Apple News Format document (article.json) is invalid.',
      response: {
        status: 400,
        data: {
          errors: ['INVALID_DOCUMENT']
        }
      }
    })
    const response = await updateArticle(articleId, {
      article: mockedAppleNewsArticle,
      articleMetadata: mockedAppleNewsArticleMetadata
    }, {
      website,
      websiteCredentials
    })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(400)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toHaveLength(1)
  })

  test('updateArticle formats AppleNews API errors', async () => {
    const articleId = mockedIdMapping.articleId
    axios.mockRejectedValue({
      message: 'The JSON in the Apple News Format document (article.json) is invalid.',
      response: {
        status: 400,
        data: {
          errors: [{ code: 'INVALID_RESOURCE_ID', keyPath: 'data.links.sections' }]
        }
      }
    })
    const response = await updateArticle(articleId, {
      article: mockedAppleNewsArticle,
      articleMetadata: mockedAppleNewsArticleMetadata
    }, {
      website,
      websiteCredentials
    })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(400)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toEqual(['INVALID_RESOURCE_ID data.links.sections'])
  })

  test('updateArticle handles null error response', async () => {
    const articleId = mockedIdMapping.articleId
    axios.mockRejectedValue({
      message: 'The JSON in the Apple News Format document (article.json) is invalid.',
      response: null
    })
    const response = await updateArticle(articleId, {
      article: mockedAppleNewsArticle,
      articleMetadata: mockedAppleNewsArticleMetadata
    }, {
      website,
      websiteCredentials
    })

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(500)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toHaveLength(0)
  })

  test('updateArticleMetadata returns a valid response', async () => {
    axios.mockResolvedValue({
      status: 200,
      statusText: 'Ok',
      data: {
        data: mockedAppleNewsArticle
      }
    })
    const articleMetadata = {
      data: {
        isHidden: false
      }
    }
    const response = await updateArticleMetadata(mockedIdMapping.articleId, articleMetadata, { website, websiteCredentials })
    const { status, message, data } = response

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('data')
    expect(status).toBe(200)
    expect(message).toBe('Ok')
    expect(data).toMatchObject(mockedAppleNewsArticle)
  })

  test('updateArticleMetadata returns error if the request doesn\'t contain the metadata object', async () => {
    axios.mockRejectedValue({
      message: 'The JSON in the Apple News Format document (article.json) is invalid.',
      response: { status: 400, data: { errors: ['INVALID_DOCUMENT'] } }
    })
    const response = await updateArticleMetadata(mockedIdMapping.articleId, { }, { website, websiteCredentials })

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(400)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toHaveLength(1)
  })

  test('updateArticleMetadata returns error if apple news credentials are invalid', async () => {
    const invalidCredentials = { APPLE_NEWS_CHANNEL_ID: null, APPLE_NEWS_KEY_ID: null, APPLE_NEWS_KEY_SECRET: undefined }
    const articleMetadata = {
      data: {
        isHidden: false
      }
    }
    const response = await updateArticleMetadata(mockedIdMapping.articleId, articleMetadata, { website, websiteCredentials: invalidCredentials })
    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Missing AppleNews secrets for website example')
  })

  test('updateArticleMetadata formats AppleNews API errors', async () => {
    axios.mockRejectedValue({
      message: 'Article territory not allowed',
      response: {
        status: 400,
        data: {
          errors: [{ code: 'ARTICLE_TERRITORY_NOT_ALLOWED' }]
        }
      }
    })
    const response = await updateArticleMetadata(mockedIdMapping.articleId, { }, { website, websiteCredentials })

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(400)
    expect(message).toBe('Article territory not allowed')
    expect(errorMessages).toEqual(['ARTICLE_TERRITORY_NOT_ALLOWED'])
  })

  test('updateArticleMetadata handles null error response', async () => {
    axios.mockRejectedValue({
      message: 'The JSON in the Apple News Format document (article.json) is invalid.',
      response: null
    })
    const response = await updateArticleMetadata(mockedIdMapping.articleId, { }, { website, websiteCredentials })

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(500)
    expect(message).toBe('The JSON in the Apple News Format document (article.json) is invalid.')
    expect(errorMessages).toHaveLength(0)
  })

  test('deleteArticle returns a valid response', async () => {
    axios.mockResolvedValue({
      status: 204,
      statusText: 'No Content'
    })

    const response = await deleteArticle(mockedIdMapping.articleId, { website, websiteCredentials })
    const { status, message } = response

    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(status).toBe(204)
    expect(message).toBe('No Content')
  })

  test('deleteArticle returns error if apple news credentials are invalid', async () => {
    const invalidCredentials = { APPLE_NEWS_CHANNEL_ID: null, APPLE_NEWS_KEY_ID: null, APPLE_NEWS_KEY_SECRET: undefined }

    const response = await deleteArticle(mockedIdMapping.articleId, { website, websiteCredentials: invalidCredentials })
    expect(response).toBeDefined()
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Missing AppleNews secrets for website example')
  })

  test('deleteArticle handles AppleNews API errors', async () => {
    axios.mockRejectedValue({
      message: 'You tried to access an article your API key doesn’t have permission to access. Key path: N/A',
      response: { status: 403, data: { errors: ['FORBIDDEN'] } }
    })
    const response = await deleteArticle(mockedIdMapping.articleId, { website, websiteCredentials })

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(403)
    expect(message).toBe('You tried to access an article your API key doesn’t have permission to access. Key path: N/A')
    expect(errorMessages).toHaveLength(1)
  })

  test('deleteArticle formats AppleNews API errors', async () => {
    axios.mockRejectedValue({
      message: 'The article you tried to access doesn’t exist.',
      response: { status: 404, data: { errors: [{ code: 'NOT_FOUND', keyPath: 'articleId' }] } }
    })
    const response = await deleteArticle(mockedIdMapping.articleId, { website, websiteCredentials })

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(404)
    expect(message).toBe('The article you tried to access doesn’t exist.')
    expect(errorMessages).toEqual(['NOT_FOUND articleId'])
  })

  test('deleteArticle handles null error response', async () => {
    axios.mockRejectedValue({
      message: 'You tried to access an article your API key doesn’t have permission to access. Key path: N/A',
      response: null
    })
    const response = await deleteArticle(mockedIdMapping.articleId, { website, websiteCredentials })
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    const { status, message, errorMessages } = response

    expect(status).toBe(500)
    expect(message).toBe('You tried to access an article your API key doesn’t have permission to access. Key path: N/A')
    expect(errorMessages).toHaveLength(0)
  })
})
