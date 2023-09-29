const axios = require('axios')
const {
  createCanonicalRequest,
  generateSignature,
  dateInISO8601,
  createFormData,
  generateBoundary
} = require('../utils/formDataHelpers')
const { checkEnvironmentVariables } = require('../utils/appleNewsHelpers')

const postArticle = async ({ article, articleMetadata }, { website, websiteCredentials }) => {
  const {
    APPLE_NEWS_URL
  } = process.env
  const environmentCheckResult = checkEnvironmentVariables(APPLE_NEWS_URL, websiteCredentials, website)

  if (environmentCheckResult) {
    return environmentCheckResult
  }

  const {
    APPLE_NEWS_CHANNEL_ID,
    APPLE_NEWS_KEY_ID,
    APPLE_NEWS_KEY_SECRET
  } = websiteCredentials

  if (Object.keys(article).length === 0) {
    return {
      status: 500,
      message: 'Error while trying to build form data',
      errorMessages: ['INVALID_FORM_DATA', 'MISSING_ARTICLE']
    }
  }

  const method = 'POST'
  const path = `/channels/${APPLE_NEWS_CHANNEL_ID}/articles`
  const url = `${APPLE_NEWS_URL}${path}`
  const date = dateInISO8601()
  const boundary = generateBoundary()
  const contentType = `multipart/form-data; boundary=${boundary}`

  let canonicalRequest = createCanonicalRequest(method, url, date)
  const formData = createFormData(article, articleMetadata, boundary)

  const body = formData.getBuffer()
  canonicalRequest += contentType + body

  const signature = generateSignature(canonicalRequest, APPLE_NEWS_KEY_SECRET)

  const authorizationHeader = `HHMAC; key=${APPLE_NEWS_KEY_ID}; signature=${signature}; date=${date}`

  const headers = {
    Authorization: authorizationHeader,
    'Content-Type': contentType,
    'Content-Length': formData.getLengthSync()
  }

  try {
    const request = axios({
      method,
      url,
      headers,
      data: formData
    })
    const response = await request
    const { statusText, status, data: { data } } = response
    return {
      status,
      message: statusText,
      data
    }
  } catch (error) {
    const { message } = error
    const status = error.response?.status ?? 500
    const errors = error.response?.data?.errors ?? []
    const errorMessages = errors.map(({ code, keyPath }) => keyPath ? `${code} ${keyPath}` : `${code}`)
    return {
      status,
      message,
      errorMessages
    }
  }
}

const updateArticle = async (articleId, { article, articleMetadata }, { website, websiteCredentials }) => {
  const {
    APPLE_NEWS_URL
  } = process.env
  const environmentCheckResult = checkEnvironmentVariables(APPLE_NEWS_URL, websiteCredentials, website)

  if (environmentCheckResult) {
    return environmentCheckResult
  }

  const {
    APPLE_NEWS_KEY_ID,
    APPLE_NEWS_KEY_SECRET
  } = websiteCredentials

  if (Object.keys(article).length === 0) {
    return {
      status: 500,
      message: 'Error while trying to build form data',
      errorMessages: ['INVALID_FORM_DATA', 'MISSING_ARTICLE']
    }
  }

  const method = 'POST'
  const path = `/articles/${articleId}`
  const url = `${APPLE_NEWS_URL}${path}`
  const date = dateInISO8601()
  const boundary = generateBoundary()
  const contentType = `multipart/form-data; boundary=${boundary}`

  let canonicalRequest = createCanonicalRequest(method, url, date)
  const formData = createFormData(article, articleMetadata, boundary)

  const body = formData.getBuffer()
  canonicalRequest += contentType + body

  const signature = generateSignature(canonicalRequest, APPLE_NEWS_KEY_SECRET)

  const authorizationHeader = `HHMAC; key=${APPLE_NEWS_KEY_ID}; signature=${signature}; date=${date}`

  const headers = {
    Authorization: authorizationHeader,
    'Content-Type': contentType,
    'Content-Length': formData.getLengthSync()
  }

  try {
    const request = axios({
      method,
      url,
      headers,
      data: formData
    })
    const response = await request
    const { statusText, status, data: { data } } = response
    return {
      status,
      message: statusText,
      data
    }
  } catch (error) {
    const { message } = error
    const status = error.response?.status ?? 500
    const errors = error.response?.data?.errors ?? []
    const errorMessages = errors.map(({ code, keyPath }) => keyPath ? `${code} ${keyPath}` : `${code}`)
    return {
      status,
      message,
      errorMessages
    }
  }
}

const updateArticleMetadata = async (articleId, articleMetadata, { website, websiteCredentials }) => {
  const {
    APPLE_NEWS_URL
  } = process.env
  const environmentCheckResult = checkEnvironmentVariables(APPLE_NEWS_URL, websiteCredentials, website)

  if (environmentCheckResult) {
    return environmentCheckResult
  }

  const {
    APPLE_NEWS_KEY_ID,
    APPLE_NEWS_KEY_SECRET
  } = websiteCredentials

  const method = 'POST'
  const path = `/articles/${articleId}`
  const url = `${APPLE_NEWS_URL}${path}`
  const date = dateInISO8601()
  const boundary = generateBoundary()
  const contentType = `multipart/form-data; boundary=${boundary}`

  let canonicalRequest = createCanonicalRequest(method, url, date)
  const formData = createFormData({}, articleMetadata, boundary)

  const body = formData.getBuffer()
  canonicalRequest += contentType + body

  const signature = generateSignature(canonicalRequest, APPLE_NEWS_KEY_SECRET)

  const authorizationHeader = `HHMAC; key=${APPLE_NEWS_KEY_ID}; signature=${signature}; date=${date}`

  const headers = {
    Authorization: authorizationHeader,
    'Content-Type': contentType,
    'Content-Length': formData.getLengthSync()
  }

  try {
    const request = axios({
      method,
      url,
      headers,
      data: formData
    })

    const response = await request
    const { statusText, status, data: { data } } = response
    return {
      status,
      message: statusText,
      data
    }
  } catch (error) {
    const { message } = error
    const status = error.response?.status ?? 500
    const errors = error.response?.data?.errors ?? []
    const errorMessages = errors.map(({ code, keyPath }) => keyPath ? `${code} ${keyPath}` : `${code}`)
    return {
      status,
      message,
      errorMessages
    }
  }
}

const deleteArticle = async (articleId, { website, websiteCredentials }) => {
  const {
    APPLE_NEWS_URL
  } = process.env
  const environmentCheckResult = checkEnvironmentVariables(APPLE_NEWS_URL, websiteCredentials, website)

  if (environmentCheckResult) {
    return environmentCheckResult
  }

  const {
    APPLE_NEWS_KEY_ID,
    APPLE_NEWS_KEY_SECRET
  } = websiteCredentials

  const method = 'DELETE'
  const path = `/articles/${articleId}`
  const url = `${APPLE_NEWS_URL}${path}`
  const date = dateInISO8601()

  const canonicalRequest = createCanonicalRequest(method, url, date)
  const signature = generateSignature(canonicalRequest, APPLE_NEWS_KEY_SECRET)
  const authorizationHeader = `HHMAC; key=${APPLE_NEWS_KEY_ID}; signature=${signature}; date=${date}`

  const headers = {
    Authorization: authorizationHeader
  }

  try {
    const request = axios({
      method,
      url,
      headers
    })

    const response = await request
    const { statusText, status } = response
    return {
      status,
      message: statusText
    }
  } catch (error) {
    const { message } = error
    const status = error.response?.status ?? 500
    const errors = error.response?.data?.errors ?? []
    const errorMessages = errors.map(({ code, keyPath }) => keyPath ? `${code} ${keyPath}` : `${code}`)
    return {
      status,
      message,
      errorMessages
    }
  }
}

module.exports = {
  postArticle,
  updateArticle,
  updateArticleMetadata,
  deleteArticle
}
