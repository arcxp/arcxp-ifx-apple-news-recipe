const storyRepublishHandler = require('../../src/eventsHandlers/storyRepublishHandler')
const { getWebsitesFromEvent, processStoryRepublish } = require('../../src/utils/handlerHelpers')
const { mockedRepublishEvent, mockedIdMapping, mockedFirstPublishEvent, mockedAns } = require('../mocks')
const { scanIdMappings } = require('../../src/services/idMappingRepository')
const { getStory } = require('../../src/services/contentAPI')

jest.mock('../../src/utils/handlerHelpers', () => ({
  getWebsitesFromEvent: jest.fn(),
  processStoryRepublish: jest.fn(),
  delay: jest.fn()
}))

jest.mock('../../src/services/idMappingRepository', () => ({
  scanIdMappings: jest.fn()
}))

jest.mock('../../src/services/contentAPI', () => ({
  getStory: jest.fn()
}))

const logSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {})

describe('storyRepublishHandler', () => {
  beforeEach(() => {
    logSpy.mockClear()
  })

  test('handler returns the expected response', async () => {
    getWebsitesFromEvent.mockReturnValue(mockedRepublishEvent.body._website_ids)
    scanIdMappings.mockResolvedValue({
      success: true,
      message: 'IdMapping scan executed successfully',
      data: [mockedIdMapping]
    })
    getStory.mockResolvedValue({ status: 200, message: mockedAns })
    processStoryRepublish.mockResolvedValue({
      status: 200,
      message: 'Article update processed correctly'
    })

    const responses = await storyRepublishHandler(mockedRepublishEvent)
    responses.forEach((response) => {
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('message')

      expect(response.status).toBe(200)
      expect(response.message).toBe('Article update processed correctly')
    })
  })

  test('handles errors from scanIdMappings', async () => {
    getWebsitesFromEvent.mockReturnValue(mockedFirstPublishEvent.body._website_ids)
    scanIdMappings.mockResolvedValue({
      success: false,
      message: 'Unreachable database',
      errorMessages: ['ID_MAPPING_SCANNING_ERROR']
    })
    const responses = await storyRepublishHandler(mockedRepublishEvent)
    expect(responses).toHaveProperty('status')
    expect(responses).toHaveProperty('message')
    expect(responses).toHaveProperty('errorMessages')
    expect(responses.status).toEqual(500)
    expect(responses.message).toEqual('Unreachable database')
    expect(responses.errorMessages).toEqual(['ID_MAPPING_SCANNING_ERROR'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
      '"level":"error",' +
      '"loggerName":"storyRepublishHandler",' +
      '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
      '"status":500,' +
      '"message":"Unreachable database",' +
      '"errorMessages":["ID_MAPPING_SCANNING_ERROR"]}\n'
    )
  })

  test('handles errors from getStory', async () => {
    getWebsitesFromEvent.mockReturnValue(mockedFirstPublishEvent.body._website_ids)
    scanIdMappings.mockResolvedValue({
      success: true,
      message: 'IdMapping scan executed successfully',
      data: [mockedIdMapping]
    })
    getStory.mockResolvedValue({
      message: 'Error 400',
      status: 400,
      errorMessages: ['CONTENT_API_ERROR']
    })

    const response = await storyRepublishHandler(mockedFirstPublishEvent)
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('errorMessages')

    expect(response.message).toEqual('Error 400')
    expect(response.status).toEqual(400)
    expect(response.errorMessages).toEqual(['CONTENT_API_ERROR'])

    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
        '"level":"error",' +
        '"loggerName":"storyRepublishHandler",' +
        '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
        '"message":"Error 400",' +
        '"status":400,' +
        '"errorMessages":["CONTENT_API_ERROR"]}\n'
    )
  })
})
