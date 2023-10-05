const storyPublishHandler = require('../../src/eventsHandlers/storyPublishHandler')
const { mockedAns, mockedFirstPublishEvent } = require('../mocks')
const { processStoryPublish, getWebsitesFromEvent } = require('../../src/utils/handlerHelpers')
const { getStory } = require('../../src/services/contentAPI')
jest.mock('../../src/utils/handlerHelpers', () => ({
  getWebsitesFromEvent: jest.fn(),
  processStoryPublish: jest.fn(),
  delay: jest.fn()
}))

jest.mock('../../src/services/contentAPI', () => ({
  getStory: jest.fn()
}))

const logSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {})

describe('storyPublishHandler', () => {
  beforeEach(() => {
    logSpy.mockClear()
  })

  test('handler returns expected response', async () => {
    getWebsitesFromEvent.mockReturnValue(mockedFirstPublishEvent.body._website_ids)
    getStory.mockResolvedValue({ status: 200, message: mockedAns })
    processStoryPublish.mockResolvedValue({
      status: 201,
      message: 'Article publish processed correctly'
    })

    const responses = await storyPublishHandler(mockedFirstPublishEvent)

    responses.forEach((response) => {
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('message')

      expect(response.status).toBe(201)
      expect(response.message).toBe('Article publish processed correctly')
    })
  })

  test('handles errors from getStory', async () => {
    getWebsitesFromEvent.mockReturnValue(mockedFirstPublishEvent.body._website_ids)
    getStory.mockResolvedValue({
      message: 'Error 400',
      status: 400,
      errorMessages: ['CONTENT_API_ERROR']
    })
    const response = await storyPublishHandler(mockedFirstPublishEvent)
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(400)
    expect(response.message).toEqual('Error 400')
    expect(response.errorMessages).toEqual(['CONTENT_API_ERROR'])

    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
        '"level":"error",' +
        '"loggerName":"storyPublishHandler",' +
        '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
        '"message":"Error 400",' +
        '"status":400,' +
        '"errorMessages":["CONTENT_API_ERROR"]}\n'
    )
  })
})
