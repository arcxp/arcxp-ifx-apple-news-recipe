const { getPhoto } = require('../services/photoAPI')
const { isResponseStatusOk } = require('../utils/httpRequestHelpers')
const { getWebsiteBaseURL } = require('../utils/configHelpers')

const concatenateAuthors = (creditsArray, separator) => {
  if (!creditsArray || !creditsArray.length) {
    return 'Unknown'
  }

  let authorsString = ''

  creditsArray.forEach((author) => {
    if (authorsString !== '') {
      authorsString += separator
    }
    authorsString += author.name
  })

  return authorsString
}

const constructArcResizerURL = (ans, website) => {
  if ('auth' in ans && '1' in ans.auth && ans.auth['1'].length > 0) {
    return `${getWebsiteBaseURL(website)}${process.env.RESIZER_PATH}${ans.url.split('/').pop()}?auth=${ans.auth['1']}`
  }
  // if resizer token does not exist, simply return cloudfront URL
  return ans.url
}

const getLargestStreamURL = (streams) => {
  let largestStreamURL = ''
  let largestStreamSize = -1

  streams.forEach((stream) => {
    if (stream.stream_type === 'ts') {
      if (stream.filesize >= largestStreamSize || largestStreamURL === '') {
        largestStreamSize = stream.filesize
        largestStreamURL = stream.url
      }
    }
  })

  return largestStreamURL
}

const convertListToHTML = (type, items) => {
  const listTag = type === 'unordered' ? 'ul' : 'ol'
  let htmlString = `<${listTag}>`
  items.forEach(item => {
    if (item.type === 'text') {
      // regular list item
      htmlString += `<li>${item.content}</li>`
    } else {
      // nested list
      htmlString += convertListToHTML(item.list_type, item.items)
    }
  })
  htmlString += `</${listTag}>`
  return htmlString
}

const convertImageToANSFromURL = async (url) => {
  const imageID = url.split('/').pop().replace(/\.[^/.]+$/, '')

  const photoApiResponse = await getPhoto(imageID)
  if (isResponseStatusOk(photoApiResponse.status)) {
    return photoApiResponse.message
  } else {
    return {
      url,
      _id: imageID
    }
  }
}

module.exports = {
  concatenateAuthors,
  constructArcResizerURL,
  getLargestStreamURL,
  convertListToHTML,
  convertImageToANSFromURL
}
