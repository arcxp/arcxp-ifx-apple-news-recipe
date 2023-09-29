const { ansToAppleNews, buildAppleNewsArticleMetadata } = require('./appleNewsHelpers')
const { isResponseStatusOk } = require('./httpRequestHelpers')
const { postArticle, updateArticle, updateArticleMetadata, deleteArticle } = require('../services/appleNewsAPI')
const { createIdMapping, updateIdMapping, deleteIdMapping } = require('../services/idMappingRepository')
const { documentClient } = require('./dynamoDBHelpers')
const { namedLogger } = require('./namedLogger')

const getWebsitesFromEvent = (eventBody) => ('_website_ids' in eventBody ? eventBody._website_ids : [])

const getWebsiteCredentials = (website) => {
  const websiteInScreamingSnakeCase = website.toUpperCase().replaceAll('-', '_')

  return {
    APPLE_NEWS_CHANNEL_ID: process.env[`${websiteInScreamingSnakeCase}_APPLE_NEWS_CHANNEL_ID`],
    APPLE_NEWS_KEY_ID: process.env[`${websiteInScreamingSnakeCase}_APPLE_NEWS_KEY_ID`],
    APPLE_NEWS_KEY_SECRET: process.env[`${websiteInScreamingSnakeCase}_APPLE_NEWS_KEY_SECRET`]
  }
}

const processStoryPublish = async (ans, website) => {
  const logger = namedLogger('processStoryPublish').child({
    arcStoryId: ans._id,
    arcWebsiteId: website
  })
  const article = await ansToAppleNews(ans, website)
  const websiteCredentials = getWebsiteCredentials(website)
  const articleMetadata = buildAppleNewsArticleMetadata(ans, website)

  const postArticleResponse = await postArticle({ article, articleMetadata }, { website, websiteCredentials })
  if (!isResponseStatusOk(postArticleResponse.status)) {
    logger.error(postArticleResponse)
    return postArticleResponse
  }

  const idMappingCreationResult = await createIdMapping(documentClient, {
    arcStoryId: ans._id,
    arcWebsiteId: website,
    articleId: postArticleResponse.data?.id,
    articleMetadataRevision: postArticleResponse.data?.revision,
    articleStatus: 'PUBLISHED',
    arcUserId: ans.revision?.user_id
  })

  if (idMappingCreationResult.success) {
    const idMappingResponse = {
      status: postArticleResponse.status,
      message: postArticleResponse.message
    }
    return idMappingResponse
  } else {
    const idMappingResponse = {
      status: 500,
      message: idMappingCreationResult.message,
      errorMessages: idMappingCreationResult.errorMessages
    }
    logger.error(idMappingResponse)
    return idMappingResponse
  }
}

const processStoryRepublish = async (ans, website, idMappings, idMappingsWebsites) => {
  const logger = namedLogger('processStoryRepublish').child({
    arcStoryId: ans._id,
    arcWebsiteId: website
  })
  const article = await ansToAppleNews(ans, website)
  const websiteCredentials = getWebsiteCredentials(website)

  let articleOperationResponse
  let databaseOperationResult = {}

  if (idMappingsWebsites.includes(website)) {
    // circulation republish
    const idMapping = idMappings.find((record) => record.arcWebsiteId === website)
    const articleMetadata = {
      data: {
        isHidden: false,
        revision: idMapping.articleMetadataRevision
      }
    }
    articleOperationResponse = await updateArticle(idMapping.articleId,
      {
        article,
        articleMetadata
      },
      {
        website,
        websiteCredentials
      })

    if (!isResponseStatusOk(articleOperationResponse.status)) {
      logger.error(articleOperationResponse)
      return articleOperationResponse
    }

    databaseOperationResult = await updateIdMapping(documentClient,
      {
        arcStoryId: ans._id,
        arcWebsiteId: website
      }, {
        /* c8 ignore start */
        articleId: articleOperationResponse.data?.id,
        articleMetadataRevision: articleOperationResponse.data?.revision,
        /* c8 ignore end */
        articleStatus: 'PUBLISHED',
        arcUserId: ans.revision?.user_id
      })
  } else {
    // circulation first publish
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)

    articleOperationResponse = await postArticle({ article, articleMetadata },
      { website, websiteCredentials })

    if (!isResponseStatusOk(articleOperationResponse.status)) {
      logger.error(articleOperationResponse)
      return articleOperationResponse
    }

    databaseOperationResult = await createIdMapping(documentClient, {
      arcStoryId: ans._id,
      arcWebsiteId: website,
      articleId: articleOperationResponse.data?.id,
      articleMetadataRevision: articleOperationResponse.data?.revision,
      articleStatus: 'PUBLISHED',
      arcUserId: ans.revision?.user_id
    })
  }

  if (databaseOperationResult.success) {
    const successDatabaseOperationResult = {
      status: articleOperationResponse.status,
      message: articleOperationResponse.message
    }
    return successDatabaseOperationResult
  } else {
    const errorDatabaseOperationResult = {
      status: 500,
      message: databaseOperationResult.message,
      errorMessages: databaseOperationResult.errorMessages
    }
    logger.error(errorDatabaseOperationResult)
    return errorDatabaseOperationResult
  }
}

const processStoryUnpublish = async (event, idMapping) => {
  const logger = namedLogger('processStoryUnpublish').child({
    arcStoryId: idMapping.arcStoryId,
    arcWebsiteId: idMapping.arcWebsiteId
  })
  const websiteCredentials = getWebsiteCredentials(idMapping.arcWebsiteId)

  const articleMetadata = {
    data: {
      isHidden: true,
      revision: idMapping.articleMetadataRevision
    }
  }

  const updateArticleMetadataResponse = await updateArticleMetadata(
    idMapping.articleId,
    articleMetadata,
    { website: idMapping.website, websiteCredentials }
  )

  if (!isResponseStatusOk(updateArticleMetadataResponse.status)) {
    logger.error(updateArticleMetadataResponse)
    return updateArticleMetadataResponse
  }

  const databaseOperationResult = await updateIdMapping(
    documentClient,
    {
      arcStoryId: idMapping.arcStoryId,
      arcWebsiteId: idMapping.arcWebsiteId
    },
    {
      articleId: idMapping.articleId,
      articleMetadataRevision: updateArticleMetadataResponse.data?.revision,
      articleStatus: 'UNPUBLISHED',
      arcUserId: event.body.revision.user_id
    })

  if (databaseOperationResult.success) {
    const successDatabaseOperationResult = {
      status: updateArticleMetadataResponse.status,
      message: updateArticleMetadataResponse.message
    }
    return successDatabaseOperationResult
  } else {
    const errorDatabaseOperationResult = {
      status: 500,
      message: databaseOperationResult.message,
      errorMessages: databaseOperationResult.errorMessages
    }
    logger.error(errorDatabaseOperationResult)
    return errorDatabaseOperationResult
  }
}

const processStoryDelete = async (website, idMappings) => {
  const websiteCredentials = getWebsiteCredentials(website)
  const idMapping = idMappings.find((record) => record.arcWebsiteId === website)

  const logger = namedLogger('processStoryDelete').child({
    arcStoryId: idMapping.arcStoryId,
    arcWebsiteId: idMapping.arcWebsiteId
  })
  const deleteArticleResponse = await deleteArticle(
    idMapping.articleId,
    { website, websiteCredentials }
  )

  if (!isResponseStatusOk(deleteArticleResponse.status)) {
    logger.error(deleteArticleResponse)
    return deleteArticleResponse
  }

  const databaseOperationResult = await deleteIdMapping(
    documentClient,
    {
      arcStoryId: idMapping.arcStoryId,
      arcWebsiteId: idMapping.arcWebsiteId
    })

  if (databaseOperationResult.success) {
    const successDatabaseOperationResult = {
      status: deleteArticleResponse.status,
      message: deleteArticleResponse.message
    }
    return successDatabaseOperationResult
  } else {
    const errorDatabaseOperationResult = {
      status: 500,
      message: databaseOperationResult.message,
      errorMessages: databaseOperationResult.errorMessages
    }
    logger.error(errorDatabaseOperationResult)
    return errorDatabaseOperationResult
  }
}

module.exports = {
  getWebsitesFromEvent,
  getWebsiteCredentials,
  processStoryPublish,
  processStoryRepublish,
  processStoryUnpublish,
  processStoryDelete
}
