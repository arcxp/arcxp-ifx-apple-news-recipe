const storyDeleteHandler = require('../../src/eventsHandlers/storyDeleteHandler')
const { processStoryDelete } = require('../../src/utils/handlerHelpers')
const { mockedDeleteEvent, mockedIdMapping } = require('../mocks')
const { scanIdMappings } = require('../../src/services/idMappingRepository')

jest.mock('../../src/utils/handlerHelpers', () => ({
  processStoryDelete: jest.fn()
}))

jest.mock('../../src/services/idMappingRepository', () => ({
  scanIdMappings: jest.fn()
}))

const logSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {})

describe('storyDeleteHandler', () => {
  beforeEach(() => {
    logSpy.mockClear()
  })
  test('handler returns the expected response', async () => {
    scanIdMappings.mockResolvedValue({
      success: true,
      message: 'IdMapping scan executed successfully',
      data: [mockedIdMapping]
    })
    processStoryDelete.mockResolvedValue({
      status: 204,
      message: 'No Content'
    })

    const responses = await storyDeleteHandler(mockedDeleteEvent)
    responses.forEach((response) => {
      expect(response).toHaveProperty('status')
      expect(response).toHaveProperty('message')
      expect(response.status).toBe(204)
      expect(response.message).toBe('No Content')
    })
  })

  test('returns a 404 error array if scanIdMappings is successful but returns no data', async () => {
    scanIdMappings.mockResolvedValue({
      success: true,
      message: 'IdMapping scan executed successfully',
      data: []
    })

    const response = await storyDeleteHandler(mockedDeleteEvent)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toBe(404)
    expect(response.message).toBe('No ID mappings found for deletion')
    expect(response.errorMessages).toEqual(['NO_ID_MAPPINGS_FOUND'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
      '"level":"error",' +
      '"loggerName":"storyDeleteHandler",' +
      '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
      '"status":404,' +
      '"message":"No ID mappings found for deletion",' +
      '"errorMessages":["NO_ID_MAPPINGS_FOUND"]}\n'
    )
  })

  test('handles errors from scanIdMappings', async () => {
    scanIdMappings.mockResolvedValue({
      success: false,
      message: 'Unreachable database',
      errorMessages: ['ID_MAPPING_SCANNING_ERROR']
    })

    const response = await storyDeleteHandler(mockedDeleteEvent)

    expect(response).toHaveProperty('status')
    expect(response).toHaveProperty('message')
    expect(response).toHaveProperty('errorMessages')

    expect(response.status).toEqual(500)
    expect(response.message).toEqual('Unreachable database')
    expect(response.errorMessages).toEqual(['ID_MAPPING_SCANNING_ERROR'])
    expect(process.stdout.write).toHaveBeenCalledTimes(1)
    expect(process.stdout.write).toHaveBeenCalledWith('{' +
      '"level":"error",' +
      '"loggerName":"storyDeleteHandler",' +
      '"arcStoryId":"123456O3BCWZPLTVJCRGSGWCU",' +
      '"status":500,' +
      '"message":"Unreachable database",' +
      '"errorMessages":["ID_MAPPING_SCANNING_ERROR"]}\n'
    )
  })
})
