const { createAxiosInstance } = require('../config/axiosConfig')

const getStory = async (storyId, website) => {
  // function that returns the full inflated ANS of a story (including content_elements)
  const {
    ARC_TOKEN,
    ARC_CONTENT_API_URL
  } = process.env

  if (!ARC_TOKEN || !ARC_CONTENT_API_URL) {
    if (!ARC_TOKEN) {
      return {
        status: 500,
        message: 'Missing ARC_TOKEN variable. Please set it as a secret or in the .env file if you are running locally.',
        errorMessages: ['MISSING_ARC_TOKEN_ENV_VARIABLES']
      }
    } else {
      return {
        status: 500,
        message: 'Missing ARC_CONTENT_API_URL variable. Please set it in the corresponding .env.* or the .env file if you are running locally.',
        errorMessages: ['MISSING_ARC_CONTENT_API_URL_ENV_VARIABLES']
      }
    }
  }

  const baseURL = ARC_CONTENT_API_URL
  const headers = {
    Authorization: `Bearer ${ARC_TOKEN}`
  }

  const axiosConfig = {
    baseURL,
    headers
  }

  try {
    const axiosClient = createAxiosInstance(axiosConfig)

    const params = {
      _id: storyId,
      website,
      published: true
    }

    const response = await axiosClient({
      method: 'get',
      url: '/',
      params
    })
    return {
      status: response.status,
      message: response.data
    }
  } catch (error) {
    const { status, data } = error.response
    const message = data.message || data
    return {
      status,
      message,
      errorMessages: ['CONTENT_API_ERROR']
    }
  }
}

module.exports = {
  getStory
}
