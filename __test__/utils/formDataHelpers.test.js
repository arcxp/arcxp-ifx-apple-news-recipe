const helpers = require('../../src/utils/formDataHelpers')
const mocks = require('../mocks')

describe('formDataHelpers', () => {
  test('createFormData returns a formData instance', () => {
    const boundary = helpers.generateBoundary()
    const formData = helpers.createFormData(mocks.mockedAppleNewsArticle, mocks.mockedAppleNewsArticleMetadata, boundary)

    expect(formData).toBeDefined()
    expect(typeof formData).toBe('object')
    expect(typeof formData.getBuffer()).toBe('object')
  })

  test('createFormData returns a formData instance if article is an empty object', () => {
    const boundary = helpers.generateBoundary()
    const formData = helpers.createFormData({}, mocks.mockedAppleNewsArticleMetadata, boundary)

    expect(formData).toBeDefined()
    expect(typeof formData).toBe('object')
    expect(typeof formData.getBuffer()).toBe('object')
  })

  test('createFormData returns a formData instance if articleMetadata is an empty object', () => {
    const boundary = helpers.generateBoundary()
    const formData = helpers.createFormData(mocks.mockedAppleNewsArticle, {}, boundary)

    expect(formData).toBeDefined()
    expect(typeof formData).toBe('object')
    expect(typeof formData.getBuffer()).toBe('object')
  })

  test('createCanonicalRequest returns a valid string request', () => {
    const method = 'POST'
    const url = 'https://www.example.com'
    const date = helpers.dateInISO8601()

    const canonicalRequest = helpers.createCanonicalRequest(method, url, date)
    const expectedCanonicalRequest = `${method}${url}${date}`

    expect(typeof canonicalRequest).toBe('string')
    expect(canonicalRequest).toBe(expectedCanonicalRequest)
  })

  test('generateBoundary returns a valid delimiter', () => {
    const boundary = helpers.generateBoundary()
    const boundaryLength = Buffer.byteLength(boundary, 'utf8')

    expect(typeof boundary).toBe('string')
    expect(boundaryLength).toBe(32)
  })

  test('dateInISO8601 returns a ISO formatted date', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
    const date = helpers.dateInISO8601()

    expect(date).toMatch(dateRegex)
  })

  test('generateSignature builds up a valid authentication string', () => {
    const method = 'POST'
    const url = 'https://www.example.com'
    const fixedDate = '2022-12-31T23:59:59Z'
    const canonicalRequest = helpers.createCanonicalRequest(method, url, fixedDate)
    const { APPLE_NEWS_KEY_SECRET } = mocks.mockedWebsiteCredentials

    const expectedSignature = 'GR6PSDtXMoY4OBLkO5GoQQL5ahbFfeUrC9IJBgShzZc='

    const signature = helpers.generateSignature(canonicalRequest, APPLE_NEWS_KEY_SECRET)

    expect(signature).toEqual(expectedSignature)
  })
})
