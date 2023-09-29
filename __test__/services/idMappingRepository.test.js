const repo = require('../../src/services/idMappingRepository')
const documentClient = require('../../src/utils/dynamoDBHelpers').documentClient
describe('idMappingRepository', () => {
  const mockedIdMapping = {
    arcStoryId: '1234567890',
    arcWebsiteId: 'totalNews',
    articleId: '987654321',
    articleMetadataRevision: '1111',
    articleStatus: 'PUBLISHED',
    arcUserId: 'test@example.com'
  }

  test('createIdMappingsTableIfNotExists creates the mapping table', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValue({ })
    const result = await repo.createIdMappingsTableIfNotExists(documentClient)

    expect(result.success).toBeTruthy()
  })

  test('createIdMappingsTableIfNotExists success if the database already exists', async () => {
    const error = new Error('Database already exists')
    error.name = 'ResourceInUseException'

    jest.spyOn(documentClient, 'send').mockRejectedValue(error)

    const result = await repo.createIdMappingsTableIfNotExists(documentClient)
    expect(result.success).toBeTruthy()
  })

  test('createIdMappingsTableIfNotExists returns success false if the creation fails', async () => {
    const error = new Error('Unable to reach database')
    error.name = 'UnknownException'

    jest.spyOn(documentClient, 'send').mockRejectedValue(error)
    const result = await repo.createIdMappingsTableIfNotExists(documentClient)
    expect(result.success).toBeFalsy()
  })

  test('createIdMapping inserts a new mapping to the db', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValueOnce({ Item: undefined })
    jest.spyOn(documentClient, 'send').mockImplementationOnce(() => Promise.resolve())

    const result = await repo.createIdMapping(documentClient, mockedIdMapping)
    expect(result.success).toBeTruthy()
  })

  test('createIdMapping returns success false if the mapping already exists', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValue({ Item: mockedIdMapping })

    const result = await repo.createIdMapping(documentClient, mockedIdMapping)
    expect(result.success).toBeFalsy()
  })

  test('createIdMapping returns success false if an error was caught', async () => {
    jest.spyOn(documentClient, 'send').mockImplementation(() => {
      throw new Error('Network connection')
    })

    const result = await repo.createIdMapping(documentClient, mockedIdMapping)
    expect(result.success).toBeFalsy()
  })

  test('readIdMapping returns a object with the mapping', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValue({ Item: mockedIdMapping })

    const result = await repo.readIdMapping(documentClient, {
      arcStoryId: mockedIdMapping.arcStoryId,
      arcWebsiteId: mockedIdMapping.arcWebsiteId
    })
    expect(result.success).toBeTruthy()
    expect(result.data).toMatchObject(mockedIdMapping)
  })

  test('readIdMapping returns success false if the mapping was not found', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValue({})

    const result = await repo.readIdMapping(documentClient, {
      arcStoryId: 'nonexistentStoryId',
      arcWebsiteId: 'nonexistentWebsiteId'
    })
    expect(result.success).toBeFalsy()
  })

  test('readIdMapping returns success false if an error was caught', async () => {
    jest.spyOn(documentClient, 'send').mockImplementation(() => {
      throw new Error('Network connection')
    })

    const result = await repo.readIdMapping(documentClient, {
      arcStoryId: 'nonexistentStoryId',
      arcWebsiteId: 'nonexistentWebsiteId'
    })
    expect(result.success).toBeFalsy()
  })

  test('updateIdMapping updates a record and sets the timestamp', async () => {
    const idMappingRecord = {
      ...mockedIdMapping,
      createdDate: '2020-01-01T00:00:00.000Z',
      updatedDate: '2020-01-01T00:10:00.000Z'
    }
    jest.spyOn(documentClient, 'send').mockResolvedValueOnce({ Attributes: idMappingRecord })

    const { articleId, articleMetadataRevision, articleStatus, arcUserId } = mockedIdMapping

    const result = await repo.updateIdMapping(documentClient, {
      arcStoryId: mockedIdMapping.arcStoryId,
      arcWebsiteId: mockedIdMapping.arcWebsiteId
    }, {
      articleId,
      articleMetadataRevision,
      articleStatus,
      arcUserId
    })

    expect(result.success).toBeTruthy()
    expect(result.data).toMatchObject(idMappingRecord)
  })

  test('updateIdMapping returns success false if the db operation failed', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValueOnce({ })

    const { articleId, articleMetadataRevision, articleStatus, arcUserId } = mockedIdMapping

    const result = await repo.updateIdMapping(documentClient, {
      arcStoryId: mockedIdMapping.arcStoryId,
      arcWebsiteId: mockedIdMapping.arcWebsiteId
    }, {
      articleId,
      articleMetadataRevision,
      articleStatus,
      arcUserId
    })

    expect(result.success).toBeFalsy()
  })

  test('updateIdMapping returns success false if an error was caught', async () => {
    jest.spyOn(documentClient, 'send').mockImplementation(() => {
      throw new Error('Network connection')
    })

    const { articleId, articleMetadataRevision, articleStatus, arcUserId } = mockedIdMapping

    const result = await repo.updateIdMapping(documentClient, {
      arcStoryId: mockedIdMapping.arcStoryId,
      arcWebsiteId: mockedIdMapping.arcWebsiteId
    }, {
      articleId,
      articleMetadataRevision,
      articleStatus,
      arcUserId
    })

    expect(result.success).toBeFalsy()
  })

  test('deleteIdMapping deletes a mapping from the db', async () => {
    jest.spyOn(documentClient, 'send').mockImplementationOnce(() => Promise.resolve())

    const result = await repo.deleteIdMapping(documentClient, {
      arcStoryId: mockedIdMapping.arcStoryId,
      arcWebsiteId: mockedIdMapping.arcWebsiteId
    })

    expect(result.success).toBeTruthy()
  })

  test('deleteIdMapping returns success false if an error was caught', async () => {
    jest.spyOn(documentClient, 'send').mockImplementation(() => {
      throw new Error('Network connection')
    })

    const result = await repo.deleteIdMapping(documentClient, {
      arcStoryId: mockedIdMapping.arcStoryId,
      arcWebsiteId: mockedIdMapping.arcWebsiteId
    })

    expect(result.success).toBeFalsy()
  })

  test('scanIdMappings returns the expected IdMappings', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValue({ Items: [mockedIdMapping] })

    const query = {
      FilterExpression: 'arcStoryId = :arcStoryId and arcWebsiteId = :arcWebsiteId',
      ExpressionAttributeValues: {
        ':arcStoryId': mockedIdMapping.arcStoryId,
        ':arcWebsiteId': mockedIdMapping.arcWebsiteId
      }
    }

    const result = await repo.scanIdMappings(documentClient, query)
    expect(result.success).toBeTruthy()
    expect(result.data[0]).toMatchObject(mockedIdMapping)
  })

  test('scanIdMappings returns an empty array if no record matches the query', async () => {
    jest.spyOn(documentClient, 'send').mockResolvedValue({ })

    const query = {
      FilterExpression: 'arcStoryId = :arcStoryId and arcWebsiteId = :arcWebsiteId',
      ExpressionAttributeValues: {
        ':arcStoryId': '1234567890',
        ':arcWebsiteId': 'totalNews'
      }
    }

    const result = await repo.scanIdMappings(documentClient, query)
    expect(result.success).toBeTruthy()
    expect(result.data).toEqual([])
  })

  test('scanIdMappings returns success false if an error was caught', async () => {
    jest.spyOn(documentClient, 'send').mockImplementation(() => {
      throw new Error('Network connection')
    })

    const query = {
      FilterExpression: 'arcStoryId = :arcStoryId and arcWebsiteId = :arcWebsiteId',
      ExpressionAttributeValues: {
        ':arcStoryId': mockedIdMapping.arcStoryId,
        ':arcWebsiteId': mockedIdMapping.arcWebsiteId
      }
    }

    const result = await repo.scanIdMappings(documentClient, query)
    expect(result.success).toBeFalsy()
    expect(result.message).toEqual('Network connection')
    expect(result.errorMessages).toEqual(['ID_MAPPING_SCANNING_ERROR'])
  })
})
