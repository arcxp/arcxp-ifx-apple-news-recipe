const { getStory } = require('../../src/services/contentAPI')
const { mockedAns } = require('../mocks')
const axios = require('axios')

jest.mock('axios')
describe('getStory', () => {
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
      data: mockedAns
    })
    const response = await getStory(mockedAns._id, mockedAns.website)
    expect(response.message).toEqual(mockedAns)
    expect(response.message).toHaveProperty('_id')
  })

  test('function returns error if ARC_TOKEN is missing', async () => {
    process.env.ARC_TOKEN = null

    const response = await getStory(mockedAns._id, mockedAns.website)

    expect(response).toMatchObject({
      status: 500,
      message: 'Missing ARC_TOKEN variable. Please set it as a secret or in the .env file if you are running locally.',
      errorMessages: ['MISSING_ARC_TOKEN_ENV_VARIABLES']
    })
  })

  test('function returns error if ARC_CONTENT_API_URL is missing', async () => {
    process.env.ARC_CONTENT_API_URL = null

    const response = await getStory(mockedAns._id, mockedAns.website)

    expect(response).toMatchObject({
      status: 500,
      message: 'Missing ARC_CONTENT_API_URL variable. Please set it in the corresponding .env.* or the .env file if you are running locally.',
      errorMessages: ['MISSING_ARC_CONTENT_API_URL_ENV_VARIABLES']
    })
  })

  test('function handles errors', async () => {
    axios.mockRejectedValue({
      response: {
        status: 401,
        data: 'Unauthorized'
      }
    })

    const response = await getStory(mockedAns._id, mockedAns.website)
    expect(response.status).toEqual(401)
    expect(response.message).toEqual('Unauthorized')
  })
})
