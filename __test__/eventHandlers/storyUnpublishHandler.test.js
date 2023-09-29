const storyUnpublishHandler = require('../../src/eventsHandlers/storyUnpublishHandler')
const { processStoryUnpublish } = require('../../src/utils/handlerHelpers')
const { mockedIdMapping, mockedUnpublishEvent } = require('../mocks')
const { scanIdMappings } = require('../../src/services/idMappingRepository')

jest.mock('../../src/utils/handlerHelpers', () => ({
  processStoryUnpublish: jest.fn()
}))

jest.mock('../../src/services/idMappingRepository', () => ({
  scanIdMappings: jest.fn()
}))

const logSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {})

describe('storyUnpublishHandler', () => {
  beforeEach(() => {
    logSpy.mockClear()
  })
  test('handler returns the expected response', async () => {
    scanIdMappings.mockResolvedValue({
      success: true,
      message: 'IdMapping scan executed successfully',
      data: [mockedIdMapping]
    })
    processStoryUnpublish.mockResolvedValue({
      status: 200,
      message: 'ArticleMetadata update processed correctly'
    })

    const responses = await storyUnpublishHandler(mockedUnpublishEvent)
    responses.forEach((response) => {
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('message')

      expect(response.status).toBe(200)
      expect(response.message).toBe('ArticleMetadata update processed correctly')
    })
  })

  test('handler returns error if the idMappings query failed', async () => {
    scanIdMappings.mockResolvedValue({
      success: false,
      message: 'Connection refused',
      errorMessages: ['UNABLE_TO_CONNECT']
    })

    const response = await storyUnpublishHandler(mockedUnpublishEvent)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Connection refused')
    expect(response.errorMessages).toEqual(['UNABLE_TO_CONNECT'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
      '"level":"error",' +
      '"loggerName":"storyUnpublishHandler",' +
      '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
      '"status":500,' +
      '"message":"Connection refused",' +
      '"errorMessages":["UNABLE_TO_CONNECT"]}\n'
    )
  })

  test('handler returns error if the idMappings query returns an empty array', async () => {
    scanIdMappings.mockResolvedValue({
      success: true,
      message: 'IdMapping scan executed successfully',
      data: []
    })

    const response = await storyUnpublishHandler(mockedUnpublishEvent)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(404)
    expect(response.message).toEqual('No idMappings found for unpublishing')
    expect(response.errorMessages).toEqual(['NO_ID_MAPPINGS_FOUND'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
      '"level":"error",' +
      '"loggerName":"storyUnpublishHandler",' +
      '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
      '"status":404,' +
      '"message":"No idMappings found for unpublishing",' +
      '"errorMessages":["NO_ID_MAPPINGS_FOUND"]}\n'
    )
  })
})
