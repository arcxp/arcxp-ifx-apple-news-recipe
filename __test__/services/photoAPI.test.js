const { getPhoto } = require('../../src/services/photoAPI')
const { mockedImageANS } = require('../mocks')
const axios = require('axios')

jest.mock('axios')
describe('getPhoto', () => {
  const env = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...env }
  })

  afterEach(() => {
    process.env = env
  })

  beforeAll(() => {
    axios.create.mockReturnThis()
  })

  test('function returns a valid ans', async () => {
    axios.mockResolvedValue({
      status: 200,
      data: mockedImageANS
    })
    const response = await getPhoto(mockedImageANS._id)
    expect(response.message).toEqual(mockedImageANS)
    expect(response.message).toHaveProperty('_id')
    expect(response.message).toHaveProperty('url')
  })

  test('function returns error if ARC_TOKEN is missing', async () => {
    process.env.ARC_TOKEN = null

    const response = await getPhoto(mockedImageANS._id)
    expect(response).toMatchObject({
      status: 500,
      message: 'Missing ARC_TOKEN variable. Please set it as a secret or in the .env file if you are running locally.',
      errorMessages: ['MISSING_ARC_TOKEN_ENV_VARIABLES']
    })
  })

  test('function returns error if ARC_PHOTO_API_URL is missing', async () => {
    process.env.ARC_PHOTO_API_URL = null

    const response = await getPhoto(mockedImageANS._id)

    expect(response).toMatchObject({
      status: 500,
      message: 'Missing ARC_PHOTO_API_URL variable. Please set it in the corresponding .env.* or the .env file if you are running locally.',
      errorMessages: ['MISSING_ARC_PHOTO_API_URL_ENV_VARIABLES']
    })
  })

  test('function handlers errors', async () => {
    axios.mockRejectedValue({
      response: {
        status: 401,
        data: 'Unauthorized'
      }
    })

    const response = await getPhoto(mockedImageANS._id)
    expect(response.status).toEqual(401)
    expect(response.message).toEqual('Unauthorized')
  })
})
