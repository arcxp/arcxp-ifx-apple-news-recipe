const { getAppleNewsConfig, getWebsiteBaseURL } = require('./configHelpers')
const {
  concatenateAuthors,
  constructArcResizerURL,
  getLargestStreamURL,
  convertListToHTML,
  convertImageToANSFromURL
} = require('./ansHelpers')

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const cheerio = require('cheerio')
const { namedLogger } = require('./namedLogger')

dayjs.extend(utc)
dayjs.extend(timezone)

const appleNewsConfig = getAppleNewsConfig()

const checkEnvironmentVariables = (
  APPLE_NEWS_URL,
  { APPLE_NEWS_CHANNEL_ID, APPLE_NEWS_KEY_ID, APPLE_NEWS_KEY_SECRET },
  website
) => {
  if (!APPLE_NEWS_URL) {
    return {
      status: 500,
      message: 'Missing APPLE_NEWS_URL environment variable',
      errorMessages: ['MISSING_APPLE_NEWS_ENV_VARIABLES']
    }
  }

  if (!APPLE_NEWS_CHANNEL_ID || !APPLE_NEWS_KEY_ID || !APPLE_NEWS_KEY_SECRET) {
    return {
      status: 500,
      message: `Missing AppleNews secrets for website ${website}`,
      errorMessages: ['MISSING_WEBSITE_APPLE_NEWS_ENV_VARIABLES']
    }
  }

  return null
}

const ansToAppleNews = async (ans, website) => {
  if (!(website in appleNewsConfig.websites)) {
    throw new Error(`Missing AppleNews configuration for website ${website}`)
  } else if (!('styling' in appleNewsConfig.websites[website])) {
    throw new Error(`Missing Apple News styling configuration for website ${website}`)
  }

  const websiteConfig = appleNewsConfig.websites[website]
  const { layout, componentTextStyles, componentStyles, componentLayouts } = websiteConfig.styling

  const baseAppleNewsObject = buildAppleNewsBaseArticle(ans)

  const article = {
    ...baseAppleNewsObject,
    layout: { ...layout },
    components: await buildComponents(ans, website),
    componentTextStyles: { ...componentTextStyles },
    componentStyles: { ...componentStyles },
    componentLayouts: { ...componentLayouts }
  }

  const metadata = buildMetadata(ans, website)

  if (Object.keys(metadata).length) {
    article.metadata = metadata
  }

  return article
}

const buildAppleNewsBaseArticle = (ans) => {
  const baseObject = {
    version: '1.0',
    language: getLanguage(),
    identifier: ans._id,
    title: ans.headlines.basic
  }

  return baseObject
}

const getLanguage = () => {
  return process.env.APPLE_NEWS_DEFAULT_ARTICLE_LANGUAGE || 'en'
}

const buildComponents = async (ans, website) => {
  return [
    buildHeaderComponents(ans, website),
    ...await buildContentElementComponents(ans, website)
  ]
}

const buildHeaderComponents = (ans, website) => {
  const headerComponents = []
  // insert divider
  headerComponents.push(buildDividerComponent())

  // title
  headerComponents.push({
    role: 'title',
    layout: 'titleLayout',
    text: ans.headlines.basic || 'No headline available'
  })

  if (ans.promo_items && ans.promo_items.basic && ans.promo_items.basic.type === 'image') {
    // Scenario 1 - Basic promo item is set and is of image type
    headerComponents.push({
      role: 'figure',
      layout: 'headerImageLayout',
      URL: constructArcResizerURL(ans.promo_items.basic, website)
    },
    {
      text: ans.promo_items.basic.caption || '',
      anchor: {
        targetAnchorPosition: 'center',
        originAnchorPosition: 'center'
      },
      layout: 'captionLayout',
      role: 'caption'
    })
    if (ans.promo_items.basic.credits && ans.promo_items.basic.credits.by) {
      headerComponents.push({
        text: `PHOTO CREDIT ${concatenateAuthors(ans.promo_items.basic.credits.by, ' ').toUpperCase()}`,
        anchor: {
          targetAnchorPosition: 'center',
          originAnchorPosition: 'center'
        },
        layout: 'captionLayout',
        role: 'caption'
      })
    }
  } else if (ans.content_elements && ans.content_elements.length && ans.content_elements[0].type === 'image') {
    // Scenario 2 - Basic promo item is NOT set or is NOT of image type, and 1st content element is image (use top image)
    headerComponents.push(
      {
        role: 'figure',
        layout: 'photoLayout',
        URL: constructArcResizerURL(ans.content_elements[0], website),
        animation: {
          type: 'fade_in',
          userControllable: true,
          initialAlpha: 0.0
        }
      },
      {
        text: ans.content_elements[0].caption || '',
        anchor: {
          targetAnchorPosition: 'center',
          originAnchorPosition: 'center'
        },
        layout: 'captionLayout',
        role: 'caption'
      }
    )
  }

  // if none of the scenarios match, then the header components should only include the title and divider, ending with the following static compoents

  // divider
  headerComponents.push(buildDividerComponent())

  // byline author
  headerComponents.push({
    role: 'byline',
    layout: 'bylineLayout',
    text: concatenateAuthors(ans.credits?.by || [], ', ').toUpperCase(),
    format: 'html'
  })

  // byline publish date
  headerComponents.push({
    role: 'byline',
    layout: 'bylineLayout',
    text: dayjs.utc(ans.publish_date).format('MMMM D YYYY, h:mma').toUpperCase()
  })

  // divider
  headerComponents.push(buildDividerComponent())

  return {
    role: 'section',
    layout: 'headerContainerLayout',
    style: 'containerStyle',
    scene: {
      type: 'fading_sticky_header',
      fadeColor: '#fff'
    },
    components: [...headerComponents]
  }
}

const buildContentElementComponents = async (ans, website) => {
  const contentElementComponents = []
  const logger = namedLogger('buildContentElementComponents').child({
    arcStoryId: ans._id,
    arcWebsiteId: website
  })

  if (ans.content_elements && ans.content_elements.length) {
    for (const element of ans.content_elements) {
      switch (element.type) {
        case 'header': {
          contentElementComponents.push(buildHeadingComponent(element))
          break
        }
        case 'text': {
          contentElementComponents.push(buildTextComponent(element))
          break
        }
        case 'list': {
          contentElementComponents.push(buildListComponent(element))
          break
        }
        case 'image': {
          contentElementComponents.push(buildImageComponent(element, website))
          break
        }
        case 'gallery': {
          const galleryComponent = buildGalleryComponent(element, website)
          if (galleryComponent !== null) {
            contentElementComponents.push(galleryComponent)
          }
          break
        }
        case 'video': {
          contentElementComponents.push(buildVideoComponent(element))
          break
        }
        case 'raw_html': {
          const htmlComponent = await buildHTMLComponent(element, website)
          if (htmlComponent !== null) {
            contentElementComponents.push(htmlComponent)
          }
          break
        }
        case 'oembed_response': {
          const oembedComponent = buildOEmbedComponent(element)
          if (oembedComponent !== null) {
            contentElementComponents.push(oembedComponent)
          }
          break
        }
        case 'interstitial_link': {
          const linkComponent = buildInterstitialLinkComponent(element)
          if (linkComponent !== null) {
            contentElementComponents.push(linkComponent)
          }
          break
        }
        case 'table': {
          const tableComponent = buildTableComponent(element)
          if (tableComponent !== null) {
            contentElementComponents.push(tableComponent)
          }
          break
        }
        case 'quote': {
          const quoteComponent = buildQuoteComponent(element)
          if (quoteComponent !== null) {
            contentElementComponents.push(quoteComponent)
          }
          break
        }
        case 'divider': {
          contentElementComponents.push(buildDividerComponent())
          break
        }
        default: {
          logger.info(`Skipping transformation of unsupported content element type ${element.type}`)
        }
      }
    }
  }

  contentElementComponents.push(buildAdvertisementComponent())

  return contentElementComponents
}

const buildHeadingComponent = (elementANS) => {
  return {
    role: `heading${elementANS.level}`,
    text: elementANS.content,
    format: 'html'
  }
}

const buildTextComponent = (elementANS) => {
  return {
    role: 'body',
    layout: 'bodyLayout',
    text: elementANS.content,
    format: 'html'
  }
}

const buildListComponent = (elementANS) => {
  return {
    role: 'body',
    layout: 'bodyLayout',
    text: convertListToHTML(elementANS.list_type, elementANS.items),
    format: 'html'
  }
}

const buildImageComponent = (elementANS, website) => {
  return {
    role: 'figure',
    layout: 'photoLayout',
    URL: constructArcResizerURL(elementANS, website),
    caption: elementANS.caption || '',
    animation: {
      type: 'fade_in',
      userControllable: true,
      initialAlpha: 0.0
    }
  }
}

const buildGalleryComponent = (elementANS, website) => {
  let galleryComponent = null
  if (elementANS.content_elements && elementANS.content_elements.length > 0) {
    galleryComponent = {
      role: 'gallery',
      layout: 'galleryLayout',
      items: []
    }
    elementANS.content_elements.forEach((image) => {
      galleryComponent.items.push({
        URL: constructArcResizerURL(image, website),
        caption: image.caption || image.subtitle || ''
      })
    })
  }
  return galleryComponent
}

const buildVideoComponent = (elementANS) => {
  const videoComponent = {
    role: 'video',
    layout: 'videoLayout',
    URL: getLargestStreamURL(elementANS.streams)
  }

  if (elementANS.promo_items?.basic?.type === 'image' && elementANS.promo_items?.basic?.url) {
    videoComponent.stillURL = elementANS.promo_items.basic.url
  }

  return videoComponent
}

const buildHTMLComponent = async (element, website) => {
  const decodedHTML = cheerio.load(element.content, { xml: { xmlMode: false, decodeEntities: true } }, false).html({ decodeEntities: false })
  const $ = cheerio.load(decodedHTML, {}, false)
  if ($('iframe').length > 0) {
    const src = $('iframe').attr('src')

    if (src.endsWith('undefined')) {
      return null
    }

    const url = new URL(src)
    const hostname = url.hostname
    if (hostname === 'www.youtube.com' || hostname === 'player.vimeo.com') {
      url.search = ''
      return {
        role: 'embedvideo',
        URL: url.toString().replace('embed//', 'embed/'),
        layout: 'videoLayout'
      }
    } else if (hostname === 'www.facebook.com') {
      return {
        role: 'facebook_post',
        URL: url.searchParams.get('href'),
        layout: 'fbLayout'
      }
    } else {
      return null
    }
  } else {
    const twitter = $('blockquote.twitter-tweet')
    const instagram = $('blockquote.instagram-media')
    const aimg = $('a')

    if (twitter.length > 0) {
      const _hrefs = twitter.find('a[href]')
      for (const href of _hrefs) {
        const url = new URL(href.attribs.href)
        if (url.pathname.includes('status')) {
          return {
            role: 'tweet',
            URL: url.toString(),
            layout: 'twitterLayout'
          }
        }
      }
      return null
    } else if (instagram.length > 0) {
      const href = instagram.find('a').attr('href')
      const url = new URL(href)
      url.search = ''
      return {
        role: 'instagram',
        URL: url.toString(),
        layout: 'instagramLayout'
      }
    } else if (aimg.length > 0 && aimg.children().length > 0) {
      const img = aimg.children()
      const url = new URL(img.attr('src'))
      return {
        role: 'figure',
        layout: 'photoLayout',
        URL: url.host.includes('arcpublishing.com') ? constructArcResizerURL(await convertImageToANSFromURL(img.attr('src')), website) : img.attr('src'),
        caption: img.attr('alt'),
        animation: {
          type: 'fade_in',
          userControllable: true,
          initialAlpha: 0.0
        }
      }
    } else {
      return {
        role: 'body',
        layout: 'bodyLayout',
        text: element.content,
        format: 'html'
      }
    }
  }
}

const buildOEmbedComponent = (elementANS) => {
  let oembedComponent = null
  switch (elementANS.subtype) {
    case 'youtube':
      oembedComponent = {
        role: 'embedvideo',
        URL: elementANS.referent.id,
        layout: 'youtubeLayout'
      }
      break
    case 'twitter':
      oembedComponent = {
        role: 'tweet',
        URL: elementANS.referent.id,
        layout: 'twitterLayout'
      }
      break
    case 'facebook':
    case 'facebook-post':
      oembedComponent = {
        role: 'facebook_post',
        URL: elementANS.referent.id,
        layout: 'fbLayout'
      }
      break
    case 'spotify':
    case 'facebook-video':
      oembedComponent = {
        role: 'body',
        text: `<a href="${elementANS.referent.id}">${elementANS.referent.id}</a>`,
        format: 'html',
        layout: 'bodyLayout'
      }
      break
  }
  return oembedComponent
}

const buildInterstitialLinkComponent = (element) => {
  let linkComponent = null
  if ('url' in element && 'content' in element) {
    try {
      const baseUrl = new URL(element.url)
      linkComponent = {
        role: 'body',
        layout: 'bodyLayout',
        format: 'html',
        text: `<p><a href="${baseUrl.toJSON()}">${element.content}</a></p>`
      }
    } catch (exception) {}
  }
  return linkComponent
}

const buildTableComponent = (elementANS) => {
  let tableComponent = null
  // Apple News will not accept html tables without both head and body
  if (elementANS.header && elementANS.header.length > 0 && elementANS.rows && elementANS.rows.length > 0) {
    let htmlTable = '<table>'
    htmlTable += '<thead>'
    elementANS.header.forEach((column) => {
      htmlTable += `<th>${column.content}</th>`
    })
    htmlTable += '</thead>'
    htmlTable += '<tbody>'
    elementANS.rows.forEach((row) => {
      htmlTable += '<tr>'
      row.forEach((column) => {
        htmlTable += `<td>${column.content}</td>`
      })
      htmlTable += '</tr>'
    })
    htmlTable += '</tbody>'
    htmlTable += '</table>'
    tableComponent = {
      role: 'htmltable',
      html: htmlTable
    }
  }
  return tableComponent
}

const buildQuoteComponent = (elementANS) => {
  let quoteComponent = null
  if (elementANS.subtype && elementANS.content_elements && elementANS.content_elements.length > 0) {
    let htmlQuote = ''
    elementANS.content_elements.forEach((element) => {
      if (element.type === 'text') {
        htmlQuote += `<p>${element.content}</p>`
      } else if (element.type === 'header') {
        htmlQuote += `<h${element.level}>${element.content}</h${element.level}>`
      }
    })
    quoteComponent = {
      role: (elementANS.subtype === 'blockquote') ? 'quote' : 'pullquote',
      text: htmlQuote,
      format: 'html'
    }
  }
  return quoteComponent
}

const buildDividerComponent = () => {
  return {
    layout: 'dividerLayout',
    role: 'divider',
    stroke: {
      color: '#d2d2d2',
      width: 2
    }
  }
}

const buildAdvertisementComponent = () => {
  return {
    role: 'medium_rectangle_advertisement',
    bannerType: 'any',
    frequency: 10
  }
}

const buildMetadata = (ans, website) => {
  const metadata = {}
  if ('credits' in ans && ans.credits.by.length) {
    const authors = []
    for (const credit of ans.credits.by) {
      if (credit.name) {
        authors.push(credit.name)
      } else {
        authors.push('Unknown')
      }
    }

    if (authors.length) {
      metadata.authors = authors
    }
  }

  if ('description' in ans && ans.description.basic) {
    metadata.excerpt = ans.description.basic
  }

  if (website in ans.websites && 'website_url' in ans.websites[website]) {
    metadata.canonicalURL = `${getWebsiteBaseURL(website)}${ans.websites[website].website_url}`
  }

  if (ans.publish_date) {
    metadata.datePublished = dayjs.utc(ans.publish_date).format('YYYY-MM-DDTHH:mm:ssZ')
  }

  if (ans.last_updated_date) {
    metadata.dateModified = dayjs.utc(ans.last_updated_date).format('YYYY-MM-DDTHH:mm:ssZ')
  }

  // Set thumbanilURL depending on one of the following scenarios (if applicable)
  if (ans.promo_items && ans.promo_items.basic && ans.promo_items.basic.type === 'image') {
    // Scenario 1 - Basic promo item is set and is of image type
    metadata.thumbnailURL = constructArcResizerURL(ans.promo_items.basic, website)
  } else if (ans.content_elements && ans.content_elements.length && ans.content_elements[0].type === 'image') {
    // Scenario 2 - Basic promo item is NOT set or is NOT of image type, and 1st content element is image (use top image)
    metadata.thumbnailURL = constructArcResizerURL(ans.content_elements[0], website)
  }

  if ('taxonomy' in ans && 'seo_keywords' in ans.taxonomy && ans.taxonomy.seo_keywords.length) {
    metadata.keywords = [...ans.taxonomy.seo_keywords]
  }

  return metadata
}

const buildAppleNewsArticleMetadata = (ans, website) => {
  const websiteConfig = appleNewsConfig.websites[website]
  let articleSections = []

  for (const section of ans.taxonomy.sections) {
    if (website === section._website && `${section._id}` in websiteConfig.sections) {
      articleSections.push(websiteConfig.sections[`${section._id}`].url)
    }
  }

  let sectionsMetadata = {}

  if (!articleSections.length) {
    if (websiteConfig.sections?.default?.url) {
      sectionsMetadata = { ...websiteConfig.sections?.default?.metadata }
      articleSections = [websiteConfig.sections.default.url]
    } else {
      articleSections = []
    }
  } else {
    const primarySection = ans.websites[website].website_section._id
    if (primarySection in websiteConfig.sections) {
      sectionsMetadata = websiteConfig.sections[primarySection].metadata
    }
  }

  const data = {
    ...(appleNewsConfig.orgMetadata || {}),
    ...(websiteConfig.metadata || {}),
    ...sectionsMetadata,
    links: { sections: articleSections }
  }
  return { data }
}

module.exports = {
  getWebsiteBaseURL,
  checkEnvironmentVariables,
  ansToAppleNews,
  buildAppleNewsBaseArticle,
  buildMetadata,
  buildHeaderComponents,
  buildContentElementComponents,
  buildTextComponent,
  buildHeadingComponent,
  buildListComponent,
  buildImageComponent,
  buildGalleryComponent,
  buildVideoComponent,
  buildHTMLComponent,
  buildOEmbedComponent,
  buildInterstitialLinkComponent,
  buildTableComponent,
  buildQuoteComponent,
  buildDividerComponent,
  buildAppleNewsArticleMetadata
}
