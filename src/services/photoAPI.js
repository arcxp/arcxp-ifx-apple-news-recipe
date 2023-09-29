const { createAxiosInstance } = require('../config/axiosConfig')

const getPhoto = async (photoId) => {
  const {
    ARC_TOKEN,
    ARC_PHOTO_API_URL
  } = process.env

  if (!ARC_TOKEN || !ARC_PHOTO_API_URL) {
    if (!ARC_TOKEN) {
      return {
        status: 500,
        message: 'Missing ARC_TOKEN variable. Please set it as a secret or in the .env file if you are running locally.',
        errorMessages: ['MISSING_ARC_TOKEN_ENV_VARIABLES']
      }
    } else {
      return {
        status: 500,
        message: 'Missing ARC_PHOTO_API_URL variable. Please set it in the corresponding .env.* or the .env file if you are running locally.',
        errorMessages: ['MISSING_ARC_PHOTO_API_URL_ENV_VARIABLES']
      }
    }
  }

  const baseURL = ARC_PHOTO_API_URL
  const headers = {
    Authorization: `Bearer ${ARC_TOKEN}`
  }

  const axiosConfig = {
    baseURL,
    headers
  }

  try {
    const axiosClient = createAxiosInstance(axiosConfig)

    const response = await axiosClient({
      method: 'get',
      url: `/${photoId}`
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
      errorMessages: ['PHOTO_API_ERROR']
    }
  }
}

module.exports = {
  getPhoto
}
