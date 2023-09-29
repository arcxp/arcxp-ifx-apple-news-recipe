const { mockedAns, mockedFirstPublishEvent, mockedAppleNewsArticle, mockedImageANS, mockedWebsiteCredentials } = require('../mocks')
const { getWebsitesFromEvent } = require('../../src/utils/handlerHelpers')
const { getAppleNewsConfig } = require('../../src/utils/configHelpers')
const { getPhoto } = require('../../src/services/photoAPI')
const {
  checkEnvironmentVariables,
  ansToAppleNews,
  buildContentElementComponents,
  buildAppleNewsBaseArticle,
  buildQuoteComponent,
  buildTableComponent,
  buildOEmbedComponent,
  buildHTMLComponent,
  buildInterstitialLinkComponent,
  buildMetadata, buildHeaderComponents, buildTextComponent, buildHeadingComponent, buildListComponent,
  buildImageComponent, buildGalleryComponent, buildVideoComponent, buildAppleNewsArticleMetadata
} = require('../../src/utils/appleNewsHelpers')

jest.mock('../../src/services/photoAPI', () => ({
  getPhoto: jest.fn()
}))

const logSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => {})

const requiredAppleNewsArticleProps = [
  'version',
  'identifier',
  'title',
  'language',
  'layout',
  'components',
  'componentTextStyles',
  'componentStyles',
  'componentLayouts'
]

const metadataProps = [
  'authors',
  'excerpt',
  'canonicalURL',
  'datePublished',
  'dateModified',
  'thumbnailURL',
  'keywords'
]

const validAppleNewsArticleMetadataProps = [
  'isCandidateToBeFeatured',
  'isHidden',
  'isPreview',
  'isSponsored',
  'links',
  'maturityRating',
  'targetTerritoryCountryCodes'
]

describe('appleNewsHelpers', () => {
  beforeEach(() => {
    logSpy.mockClear()
  })

  test('checkEnvironmentVariables should return null if env variables are Ok', async () => {
    const result = checkEnvironmentVariables('https://news-api.apple.com', mockedWebsiteCredentials, 'example')
    expect(result).toBeNull()
  })

  test('checkEnvironmentVariables should return an error if APPLE_NEWS_URL is missing', async () => {
    const result = checkEnvironmentVariables(undefined, mockedWebsiteCredentials, 'example')
    expect(result).toMatchObject({
      status: 500,
      message: 'Missing APPLE_NEWS_URL environment variable',
      errorMessages: ['MISSING_APPLE_NEWS_ENV_VARIABLES']
    })
  })

  test('checkEnvironmentVariables should return an error if apple news secrets are missing', async () => {
    const result = checkEnvironmentVariables('https://news-api.apple.com', {}, 'example')
    expect(result).toMatchObject({
      status: 500,
      message: 'Missing AppleNews secrets for website example',
      errorMessages: ['MISSING_WEBSITE_APPLE_NEWS_ENV_VARIABLES']
    })
  })

  test('ansToAppleNews returns valid Apple News article', async () => {
    const website = getWebsitesFromEvent(mockedFirstPublishEvent.body)[0]
    const article = await ansToAppleNews(mockedAns, website)

    for (const property of requiredAppleNewsArticleProps) {
      expect(article).toHaveProperty(property)
    }
  })

  test('ansToAppleNews throws an error if there is no configuration for website', async () => {
    await expect(async () => {
      await ansToAppleNews(mockedAns, 'test')
    }).rejects.toThrow('Missing AppleNews configuration for website test')
  })

  test('ansToAppleNews throws an error if there is no styling for website', async () => {
    await expect(async () => {
      await ansToAppleNews(mockedAns, 'invalid-example')
    }).rejects.toThrow('Missing Apple News styling configuration for website invalid-example')
  })

  test('buildAppleNewsBaseArticle returns the expected result', () => {
    const baseArticle = buildAppleNewsBaseArticle(mockedAns)

    expect(baseArticle).toHaveProperty('version')
    expect(baseArticle).toHaveProperty('language')
    expect(baseArticle).toHaveProperty('identifier')
    expect(baseArticle).toHaveProperty('title')

    const { version, language, identifier, title } = mockedAppleNewsArticle
    const expectedBaseArticle = { version, language, identifier, title }

    expect(baseArticle).toMatchObject(expectedBaseArticle)
  })

  test('buildAppleNewsBaseArticle returns the expected result if subtitle is in ans.subheadlines', () => {
    const ans = mockedAns
    ans.subheadlines.basic = ans.description.basic
    const baseArticle = buildAppleNewsBaseArticle(ans)

    expect(baseArticle).toHaveProperty('version')
    expect(baseArticle).toHaveProperty('language')
    expect(baseArticle).toHaveProperty('identifier')
    expect(baseArticle).toHaveProperty('title')

    const { version, language, identifier, title } = mockedAppleNewsArticle

    const expectedBaseArticle = { version, language, identifier, title }

    expect(baseArticle).toMatchObject(expectedBaseArticle)
  })

  test('buildAppleNewsBaseArticle defaults language to en', () => {
    process.env.APPLE_NEWS_DEFAULT_ARTICLE_LANGUAGE = ''
    const baseArticle = buildAppleNewsBaseArticle(mockedAns)

    expect(baseArticle).toHaveProperty('version')
    expect(baseArticle).toHaveProperty('language')
    expect(baseArticle).toHaveProperty('identifier')
    expect(baseArticle).toHaveProperty('title')

    const { version, language, identifier, title } = mockedAppleNewsArticle
    const expectedBaseArticle = { version, language, identifier, title }

    expect(baseArticle).toMatchObject(expectedBaseArticle)
    expect(baseArticle.language).toEqual('en')
  })

  test('buildMetadata returns the expected result', () => {
    const metadataObject = buildMetadata(mockedAns, 'example')

    for (const property of metadataProps) {
      expect(metadataObject).toHaveProperty(property)
    }

    const { metadata } = mockedAppleNewsArticle

    expect(metadataObject).toMatchObject(metadata)
  })

  test('buildMetadata returns the expected result if there are no author names', () => {
    const ans = {
      ...mockedAns,
      credits: {
        by: [{ key: 'value' }]
      }
    }

    const metadataObject = buildMetadata(ans, 'example')

    expect(metadataObject).toHaveProperty('authors')
    expect(metadataObject).toHaveProperty('excerpt')
    expect(metadataObject).toHaveProperty('canonicalURL')
    expect(metadataObject).toHaveProperty('datePublished')
    expect(metadataObject).toHaveProperty('dateModified')
    expect(metadataObject).toHaveProperty('thumbnailURL')
    expect(metadataObject).toHaveProperty('keywords')

    const { metadata } = mockedAppleNewsArticle
    metadata.authors = ['Unknown']

    expect(metadataObject).toMatchObject(metadata)
  })

  test('buildMetadata returns expected result if promo_items is not image and first content element is image', () => {
    const ans = {
      ...mockedAns,
      credits: {
        by: [{ key: 'value' }]
      },
      promo_items: {
        basic: {
          type: 'other'
        }
      },
      content_elements: [
        {
          _id: 'SOMECONTENTELMENTID1',
          type: 'image',
          auth: {
            1: '0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE'
          },
          url: 'https://cloudfront-us-east-1.images.arcpublishing.com/sandbox.example/NZZIENPTN5RACTM5A3HES7FUTU.jpg',
          caption: 'Sit amet justo donec enim diam vulputate.'
        },
        {
          _id: 'SOMECONTENTELMENTID2',
          content: 'Paragraph 1',
          type: 'text'
        },
        {
          _id: 'SOMECONTENTELMENTID3',
          content: 'Paragraph 2',
          type: 'text'
        }
      ]
    }

    const metadataObject = buildMetadata(ans, 'example')

    expect(metadataObject).toHaveProperty('authors')
    expect(metadataObject).toHaveProperty('excerpt')
    expect(metadataObject).toHaveProperty('canonicalURL')
    expect(metadataObject).toHaveProperty('datePublished')
    expect(metadataObject).toHaveProperty('dateModified')
    expect(metadataObject).toHaveProperty('thumbnailURL')
    expect(metadataObject).toHaveProperty('keywords')

    const { metadata } = mockedAppleNewsArticle
    metadata.authors = ['Unknown']
    metadata.thumbnailURL = 'https://example.com/resizer/v2/NZZIENPTN5RACTM5A3HES7FUTU.jpg?auth=0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE'

    expect(metadataObject).toMatchObject(metadata)
  })

  test('buildMetadata returns expected result if promo_items is not image and first content element is NOT image', () => {
    const ans = {
      ...mockedAns,
      credits: {
        by: [{ key: 'value' }]
      },
      promo_items: {
        basic: {
          type: 'other'
        }
      },
      content_elements: [
        {
          _id: 'SOMECONTENTELMENTID2',
          content: 'Paragraph 1',
          type: 'text'
        },
        {
          _id: 'SOMECONTENTELMENTID3',
          content: 'Paragraph 2',
          type: 'text'
        }
      ]
    }
    const metadataObject = buildMetadata(ans, 'example')

    expect(metadataObject).toHaveProperty('authors')
    expect(metadataObject).toHaveProperty('excerpt')
    expect(metadataObject).toHaveProperty('canonicalURL')
    expect(metadataObject).toHaveProperty('datePublished')
    expect(metadataObject).toHaveProperty('dateModified')
    expect(metadataObject).not.toHaveProperty('thumbnailURL')
    expect(metadataObject).toHaveProperty('keywords')

    const { metadata } = Object.assign({}, mockedAppleNewsArticle)
    metadata.authors = ['Unknown']
    delete metadata.thumbnailURL

    expect(metadataObject).toMatchObject(metadata)
  })

  describe('Header Components', () => {
    test('buildHeaderComponents returns the expected result when headline is NOT set', () => {
      const ans = {
        ...mockedAns,
        headlines: {}
      }

      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'No headline available'
          },
          {
            role: 'figure',
            layout: 'headerImageLayout',
            URL: 'https://example.com/resizer/v2/E6NLRIP4QBMKKEMFZ7LCVCYFUI.jpg?auth=1234b652d60a8ac4bfc8366eef00831c706e2aeb350b233a69aba85faexample'
          },
          {
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            text: 'PHOTO CREDIT TEST AUTHOR1',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'SUPPORT TEST',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(ans, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })

    test('buildHeaderComponents returns the expected result when promo item is set and of image type', () => {
      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'This is a test headline'
          },
          {
            role: 'figure',
            layout: 'headerImageLayout',
            URL: 'https://example.com/resizer/v2/E6NLRIP4QBMKKEMFZ7LCVCYFUI.jpg?auth=1234b652d60a8ac4bfc8366eef00831c706e2aeb350b233a69aba85faexample'
          },
          {
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            text: 'PHOTO CREDIT TEST AUTHOR1',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'SUPPORT TEST',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(mockedAns, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })

    test('buildHeaderComponents returns expected result when promo item is type image without a caption', () => {
      const ans = structuredClone(mockedAns)

      delete ans.promo_items.basic.caption

      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'This is a test headline'
          },
          {
            role: 'figure',
            layout: 'headerImageLayout',
            URL: 'https://example.com/resizer/v2/E6NLRIP4QBMKKEMFZ7LCVCYFUI.jpg?auth=1234b652d60a8ac4bfc8366eef00831c706e2aeb350b233a69aba85faexample'
          },
          {
            text: '',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            text: 'PHOTO CREDIT TEST AUTHOR1',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'SUPPORT TEST',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(ans, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })

    test('buildHeaderComponents returns expected when promo item is NOT type image AND first content element also image', () => {
      // change the type to other than image and set first content element as image
      const ans = {
        ...mockedAns,
        promo_items: {
          basic: {
            type: 'other'
          }
        },
        content_elements: [
          {
            _id: 'SOMECONTENTELMENTID1',
            type: 'image',
            auth: {
              1: '0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE'
            },
            url: 'https://www.example.com/resizer/Iy3H8example=/cloudfront-us-east-1.images.arcpublishing.com/sandbox.example/NZZIENPTN5RACTM5A3HES7FUTU.jpg',
            caption: 'Sit amet justo donec enim diam vulputate.'
          },
          {
            _id: 'SOMECONTENTELMENTID2',
            content: 'Paragraph 1',
            type: 'text'
          },
          {
            _id: 'SOMECONTENTELMENTID3',
            content: 'Paragraph 2',
            type: 'text'
          }
        ]
      }
      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'This is a test headline'
          },
          {
            role: 'figure',
            layout: 'photoLayout',
            URL: 'https://example.com/resizer/v2/NZZIENPTN5RACTM5A3HES7FUTU.jpg?auth=0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE',
            animation: {
              type: 'fade_in',
              userControllable: true,
              initialAlpha: 0
            }
          },
          {
            text: 'Sit amet justo donec enim diam vulputate.',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'SUPPORT TEST',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(ans, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })

    test('buildHeaderComponents returns expected when promo item NOT image AND first content element is image without caption', () => {
      const ans = {
        ...mockedAns,
        promo_items: {
          basic: {
            type: 'other'
          }
        },
        content_elements: [
          {
            _id: 'SOMECONTENTELMENTID1',
            type: 'image',
            auth: {
              1: '0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE'
            },
            url: 'https://www.example.com/resizer/Iy3H8example=/cloudfront-us-east-1.images.arcpublishing.com/sandbox.example/NZZIENPTN5RACTM5A3HES7FUTU.jpg'
          },
          {
            _id: 'SOMECONTENTELMENTID2',
            content: 'Paragraph 1',
            type: 'text'
          },
          {
            _id: 'SOMECONTENTELMENTID3',
            content: 'Paragraph 2',
            type: 'text'
          }
        ]
      }
      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'This is a test headline'
          },
          {
            role: 'figure',
            layout: 'photoLayout',
            URL: 'https://example.com/resizer/v2/NZZIENPTN5RACTM5A3HES7FUTU.jpg?auth=0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE',
            animation: {
              type: 'fade_in',
              userControllable: true,
              initialAlpha: 0
            }
          },
          {
            text: '',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'SUPPORT TEST',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(ans, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })

    test('buildHeaderComponents returns expected when promo item is NOT image AND first content element also NOT image', () => {
      const ans = {
        ...mockedAns,
        promo_items: {
          basic: {
            type: 'other'
          }
        },
        content_elements: [
          {
            _id: 'SOMECONTENTELMENTID1',
            content: 'Paragraph 1',
            type: 'text'
          },
          {
            _id: 'SOMECONTENTELMENTID2',
            content: 'Paragraph 2',
            type: 'text'
          }
        ]
      }
      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'This is a test headline'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'SUPPORT TEST',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(ans, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })

    test('buildHeaderComponents returns the expected result when credits.by is undefined', () => {
      const ans = {
        ...mockedAns,
        headlines: {},
        credits: undefined
      }

      const expectedHeaderComponents = {
        role: 'section',
        layout: 'headerContainerLayout',
        style: 'containerStyle',
        scene: {
          type: 'fading_sticky_header',
          fadeColor: '#fff'
        },
        components: [
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'title',
            layout: 'titleLayout',
            text: 'No headline available'
          },
          {
            role: 'figure',
            layout: 'headerImageLayout',
            URL: 'https://example.com/resizer/v2/E6NLRIP4QBMKKEMFZ7LCVCYFUI.jpg?auth=1234b652d60a8ac4bfc8366eef00831c706e2aeb350b233a69aba85faexample'
          },
          {
            text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            text: 'PHOTO CREDIT TEST AUTHOR1',
            anchor: {
              targetAnchorPosition: 'center',
              originAnchorPosition: 'center'
            },
            layout: 'captionLayout',
            role: 'caption'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'UNKNOWN',
            format: 'html'
          },
          {
            role: 'byline',
            layout: 'bylineLayout',
            text: 'JULY 1 2023, 7:45AM'
          },
          {
            layout: 'dividerLayout',
            role: 'divider',
            stroke: {
              color: '#d2d2d2',
              width: 2
            }
          }
        ]
      }

      const headerComponents = buildHeaderComponents(ans, 'example')
      expect(headerComponents).toMatchObject(expectedHeaderComponents)
    })
  })

  describe('Content Element Components', () => {
    test('buildContentElementComponents return expected Apple News format array from inputted ANS', async () => {
      const expectedContentElementComponents = [
        {
          role: 'heading1',
          text: 'Header 1 text',
          format: 'html'
        },
        {
          role: 'heading2',
          text: 'Header 2 text',
          format: 'html'
        },
        {
          role: 'body',
          layout: 'bodyLayout',
          text: 'Regular paragraph text',
          format: 'html'
        },
        {
          role: 'body',
          layout: 'bodyLayout',
          text: 'Some paragraph with some styling &lt;i&gt;cursive,&lt;/i&gt; &lt;b&gt;bold&lt;/b&gt;, &lt;u&gt;underline&lt;/u&gt;, with some &lt;mark class="hl_orange"&gt;color&lt;/mark&gt; and a &lt;a href="https://testurl.com/"&gt;link&lt;/a&gt;.',
          format: 'html'
        },
        {
          role: 'body',
          layout: 'bodyLayout',
          text: '<ul><li>Unordered list item 1</li><li>Unordered list item 2</li><ul><li>Unordered nested item 1</li></ul></ul>',
          format: 'html'
        },
        {
          role: 'body',
          layout: 'bodyLayout',
          text: '<ol><li>Ordered list item 1</li><li>Ordered list item 2</li><ol><li>Ordered nested item 1</li></ol></ol>',
          format: 'html'
        },
        {
          role: 'figure',
          layout: 'photoLayout',
          URL: 'https://example.com/resizer/v2/NZZIENPTN5RACTM5A3HES7FUTU.jpg?auth=0e757d35abd51f351f385976b417e358597bc230324a76a6719705f2fEXAMPLE',
          caption: 'Sit amet justo donec enim diam vulputate.',
          animation: {
            type: 'fade_in',
            userControllable: true,
            initialAlpha: 0.0
          }
        },
        {
          role: 'gallery',
          layout: 'galleryLayout',
          items: [
            {
              URL: 'https://example.com/resizer/v2/3VI2MRC7QE4FS46FGR6HVYCKS4.jpg?auth=examplebd5e53be053184e87d4b2870e7c3142287f13bf8c91052d32ce079c1f9',
              caption: 'Test Caption'
            },
            {
              URL: 'https://example.com/resizer/v2/4TQVIRT7RUDG6O5MGZY42GUWIQ.jpg?auth=2d03d8ca651fa903f51e8989a973270dc59c98cfae245c92eaaf2e5EXAMPLE',
              caption: 'Vitae suscipit tellus mauris a diam maecenas sed.'
            }
          ]
        },
        {
          role: 'video',
          layout: 'videoLayout',
          URL: 'https://example.cloudfront.net/example/2017/08/09/exampleid/exampleid_t_1508870777963_master.m3u8',
          stillURL: 'https://example.cloudfront.net/08-09-2017/t_1502302603870_name_test_thumbnail.jpg'
        },
        {
          role: 'body',
          layout: 'bodyLayout',
          text: '&lt;div class="empty" style="padding: 20px;background-color:#333;color:white;text-align:center;font-size:2em;"&gt;Sample HTML block&lt;/div&gt;',
          format: 'html'
        },
        {
          role: 'embedvideo',
          URL: 'https://www.youtube.com/embed/exampleid',
          layout: 'videoLayout'
        },
        {
          role: 'facebook_post',
          URL: 'https://www.facebook.com/permalink.php?story_fbid%exampleid',
          layout: 'fbLayout'
        },
        {
          role: 'tweet',
          URL: 'https://twitter.com/TestAuthor/status/123456789?ref_src=twsrc%4aEfw',
          layout: 'twitterLayout'
        },
        {
          role: 'instagram',
          URL: 'https://www.instagram.com/reel/exampleid-Q/',
          layout: 'instagramLayout'
        },
        {
          role: 'tweet',
          URL: 'https://twitter.com/anotherexample/status/123456789',
          layout: 'twitterLayout'
        },
        {
          role: 'facebook_post',
          URL: 'https://www.facebook.com/author.test.123/posts/test-id-here',
          layout: 'fbLayout'
        },
        {
          role: 'embedvideo',
          URL: 'https://www.youtube.com/watch?v=abcd123test',
          layout: 'youtubeLayout'
        },
        {
          role: 'body',
          text: '<a href="https://open.spotify.com/episode/abcdefghijklmnop">https://open.spotify.com/episode/abcdefghijklmnop</a>',
          format: 'html',
          layout: 'bodyLayout'
        },
        {
          role: 'body',
          layout: 'bodyLayout',
          format: 'html',
          text: '<p><a href="https://testurl.com/">Test Interstitial Link</a></p>'
        },
        {
          role: 'htmltable',
          html: '<table><thead><th>Column A</th><th>Column B</th><th>Column C</th></thead>' +
            '<tbody><tr><td>A1</td><td>B1</td><td>C1</td></tr>' +
            '<tr><td>A2</td><td>B2</td><td>C2</td></tr></tbody></table>'
        },
        {
          role: 'quote',
          text: '<p>Block quote text</p>',
          format: 'html'
        },
        {
          layout: 'dividerLayout',
          role: 'divider',
          stroke: {
            color: '#d2d2d2',
            width: 2
          }
        },
        {
          role: 'pullquote',
          text: '<p>Pull quote text</p>',
          format: 'html'
        },
        {
          layout: 'dividerLayout',
          role: 'divider',
          stroke: {
            color: '#d2d2d2',
            width: 2
          }
        },
        {
          role: 'medium_rectangle_advertisement',
          bannerType: 'any',
          frequency: 10
        }
      ]
      const testAns = mockedAns
      testAns.content_elements.push({
        _id: '4V5UQJ27BFGPPKKO7JKTGZJVXM',
        additional_properties: {
          _id: 'KEM7KFZYTRERXG6T266G5GHSXA',
          comments: []
        },
        correction_type: 'correction',
        text: 'Correction sample text',
        type: 'correction'
      })
      const contentElementComponents = await buildContentElementComponents(testAns, 'example')
      expect(contentElementComponents).toMatchObject(expectedContentElementComponents)
      expect(process.stdout.write).toHaveBeenCalledTimes(1)
      expect(process.stdout.write).toHaveBeenCalledWith('{' +
        '"level":"info",' +
        '"loggerName":"buildContentElementComponents",' +
        '"arcStoryId":"MGBRL5R32BHPLBAXC5NTIWV5YQ",' +
        '"arcWebsiteId":"example",' +
        '"message":"Skipping transformation of unsupported content element type correction"}\n'
      )
    })

    test('buildContentElementComponents should NOT convert unsupported elements in Apple News', async () => {
      const ansWithUnsupportedContentElements = {
        _id: 'KS76S53SR5LP0PJ856T4NN767V',
        content_elements: [
          {
            _id: 'B4GO44OPQJDH7FPFAJUB2UEQQU',
            additional_properties: {
              _id: 'MFCWTXOMMVA5PAKMGT4HQ7C6VQ',
              comments: []
            },
            items: [
              {
                _id: 'LXOUFEU7FJFB5MW5MZ2Y5KDHTM',
                content: 'Test Link 1',
                description: {
                  _id: 'QEBVHU2NZNB4DLBWLVSQ36QQYY',
                  content: 'Test link',
                  type: 'text'
                },
                type: 'interstitial_link',
                url: 'https://testurl.com'
              },
              {
                _id: '7EE3IOG4IFBRTEVGHKS7DCTAHM',
                content: 'Test Link 2',
                description: {
                  _id: 'JVVT5EWGBBGQRLYJKBKGCSU5AA',
                  content: 'Test Link 2',
                  type: 'text'
                },
                type: 'interstitial_link',
                url: 'http://facebook.com'
              }
            ],
            title: 'Test Link List',
            type: 'link_list'
          }
        ]
      }

      const expectedContentElementComponents = [
        {
          role: 'medium_rectangle_advertisement',
          bannerType: 'any',
          frequency: 10
        }
      ]

      const contentElementComponents = await buildContentElementComponents(ansWithUnsupportedContentElements, 'example')
      expect(contentElementComponents).toMatchObject(expectedContentElementComponents)
      expect(process.stdout.write).toHaveBeenCalledTimes(1)
      expect(process.stdout.write).toHaveBeenCalledWith('{' +
          '"level":"info",' +
          '"loggerName":"buildContentElementComponents",' +
          '"arcStoryId":"KS76S53SR5LP0PJ856T4NN767V",' +
          '"arcWebsiteId":"example",' +
          '"message":"Skipping transformation of unsupported content element type link_list"}\n'
      )
    })

    test('buildTextComponent should convert "text" content element to the equivalent Apple News Format', () => {
      const paragraphANS = {
        _id: 'M55HQT27CNG23OQL7FSSPJ3DUU',
        additional_properties: {
          _id: 1688196535433,
          comments: [],
          inline_comments: []
        },
        content: 'Regular paragraph text',
        type: 'text'
      }

      const expectedAppleNewsFormat = {
        role: 'body',
        layout: 'bodyLayout',
        text: 'Regular paragraph text',
        format: 'html'
      }

      const textAppleNewsComponent = buildTextComponent(paragraphANS)
      expect(textAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })

    test('buildHeadingComponent should convert "header" content elements to Apple News Format for all levels', () => {
      const testHeaders = [
        {
          _id: 'SOMEUNIQUEIDENTIFIER1',
          additional_properties: {
            _id: 100000000001,
            comments: [],
            inline_comments: []
          },
          content: 'Header 1 text',
          level: 1,
          type: 'header'
        },
        {
          _id: 'SOMEUNIQUEIDENTIFIER2',
          additional_properties: {
            _id: 100000000002,
            comments: [],
            inline_comments: []
          },
          content: 'Header 2 text',
          level: 2,
          type: 'header'
        },
        {
          _id: 'SOMEUNIQUEIDENTIFIER3',
          additional_properties: {
            _id: 100000000003,
            comments: [],
            inline_comments: []
          },
          content: 'Header 3 text',
          level: 3,
          type: 'header'
        },
        {
          _id: 'SOMEUNIQUEIDENTIFIER4',
          additional_properties: {
            _id: 100000000004,
            comments: [],
            inline_comments: []
          },
          content: 'Header 4 text',
          level: 4,
          type: 'header'
        },
        {
          _id: 'SOMEUNIQUEIDENTIFIER5',
          additional_properties: {
            _id: 100000000005,
            comments: [],
            inline_comments: []
          },
          content: 'Header 5 text',
          level: 5,
          type: 'header'
        },
        {
          _id: 'SOMEUNIQUEIDENTIFIER6',
          additional_properties: {
            _id: 100000000006,
            comments: [],
            inline_comments: []
          },
          content: 'Header 6 text',
          level: 6,
          type: 'header'
        }
      ]

      const expectedAppleNewsFormat = [
        {
          role: 'heading1',
          text: 'Header 1 text',
          format: 'html'
        },
        {
          role: 'heading2',
          text: 'Header 2 text',
          format: 'html'
        },
        {
          role: 'heading3',
          text: 'Header 3 text',
          format: 'html'
        },
        {
          role: 'heading4',
          text: 'Header 4 text',
          format: 'html'
        },
        {
          role: 'heading5',
          text: 'Header 5 text',
          format: 'html'
        },
        {
          role: 'heading6',
          text: 'Header 6 text',
          format: 'html'
        }
      ]

      testHeaders.forEach((testHeader, index) => {
        expect(buildHeadingComponent(testHeader)).toMatchObject(expectedAppleNewsFormat[index])
      })
    })

    test('buildListComponent should convert "list" content element to equivalent Apple News Format', () => {
      const listANS = {
        _id: '4BGWD7NHXJAOXBYYEYHO4PX44I',
        items: [
          {
            _id: '6F55RBPPCFERLMMMPGNFBPLK6I',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 1',
            type: 'text'
          },
          {
            _id: 'ME7FAHWG3BDCTPPXC7G277RTRQ',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 2',
            type: 'text'
          },
          {
            _id: 'HJ72JMII5RHFHOVBWWR7HVTVMA',
            items: [
              {
                _id: 'Y6ZOY4XEQZGYTNTAIKJNIFFZME',
                additional_properties: {
                  comments: [],
                  inline_comments: []
                },
                block_properties: {},
                content: 'Nested list item 1',
                type: 'text'
              },
              {
                _id: 'TV6OQJEYUJG7RLCIT2SZCYIKUU',
                additional_properties: {
                  comments: [],
                  inline_comments: []
                },
                block_properties: {},
                content: 'Nested list item 2',
                type: 'text'
              },
              {
                _id: 'Z4DARQQLQ5EQ3CW4DNLUQRLSLI',
                items: [
                  {
                    _id: 'VMGGNHRRMFEBDMDHVIYGOAWQLY',
                    additional_properties: {
                      comments: [],
                      inline_comments: []
                    },
                    block_properties: {},
                    content: 'More nested list item 1',
                    type: 'text'
                  },
                  {
                    _id: 'ZYW2FKQVRBEQRMUMIGKI2KPB6Q',
                    additional_properties: {
                      comments: [],
                      inline_comments: []
                    },
                    block_properties: {},
                    content: 'More nested list item 2',
                    type: 'text'
                  },
                  {
                    _id: 'PUUJN54LK5FYRIHKO32IUEKL5Q',
                    items: [
                      {
                        _id: 'V4QYVLVRZFBRVHZFBMRWQRCRBM',
                        additional_properties: {
                          comments: [],
                          inline_comments: []
                        },
                        block_properties: {},
                        content: 'Even more nested item 1',
                        type: 'text'
                      }
                    ],
                    list_type: 'unordered',
                    type: 'list'
                  }
                ],
                list_type: 'unordered',
                type: 'list'
              }
            ],
            list_type: 'unordered',
            type: 'list'
          }
        ],
        list_type: 'unordered',
        type: 'list'
      }

      const expectedAppleNewsFormat = {
        role: 'body',
        layout: 'bodyLayout',
        text: '<ul><li>List item 1</li><li>List item 2</li><ul><li>Nested list item 1</li><li>Nested list item 2</li><ul><li>More nested list item 1</li><li>More nested list item 2</li><ul><li>Even more nested item 1</li></ul></ul></ul></ul>',
        format: 'html'
      }

      const listAppleNewsComponent = buildListComponent(listANS)
      expect(listAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })

    test('buildImageComponent should convert "image" content element to the equivalent Apple News Format', () => {
      const imageANS = {
        _id: 'SOMEUNIQUEIDENTIFIER',
        auth: {
          1: 's0m3Auth3t1cati0nT0k3n'
        },
        caption: 'A descriptive caption for the image',
        created_date: '2023-06-06T20:20:20Z',
        height: 2000,
        last_updated_date: '2023-06-28T20:30:51Z',
        type: 'image',
        url: 'https://cloudfront-us-east-1.images.arcpublishing.com/sandbox.someorg/SOMEUNIQUEIDENTIFIER.jpg',
        version: '0.10.9',
        width: 3000
      }

      const expectedAppleNewsFormat = {
        role: 'figure',
        layout: 'photoLayout',
        URL: 'https://example.com/resizer/v2/SOMEUNIQUEIDENTIFIER.jpg?auth=s0m3Auth3t1cati0nT0k3n',
        caption: 'A descriptive caption for the image',
        animation: {
          type: 'fade_in',
          userControllable: true,
          initialAlpha: 0.0
        }
      }

      const imageAppleNewsComponent = buildImageComponent(imageANS, 'example')
      expect(imageAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })

    test('buildImageComponent should convert "image" content element to Apple News Format when no caption is set', () => {
      const imageANS = {
        _id: 'SOMEUNIQUEIDENTIFIER',
        auth: {
          1: 's0m3Auth3t1cati0nT0k3n'
        },
        created_date: '2023-06-06T20:20:20Z',
        height: 2000,
        last_updated_date: '2023-06-28T20:30:51Z',
        type: 'image',
        url: 'https://cloudfront-us-east-1.images.arcpublishing.com/sandbox.someorg/SOMEUNIQUEIDENTIFIER.jpg',
        version: '0.10.9',
        width: 3000
      }

      const expectedAppleNewsFormat = {
        role: 'figure',
        layout: 'photoLayout',
        URL: 'https://example.com/resizer/v2/SOMEUNIQUEIDENTIFIER.jpg?auth=s0m3Auth3t1cati0nT0k3n',
        caption: '',
        animation: {
          type: 'fade_in',
          userControllable: true,
          initialAlpha: 0.0
        }
      }

      const imageAppleNewsComponent = buildImageComponent(imageANS, 'example')
      expect(imageAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })

    test('buildVideoComponent should convert "video" content element to the equivalent Apple News Format', () => {
      const videoANS = {
        _id: 'cbda483c-756a-4ee8-a9b2-c0f646f95ef6',
        promo_items: {
          basic: {
            credits: {},
            type: 'image',
            url: 'https://example.cloudfront.net/08-09-2017/t_1502302603870_name_test_thumbnail.jpg',
            version: '0.5.8'
          }
        },
        streams: [
          {
            bitrate: 580,
            filesize: 1489336,
            height: 360,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/mobile.m3u8',
            width: 480
          },
          {
            bitrate: 910,
            filesize: 2115376,
            height: 480,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/mobile.m3u8',
            width: 640
          },
          {
            bitrate: 1600,
            filesize: 3436452,
            height: 540,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/sd.m3u8',
            width: 720
          },
          {
            bitrate: 3000,
            filesize: 6143464,
            height: 720,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/hd.m3u8',
            width: 960
          },
          {
            bitrate: 1600,
            filesize: 3216649,
            height: 540,
            provider: 'mediaconvert',
            stream_type: 'mp4',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/file_960x540-1600-v4.mp4',
            width: 720
          }
        ],
        type: 'video',
        version: '0.8.0'
      }

      const expectedAppleNewsFormat = {
        role: 'video',
        layout: 'videoLayout',
        stillURL: 'https://example.cloudfront.net/08-09-2017/t_1502302603870_name_test_thumbnail.jpg',
        URL: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/hd.m3u8'
      }

      const videoAppleNewsComponent = buildVideoComponent(videoANS)
      expect(videoAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })

    test('buildVideoComponent converts video type content element to Apple News Format when promo_item NOT image', () => {
      const videoANS = {
        _id: 'cbda483c-756a-4ee8-a9b2-c0f646f95ef6',
        promo_items: {
          basic: {
            credits: {},
            type: 'other',
            url: 'https://example.cloudfront.net/08-09-2017/t_1502302603870_name_test_thumbnail.jpg',
            version: '0.5.8'
          }
        },
        streams: [
          {
            bitrate: 580,
            filesize: 1489336,
            height: 360,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/mobile.m3u8',
            width: 480
          },
          {
            bitrate: 910,
            filesize: 2115376,
            height: 480,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/mobile.m3u8',
            width: 640
          },
          {
            bitrate: 1600,
            filesize: 3436452,
            height: 540,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/sd.m3u8',
            width: 720
          },
          {
            bitrate: 3000,
            filesize: 6143464,
            height: 720,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/hd.m3u8',
            width: 960
          },
          {
            bitrate: 1600,
            filesize: 3216649,
            height: 540,
            provider: 'mediaconvert',
            stream_type: 'mp4',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/file_960x540-1600-v4.mp4',
            width: 720
          }
        ],
        type: 'video',
        version: '0.8.0'
      }

      const expectedAppleNewsFormat = {
        role: 'video',
        layout: 'videoLayout',
        URL: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/hd.m3u8'
      }

      const videoAppleNewsComponent = buildVideoComponent(videoANS)
      expect(videoAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })

    test('buildVideoComponent converts video content element to Apple News Format when promo_item image URL is missing', () => {
      const videoANS = {
        _id: 'cbda483c-756a-4ee8-a9b2-c0f646f95ef6',
        promo_items: {
          basic: {
            credits: {},
            type: 'image',
            version: '0.5.8'
          }
        },
        streams: [
          {
            bitrate: 580,
            filesize: 1489336,
            height: 360,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/mobile.m3u8',
            width: 480
          },
          {
            bitrate: 910,
            filesize: 2115376,
            height: 480,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/mobile.m3u8',
            width: 640
          },
          {
            bitrate: 1600,
            filesize: 3436452,
            height: 540,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/sd.m3u8',
            width: 720
          },
          {
            bitrate: 3000,
            filesize: 6143464,
            height: 720,
            provider: 'mediaconvert',
            stream_type: 'ts',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/hd.m3u8',
            width: 960
          },
          {
            bitrate: 1600,
            filesize: 3216649,
            height: 540,
            provider: 'mediaconvert',
            stream_type: 'mp4',
            url: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/file_960x540-1600-v4.mp4',
            width: 720
          }
        ],
        type: 'video',
        version: '0.8.0'
      }

      const expectedAppleNewsFormat = {
        role: 'video',
        layout: 'videoLayout',
        URL: 'https://t0ken.cloudfront.net/wp-testorgid/987654321/at0ken/featured/hd.m3u8'
      }

      const videoAppleNewsComponent = buildVideoComponent(videoANS)
      expect(videoAppleNewsComponent).toMatchObject(expectedAppleNewsFormat)
    })
  })

  test('buildAppleNewsArticleMetadata returns valid article metadata if website key is not present in config file', () => {
    const website = getWebsitesFromEvent(mockedFirstPublishEvent.body)[0]
    const articleMetadata = buildAppleNewsArticleMetadata(mockedAns, website)

    const metadataProperties = Object.keys(articleMetadata.data)

    for (const property of metadataProperties) {
      expect(validAppleNewsArticleMetadataProps).toContain(property)
    }
  })

  test('buildAppleNewsArticleMetadata returns the expected metadata', () => {
    const ans = mockedAns
    const website = getWebsitesFromEvent(mockedFirstPublishEvent.body)[0]
    const appleNewsConfig = getAppleNewsConfig()
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)
    const primarySection = ans.taxonomy?.primary_section?._id
    const expectedSectionURL =
        appleNewsConfig.websites[website].sections[primarySection].url ||
        appleNewsConfig.websites[website].sections.default.url

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.links).toHaveProperty('sections')
    expect([expectedSectionURL]).toEqual(articleMetadata.data.links.sections)
  })

  test('buildAppleNewsArticleMetadata returns the expected metadata if section overrides global', () => {
    const ans = structuredClone(mockedAns)
    ans.websites['second-example'] = {
      website_section: {
        _website: 'second-example',
        _id: '/amazing-section'
      }
    }
    ans.taxonomy = {
      primary_section: {
        _id: '/amazing-section'
      },
      sections: [
        {
          _website: 'second-example',
          _id: '/amazing-section'
        }
      ]
    }

    const website = 'second-example'
    const appleNewsConfig = getAppleNewsConfig()
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)
    const primarySection = ans.taxonomy?.primary_section?._id
    const expectedSectionURL =
        appleNewsConfig.websites[website].sections[primarySection].url ||
        appleNewsConfig.websites[website].sections.default.url

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.links).toHaveProperty('sections')
    expect([expectedSectionURL]).toEqual(articleMetadata.data.links.sections)
    expect(articleMetadata.data.isPaid).toEqual(true)
  })

  test('buildAppleNewsArticleMetadata can build multiple sections', () => {
    const ans = structuredClone(mockedAns)

    ans.taxonomy.sections = [
      {
        _website: 'example',
        _id: '/example-news'
      },
      {
        _website: 'example',
        _id: '/amazing-section'
      }
    ]
    const website = getWebsitesFromEvent(mockedFirstPublishEvent.body)[0]
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)
    const expectedSections = [
      'https://news-api.apple.com/sections/abc3034f-8b05-4a17-ad17-c1638example',
      'https://news-api.apple.com/sections/1f0a1098-eb04-41cc-af1f-7744bexample'
    ]

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.links).toHaveProperty('sections')
    expect(expectedSections.sort()).toEqual(articleMetadata.data.links.sections.sort())
  })

  test('buildAppleNewsArticleMetadata defaults section if it is configured', () => {
    const ans = Object.assign({}, mockedAns)
    ans.taxonomy = {
      sections: [
        {
          _website: 'example',
          _id: '/non-existing-section'
        }
      ]
    }
    const website = 'example'
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)
    const expectedSections = [
      'https://news-api.apple.com/sections/6e4834ba-e3a3-4d06-93c1-7a8ec54example'
    ]

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.links).toHaveProperty('sections')
    expect(expectedSections).toEqual(articleMetadata.data.links.sections)
  })

  test('buildAppleNewsArticleMetadata should override the metadata if primary section is in the configuration file', () => {
    const ans = Object.assign({}, mockedAns)
    const website = 'example'
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)
    const expectedSections = [
      'https://news-api.apple.com/sections/abc3034f-8b05-4a17-ad17-c1638example'
    ]

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.links).toHaveProperty('sections')
    expect(expectedSections).toEqual(articleMetadata.data.links.sections)
    expect(articleMetadata.data.isHidden).toEqual(true)
  })

  test('buildAppleNewsArticleMetadata sections array is empty if there is no default section', () => {
    const ans = Object.assign({}, mockedAns)
    ans.taxonomy = {
      sections: [
        {
          _website: 'second-example',
          _id: '/non-existing-section'
        }
      ]
    }
    ans.websites['second-example'] = {
      website_section: {
        _website: 'second-example',
        _id: '/non-existing-section'
      }
    }

    const website = 'second-example'
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)
    const expectedSections = []

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.links).toHaveProperty('sections')
    expect(expectedSections).toEqual(articleMetadata.data.links.sections)
  })

  test('buildAppleNewsArticleMetadata return org metadata if primary section not configured but there are other sections', () => {
    const ans = Object.assign({}, mockedAns)
    ans.websites['second-example'] = {
      website_section: {
        _website: 'second-example',
        _id: '/non-existing-section'
      }
    }

    ans.taxonomy = {
      sections: [
        {
          _website: 'second-example',
          _id: '/non-existing-section'
        },
        {
          _website: 'second-example',
          _id: '/example-news'
        }
      ]
    }

    const website = 'second-example'
    const articleMetadata = buildAppleNewsArticleMetadata(ans, website)

    expect(articleMetadata.data).toBeDefined()
    expect(articleMetadata.data).toHaveProperty('links')
    expect(articleMetadata.data.isHidden).toEqual(true)
  })

  describe('buildHTMLComponent', () => {
    test('return null if src ends with undefined', async () => {
      const element = {
        _id: 'JQY6ZBU2RRG5XG433SSUCAS55M',
        type: 'raw_html',
        additional_properties: {
          _id: 'XQPD25TB3JAMHPVTFNMYIDZYEE',
          comments: []
        },
        content: '<iframe src="https://player.vimeo.com/video/123456789/undefined"></iframe>\n'
      }
      const component = await buildHTMLComponent(element)
      expect(component).toBeNull()
    })

    test('transform embedded vimeo videos', async () => {
      const element = {
        _id: 'JQY6ZBU2RRG5XG433SSUCAS55M',
        type: 'raw_html',
        additional_properties: {
          _id: 'XQPD25TB3JAMHPVTFNMYIDZYEE',
          comments: []
        },
        content: '<iframe src="https://player.vimeo.com/video/987654321?h=ab82ae905c&amp;color=ffffff&amp;title=0&amp;byline=0&amp;portrait=0&amp;badge=0" width="640" height="320" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>\n'
      }
      const component = await buildHTMLComponent(element)
      const expectedComponent = {
        role: 'embedvideo',
        URL: 'https://player.vimeo.com/video/987654321',
        layout: 'videoLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })

    test('transform embedded youtube videos', async () => {
      const element = {
        _id: 'FUYXDV3S2ZG4BEXRWBDNYOCBXE',
        type: 'raw_html',
        additional_properties: {
          _id: 'MHXVWYJOH5CU3PJ5FZ5ESGPGXE',
          comments: []
        },
        content: '<!DOCTYPE html>\n<html>\n    <body>\n       <iframe width="560" height="315" src="https://www.youtube.com/embed/abcdefgh-Ex?si=query" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>\n    </body>\n</html>'
      }
      const component = await buildHTMLComponent(element)
      const expectedComponent = {
        role: 'embedvideo',
        URL: 'https://www.youtube.com/embed/abcdefgh-Ex',
        layout: 'videoLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })

    test('transform embedded facebook posts', async () => {
      const element = {
        _id: '3VBMBZG2SZDRZD36UDWV356IQQ',
        type: 'raw_html',
        additional_properties: {
          _id: 'LK4VTHPXYZCGHEM6YEG3UTEUAI',
          comments: []
        },
        content: '<iframe src="https://www.facebook.com/plugins/post.php?href=https%3A%2F%2Fwww.facebook.com%2Fauthor%2Fposts%2Fat0kenValue&amp;show_text=true&amp;width=500" width="500" height="526" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>'
      }
      const component = await buildHTMLComponent(element)
      const expectedComponent = {
        role: 'facebook_post',
        URL: 'https://www.facebook.com/author/posts/at0kenValue',
        layout: 'fbLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })

    test('transform embedded twitter post', async () => {
      const element = {
        _id: 'BCDWRITK55CU7AQHUWLPII6WUA',
        type: 'raw_html',
        additional_properties: {
          _id: '55YZOTWXAJGINDM5YZOSL7IIGE',
          comments: []
        },
        content: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Volutpat blandit aliquam etiam erat.<a href="https://t.co/K4q3eEejFD">https://t.co/K4q3eEejFD</a></p>&mdash;Example news<a href="https://twitter.com/contentauthor/status/321654987?ref_src=twsrc%5Etfw">August 29, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
      }
      const component = await buildHTMLComponent(element)
      const expectedComponent = {
        role: 'tweet',
        URL: 'https://twitter.com/contentauthor/status/321654987?ref_src=twsrc%5Etfw',
        layout: 'twitterLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })

    test('skip if twitter post has an invalid url', async () => {
      const element = {
        _id: 'BCDWRITK55CU7AQHUWLPII6WUA',
        type: 'raw_html',
        additional_properties: {
          _id: '55YZOTWXAJGINDM5YZOSL7IIGE',
          comments: []
        },
        content: '<blockquote class="twitter-tweet"> <a href="https://twitter.com/author/foo/1696364588462129534?ref_src=twsrc%5Etfw">August 29, 2023</a></blockquote>'
      }
      const component = await buildHTMLComponent(element)
      expect(component).toBeNull()
    })

    test('transform embedded instagram post', async () => {
      const element = {
        _id: 'QPF6P7QRUJBF7HUK37SDA3OC2I',
        type: 'raw_html',
        additional_properties: {
          _id: 'OWOFD2ZAKNBUJAUF4MZIVVYHKM',
          comments: []
        },
        content: '<blockquote class="instagram-media" data-instgrm-captioned data-instgrm-permalink="https://www.instagram.com/p/ExAmpleHere/?utm_source=ig_embed&amp;utm_campaign=loading" data-instgrm-version="14" style=" background:#FFF; border:0; border-radius:3px; box-shadow:0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15); margin: 1px; max-width:540px; min-width:326px; padding:0; width:99.375%; width:-webkit-calc(100% - 2px); width:calc(100% - 2px);"><div style="padding:16px;"> <a href="https://www.instagram.com/p/ExAmpleHere/?utm_source=ig_embed&amp;utm_campaign=loading" style=" background:#FFFFFF; line-height:0; padding:0 0; text-align:center; text-decoration:none; width:100%;" target="_blank"> <div style=" display: flex; flex-direction: row; align-items: center;"> <div style="background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 40px; margin-right: 14px; width: 40px;"></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 100px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 60px;"></div></div></div><div style="padding: 19% 0;"></div> <div style="display:block; height:50px; margin:0 auto 12px; width:50px;"><svg width="50px" height="50px" viewBox="0 0 60 60" version="1.1" xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g transform="translate(-511.000000, -20.000000)" fill="#000000"><g><path d="M556.869,30.41 C554.814,30.41 553.148,32.076 553.148,34.131 C553.148,36.186 554.814,37.852 556.869,37.852 C558.924,37.852 560.59,36.186 560.59,34.131 C560.59,32.076 558.924,30.41 556.869,30.41 M541,60.657 C535.114,60.657 530.342,55.887 530.342,50 C530.342,44.114 535.114,39.342 541,39.342 C546.887,39.342 551.658,44.114 551.658,50 C551.658,55.887 546.887,60.657 541,60.657 M541,33.886 C532.1,33.886 524.886,41.1 524.886,50 C524.886,58.899 532.1,66.113 541,66.113 C549.9,66.113 557.115,58.899 557.115,50 C557.115,41.1 549.9,33.886 541,33.886 M565.378,62.101 C565.244,65.022 564.756,66.606 564.346,67.663 C563.803,69.06 563.154,70.057 562.106,71.106 C561.058,72.155 560.06,72.803 558.662,73.347 C557.607,73.757 556.021,74.244 553.102,74.378 C549.944,74.521 548.997,74.552 541,74.552 C533.003,74.552 532.056,74.521 528.898,74.378 C525.979,74.244 524.393,73.757 523.338,73.347 C521.94,72.803 520.942,72.155 519.894,71.106 C518.846,70.057 518.197,69.06 517.654,67.663 C517.244,66.606 516.755,65.022 516.623,62.101 C516.479,58.943 516.448,57.996 516.448,50 C516.448,42.003 516.479,41.056 516.623,37.899 C516.755,34.978 517.244,33.391 517.654,32.338 C518.197,30.938 518.846,29.942 519.894,28.894 C520.942,27.846 521.94,27.196 523.338,26.654 C524.393,26.244 525.979,25.756 528.898,25.623 C532.057,25.479 533.004,25.448 541,25.448 C548.997,25.448 549.943,25.479 553.102,25.623 C556.021,25.756 557.607,26.244 558.662,26.654 C560.06,27.196 561.058,27.846 562.106,28.894 C563.154,29.942 563.803,30.938 564.346,32.338 C564.756,33.391 565.244,34.978 565.378,37.899 C565.522,41.056 565.552,42.003 565.552,50 C565.552,57.996 565.522,58.943 565.378,62.101 M570.82,37.631 C570.674,34.438 570.167,32.258 569.425,30.349 C568.659,28.377 567.633,26.702 565.965,25.035 C564.297,23.368 562.623,22.342 560.652,21.575 C558.743,20.834 556.562,20.326 553.369,20.18 C550.169,20.033 549.148,20 541,20 C532.853,20 531.831,20.033 528.631,20.18 C525.438,20.326 523.257,20.834 521.349,21.575 C519.376,22.342 517.703,23.368 516.035,25.035 C514.368,26.702 513.342,28.377 512.574,30.349 C511.834,32.258 511.326,34.438 511.181,37.631 C511.035,40.831 511,41.851 511,50 C511,58.147 511.035,59.17 511.181,62.369 C511.326,65.562 511.834,67.743 512.574,69.651 C513.342,71.625 514.368,73.296 516.035,74.965 C517.703,76.634 519.376,77.658 521.349,78.425 C523.257,79.167 525.438,79.673 528.631,79.82 C531.831,79.965 532.853,80.001 541,80.001 C549.148,80.001 550.169,79.965 553.369,79.82 C556.562,79.673 558.743,79.167 560.652,78.425 C562.623,77.658 564.297,76.634 565.965,74.965 C567.633,73.296 568.659,71.625 569.425,69.651 C570.167,67.743 570.674,65.562 570.82,62.369 C570.966,59.17 571,58.147 571,50 C571,41.851 570.966,40.831 570.82,37.631"></path></g></g></g></svg></div><div style="padding-top: 8px;"> <div style=" color:#3897f0; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:550; line-height:18px;">Ver esta publicación en Instagram</div></div><div style="padding: 12.5% 0;"></div> <div style="display: flex; flex-direction: row; margin-bottom: 14px; align-items: center;"><div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(0px) translateY(7px);"></div> <div style="background-color: #F4F4F4; height: 12.5px; transform: rotate(-45deg) translateX(3px) translateY(1px); width: 12.5px; flex-grow: 0; margin-right: 14px; margin-left: 2px;"></div> <div style="background-color: #F4F4F4; border-radius: 50%; height: 12.5px; width: 12.5px; transform: translateX(9px) translateY(-18px);"></div></div><div style="margin-left: 8px;"> <div style=" background-color: #F4F4F4; border-radius: 50%; flex-grow: 0; height: 20px; width: 20px;"></div> <div style=" width: 0; height: 0; border-top: 2px solid transparent; border-left: 6px solid #f4f4f4; border-bottom: 2px solid transparent; transform: translateX(16px) translateY(-4px) rotate(30deg)"></div></div><div style="margin-left: auto;"> <div style=" width: 0px; border-top: 8px solid #F4F4F4; border-right: 8px solid transparent; transform: translateY(16px);"></div> <div style=" background-color: #F4F4F4; flex-grow: 0; height: 12px; width: 16px; transform: translateY(-4px);"></div> <div style=" width: 0; height: 0; border-top: 8px solid #F4F4F4; border-left: 8px solid transparent; transform: translateY(-4px) translateX(8px);"></div></div></div> <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; margin-bottom: 24px;"> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; margin-bottom: 6px; width: 224px;"></div> <div style=" background-color: #F4F4F4; border-radius: 4px; flex-grow: 0; height: 14px; width: 144px;"></div></div></a><p style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; line-height:17px; margin-bottom:0; margin-top:8px; overflow:hidden; padding:8px 0 7px; text-align:center; text-overflow:ellipsis; white-space:nowrap;"><a href="https://www.instagram.com/p/ExAmpleHere/?utm_source=ig_embed&amp;utm_campaign=loading" style=" color:#c9c8cd; font-family:Arial,sans-serif; font-size:14px; font-style:normal; font-weight:normal; line-height:17px; text-decoration:none;" target="_blank">Diam quam nulla porttitor massa id.</a></p></div></blockquote> <script async src="//www.instagram.com/embed.js"></script>'
      }
      const component = await buildHTMLComponent(element)
      const expectedComponent = {
        role: 'instagram',
        URL: 'https://www.instagram.com/p/ExAmpleHere/',
        layout: 'instagramLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })

    test('transform embedded image not hosted in Arc', async () => {
      const element = {
        _id: 'X3DSAYTFLFDANIUYKDNBMGNVCM',
        type: 'raw_html',
        additional_properties: {
          _id: 'EH4UYBX6DFAHJPAKCHBHCAZWQY',
          comments: []
        },
        content: '<a href="https://www.example.com" name="A tag">\n    <img src="https://via.placeholder.com/200" alt="Example Image" name="Placeholder">\n</a>\n'
      }
      const component = await buildHTMLComponent(element)
      const expectedComponent = {
        role: 'figure',
        URL: 'https://via.placeholder.com/200',
        layout: 'photoLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })

    test('transform embedded Arc image', async () => {
      getPhoto.mockResolvedValue({ status: 200, message: mockedImageANS })

      const element = {
        _id: 'X3DSAYTFLFDANIUYKDNBMGNVCM',
        type: 'raw_html',
        additional_properties: {
          _id: 'EH4UYBX6DFAHJPAKCHBHCAZWQY',
          comments: []
        },
        content: '<a href="https://www.example.com" name="A tag">\n <img src="https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/ABM6FH6SUJB6RDFRYKYUFVJ424.jpg" alt="Example Image" name="Placeholder">\n</a>\n'
      }
      const component = await buildHTMLComponent(element, 'example')
      const expectedComponent = {
        role: 'figure',
        URL: 'https://example.com/resizer/v2/ABM6FH6SUJB6RDFRYKYUFVJ424.jpg?auth=152af44612ac496e8a606c9796f899700eb2adcc2151d17545b7fe65ExAmPLE',
        layout: 'photoLayout'
      }
      expect(component).toMatchObject(expectedComponent)
    })
  })

  describe('test buildInterstitialLinkComponent', () => {
    test('valid interstitial_link returns html link around expected text', () => {
      const element = {
        _id: 'YRINFWCC6FFALCFTKHROFL37OI',
        type: 'interstitial_link',
        content: 'Example News',
        url: 'https://www.examplenews.com/'
      }
      const interstitialLinkComponent = buildInterstitialLinkComponent(element)
      expect(interstitialLinkComponent).toMatchObject({
        role: 'body',
        layout: 'bodyLayout',
        format: 'html',
        text: '<p><a href="https://www.examplenews.com/">Example News</a></p>'
      })
    })
    test('invalid interstitial_link returns null', () => {
      const element = {
        _id: 'YRINFWCC6FFALCFTKHROFL37OI',
        type: 'interstitial_link',
        content: 'Bad Example',
        url: 'badexample'
      }
      const interstitialLinkComponent = buildInterstitialLinkComponent(element)
      expect(interstitialLinkComponent).toBeNull()
    })
    test('relative interstitial_link returns null', () => {
      const element = {
        _id: 'YRINFWCC6FFALCFTKHROFL37OI',
        type: 'interstitial_link',
        content: 'Bad Example',
        url: '/foo/bar/'
      }
      const interstitialLinkComponent = buildInterstitialLinkComponent(element)
      expect(interstitialLinkComponent).toBeNull()
    })
    test('interstitial_link with empty url returns null', () => {
      const element = {
        _id: 'YRINFWCC6FFALCFTKHROFL37OI',
        type: 'interstitial_link',
        content: 'Bad Example',
        url: ''
      }
      const interstitialLinkComponent = buildInterstitialLinkComponent(element)
      expect(interstitialLinkComponent).toBeNull()
    })
    test('interstitial_link with empty content but ok url returns', () => {
      const element = {
        _id: 'YRINFWCC6FFALCFTKHROFL37OI',
        type: 'interstitial_link',
        content: '',
        url: 'https://example.com/no/text'
      }
      const interstitialLinkComponent = buildInterstitialLinkComponent(element)
      expect(interstitialLinkComponent).toMatchObject({
        role: 'body',
        layout: 'bodyLayout',
        format: 'html',
        text: '<p><a href="https://example.com/no/text"></a></p>'
      })
    })
  })
  describe('test buildOEmbedComponent', () => {
    test('valid youtube oembed_response content_element returns expected oembedComponent', () => {
      const element = {
        type: 'oembed_response',
        subtype: 'youtube',
        _id: 'N3HLZCXLBBDY5DAODR3LUKDK3E',
        raw_oembed: {
          title: 'Nulla aliquet porttitor lacus luctus',
          author_name: 'Arc XP',
          author_url: 'https://www.youtube.com/@author',
          type: 'youtube',
          height: 315,
          width: 560,
          version: '1.0',
          provider_name: 'YouTube',
          provider_url: 'https://www.youtube.com/',
          thumbnail_height: 360,
          thumbnail_width: 480,
          thumbnail_url: 'https://i.ytimg.com/vi/76545321/abcde.jpg',
          html: '<iframe width="560" height="315" src="https://www.youtube.com/embed/abcdefg?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Nulla aliquet porttitor lacus luctus"></iframe>',
          _id: 'https://youtu.be/abcdefg?feature=shared',
          additional_properties: {
            _id: 1694105901830,
            comments: []
          }
        },
        referent: {
          id: 'https://youtu.be/abcdefg?feature=shared',
          provider: 'https://www.youtube.com/oembed?maxwidth=560&maxheight=340&url=',
          referent_properties: {
            additional_properties: {
              _id: 1694105901830,
              comments: []
            }
          },
          service: 'oembed',
          type: 'youtube'
        }
      }
      const oembedComponent = buildOEmbedComponent(element)
      expect(oembedComponent).toMatchObject({
        role: 'embedvideo',
        URL: 'https://youtu.be/abcdefg?feature=shared',
        layout: 'youtubeLayout'
      })
    })
    test('valid twitter oembed_response content_element returns expected oembedComponent', () => {
      const element = {
        type: 'oembed_response',
        subtype: 'twitter',
        _id: '26PEER23BRF2HDYXBNSD2B6AEU',
        raw_oembed: {
          url: 'https://twitter.com/WhatsTesting/status/123789456',
          author_name: "What's Trending",
          author_url: 'https://twitter.com/WhatsTrending',
          html: '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Ipsum dolor sit amet consectetur adipiscing elit ut aliquam<a href="https://twitter.com/SomeValue?ref_src=twsrc%5Etfw">@SomeValue</a><a href="https://twitter.com/hashtag/somevalue?src=hash&amp;ref_src=twsrc%5Etfw">#somevalue</a> <a href="https://t.co/ExAMPlesz">pic.twitter.com/ExAMPlesz</a></p>&mdash; What&#39;s Testing <a href="https://twitter.com/WhatsTesting/status/123789456?ref_src=twsrc%5Etfw">February 26, 2019</a></blockquote>\n<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>\n',
          width: 550,
          height: null,
          type: 'twitter',
          cache_age: '3153600000',
          provider_name: 'Twitter',
          provider_url: 'https://twitter.com',
          version: '1.0',
          _id: 'https://twitter.com/WhatsTesting/status/123789456?s=20',
          additional_properties: {
            _id: 'LZ5GZREXPBBG5EK74CMOVM6KOY',
            comments: []
          }
        },
        referent: {
          id: 'https://twitter.com/WhatsTesting/status/123789456?s=20',
          provider: 'https://publish.twitter.com/oembed?url=',
          referent_properties: {
            additional_properties: {
              _id: 'LZ5GZREXPBBG5EK74CMOVM6KOY',
              comments: []
            }
          },
          service: 'oembed',
          type: 'twitter'
        }
      }
      const oembedComponent = buildOEmbedComponent(element)
      expect(oembedComponent).toMatchObject({
        role: 'tweet',
        URL: 'https://twitter.com/WhatsTesting/status/123789456?s=20',
        layout: 'twitterLayout'
      })
    })
    test('valid facebook oembed_response content_element returns expected oembedComponent', () => {
      const element = {
        type: 'oembed_response',
        subtype: 'facebook',
        _id: 'DB2JRE6QSRHRHFFBV3FS6GXJKI',
        raw_oembed: {
          author_name: 'Washington Post',
          author_url: 'https://www.facebook.com/someauthor',
          provider_url: 'https://www.facebook.com',
          provider_name: 'Facebook',
          html: '<div id="fb-root"></div>\n<script async="1" defer="1" crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&amp;version=v17.0" nonce="YotojYYe"></script><div class="fb-post" data-href="https://www.facebook.com/someauthor/posts/postHashValue" data-width="552"><blockquote cite="https://graph.facebook.com/123456/posts/789654/" class="fb-xfbml-parse-ignore"><p>Lorem ipsum dolor sit amet.</p>Posted by <a href="https://www.facebook.com/someauthor">Some Author</a> on&nbsp;<a href="https://graph.facebook.com/123456/posts/789654/">Thursday, September 7, 2023</a></blockquote></div>',
          type: 'facebook-post',
          version: '1.0',
          width: 552,
          _id: 'https://www.facebook.com/someauthor/posts/postHashValue',
          additional_properties: {
            _id: 1694109922682,
            comments: []
          }
        },
        referent: {
          id: 'https://www.facebook.com/someauthor/posts/postHashValue',
          provider: 'https://www.facebook.com/plugins/post/oembed.json/?url=',
          referent_properties: {
            additional_properties: {
              _id: 1694109922682,
              comments: []
            }
          },
          service: 'oembed',
          type: 'facebook-post'
        }
      }
      const oembedComponent = buildOEmbedComponent(element)
      expect(oembedComponent).toMatchObject({
        role: 'facebook_post',
        URL: 'https://www.facebook.com/someauthor/posts/postHashValue',
        layout: 'fbLayout'
      })
    })
    test('valid facebook-video oembed_response content_element returns expected oembedComponent', () => {
      const element = {
        type: 'oembed_response',
        subtype: 'facebook-video',
        _id: 'F4QPVSA2K5HGBLVSXXIZVEVD5Q',
        raw_oembed: {
          author_name: 'Lorem Ipsum',
          author_url: 'https://www.facebook.com/loremipsum',
          provider_url: 'https://www.facebook.com',
          provider_name: 'Facebook',
          height: 889,
          html: '<div id="fb-root"></div>\n<script async="1" defer="1" crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&amp;version=v17.0" nonce="tRwhSJWC"></script><div class="fb-video" data-href="https://www.facebook.com/Lorem Ipsum/videos/456789"><blockquote cite="https://www.facebook.com/Lorem Ipsum/videos/456789/" class="fb-xfbml-parse-ignore"><a href="https://www.facebook.com/Lorem Ipsum/videos/456789/">Lorem ipsum Posted by <a href="https://www.facebook.com/loremipsum">Lorem Ipsum</a> on Wednesday, August 30, 2023</blockquote></div>',
          type: 'facebook-video',
          version: '1.0',
          width: 500,
          _id: 'https://www.facebook.com/Lorem Ipsum/videos/456789',
          additional_properties: {
            _id: 'Y46Y7JRWKNEZVK25N5GRNKXX6M',
            comments: []
          }
        },
        referent: {
          id: 'https://www.facebook.com/Lorem Ipsum/videos/456789',
          provider: 'https://www.facebook.com/plugins/video/oembed.json/?url=',
          referent_properties: {
            additional_properties: {
              _id: 'Y46Y7JRWKNEZVK25N5GRNKXX6M',
              comments: []
            }
          },
          service: 'oembed',
          type: 'facebook-video'
        }
      }
      const oembedComponent = buildOEmbedComponent(element)
      expect(oembedComponent).toMatchObject({
        role: 'body',
        text: '<a href="https://www.facebook.com/Lorem Ipsum/videos/456789">https://www.facebook.com/Lorem Ipsum/videos/456789</a>',
        format: 'html',
        layout: 'bodyLayout'
      })
    })
    test('valid unsupported oembed_response content_element returns null', () => {
      const element = {
        type: 'oembed_response',
        subtype: 'othertype',
        _id: 'TESTID',
        raw_oembed: {
          url: 'https://other.com/foo/bar'
        },
        referent: {
          id: 'https://other.com/foo/bar',
          provider: 'https://other.com/oembed?url=',
          service: 'oembed',
          type: 'othertype'
        }
      }
      const oembedComponent = buildOEmbedComponent(element)
      expect(oembedComponent).toBeNull()
    })
  })
  describe('test buildGalleryComponent', () => {
    test('gallery with images having caption returns gallery component with items', () => {
      const element = {
        _id: 'TESTGALLERYWITHIMAGES',
        type: 'gallery',
        version: '0.10.9',
        content_elements: [
          {
            _id: 'DBK7T27ADRF2DDUPHKOGETTQ4M',
            auth: {},
            caption: 'Test caption 1',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/DBK7T27ADRF2DDUPHKOGETTQ4M.jpg',
            version: '0.10.9',
            width: 1920
          },
          {
            _id: 'JSVRJAVL6RH4LBG46YV5IVH7C4',
            auth: {},
            caption: 'Test caption 2',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/JSVRJAVL6RH4LBG46YV5IVH7C4.jpg',
            version: '0.10.9'
          },
          {
            _id: '665PGZGXKFHAJAJEM227TN4UXE',
            auth: {},
            caption: 'Test caption 3',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/665PGZGXKFHAJAJEM227TN4UXE.jpg',
            version: '0.10.9',
            width: 730
          },
          {
            _id: 'VLMQ3755WJCGHA47SPG5JJWNMA',
            auth: {},
            caption: 'Test caption 4',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/VLMQ3755WJCGHA47SPG5JJWNMA.jpg',
            version: '0.10.9'
          }
        ]
      }
      const galleryComponent = buildGalleryComponent(element, 'example')
      expect(galleryComponent).toMatchObject({
        role: 'gallery',
        layout: 'galleryLayout',
        items: [
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/DBK7T27ADRF2DDUPHKOGETTQ4M.jpg',
            caption: 'Test caption 1'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/JSVRJAVL6RH4LBG46YV5IVH7C4.jpg',
            caption: 'Test caption 2'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/665PGZGXKFHAJAJEM227TN4UXE.jpg',
            caption: 'Test caption 3'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/VLMQ3755WJCGHA47SPG5JJWNMA.jpg',
            caption: 'Test caption 4'
          }
        ]
      })
    })
    test('gallery with images having subtitle returns gallery component with items', () => {
      const element = {
        _id: 'TESTGALLERYWITHIMAGES',
        type: 'gallery',
        version: '0.10.9',
        content_elements: [
          {
            _id: 'DBK7T27ADRF2DDUPHKOGETTQ4M',
            auth: {},
            subtitle: 'Test subtitle 1',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/DBK7T27ADRF2DDUPHKOGETTQ4M.jpg',
            version: '0.10.9'
          },
          {
            _id: 'JSVRJAVL6RH4LBG46YV5IVH7C4',
            auth: {},
            subtitle: 'Test subtitle 2',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/JSVRJAVL6RH4LBG46YV5IVH7C4.jpg',
            version: '0.10.9'
          },
          {
            _id: '665PGZGXKFHAJAJEM227TN4UXE',
            auth: {},
            subtitle: 'Test subtitle 3',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/665PGZGXKFHAJAJEM227TN4UXE.jpg',
            version: '0.10.9'
          },
          {
            _id: 'VLMQ3755WJCGHA47SPG5JJWNMA',
            auth: {},
            subtitle: 'Test subtitle 4',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/VLMQ3755WJCGHA47SPG5JJWNMA.jpg',
            version: '0.10.9'
          }
        ]
      }
      const galleryComponent = buildGalleryComponent(element, 'example')
      expect(galleryComponent).toMatchObject({
        role: 'gallery',
        layout: 'galleryLayout',
        items: [
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/DBK7T27ADRF2DDUPHKOGETTQ4M.jpg',
            caption: 'Test subtitle 1'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/JSVRJAVL6RH4LBG46YV5IVH7C4.jpg',
            caption: 'Test subtitle 2'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/665PGZGXKFHAJAJEM227TN4UXE.jpg',
            caption: 'Test subtitle 3'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/VLMQ3755WJCGHA47SPG5JJWNMA.jpg',
            caption: 'Test subtitle 4'
          }
        ]
      })
    })
    test('gallery with images having mix of caption, subtitle and neither returns gallery component with items', () => {
      const element = {
        _id: 'TESTGALLERYWITHIMAGES',
        type: 'gallery',
        version: '0.10.9',
        content_elements: [
          {
            _id: 'DBK7T27ADRF2DDUPHKOGETTQ4M',
            auth: {},
            caption: 'Test caption 1',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/DBK7T27ADRF2DDUPHKOGETTQ4M.jpg',
            version: '0.10.9'
          },
          {
            _id: 'JSVRJAVL6RH4LBG46YV5IVH7C4',
            auth: {},
            subtitle: 'Test subtitle 2',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/JSVRJAVL6RH4LBG46YV5IVH7C4.jpg',
            version: '0.10.9'
          },
          {
            _id: '665PGZGXKFHAJAJEM227TN4UXE',
            auth: {},
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/665PGZGXKFHAJAJEM227TN4UXE.jpg',
            version: '0.10.9'
          },
          {
            _id: 'VLMQ3755WJCGHA47SPG5JJWNMA',
            auth: {},
            caption: 'Test caption 4',
            type: 'image',
            url: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/VLMQ3755WJCGHA47SPG5JJWNMA.jpg',
            version: '0.10.9'
          }
        ]
      }
      const galleryComponent = buildGalleryComponent(element, 'example')
      expect(galleryComponent).toMatchObject({
        role: 'gallery',
        layout: 'galleryLayout',
        items: [
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/DBK7T27ADRF2DDUPHKOGETTQ4M.jpg',
            caption: 'Test caption 1'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/JSVRJAVL6RH4LBG46YV5IVH7C4.jpg',
            caption: 'Test subtitle 2'
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/665PGZGXKFHAJAJEM227TN4UXE.jpg',
            caption: ''
          },
          {
            URL: 'https://cloudfront-us-east-1-staging.images.arcpublishing.com/sandbox.exampleorgid/VLMQ3755WJCGHA47SPG5JJWNMA.jpg',
            caption: 'Test caption 4'
          }
        ]
      })
    })
    test('gallery with empty content_elements returns null', () => {
      const element = {
        _id: 'TESTEMPTYGALLERY',
        type: 'gallery',
        version: '0.10.9',
        content_elements: []
      }
      const galleryComponent = buildGalleryComponent(element, 'example')
      expect(galleryComponent).toBeNull()
    })
    test('gallery with missing content_elements returns null', () => {
      const element = {
        _id: 'TESTEMPTYGALLERY',
        type: 'gallery',
        version: '0.10.9'
      }
      const galleryComponent = buildGalleryComponent(element, 'example')
      expect(galleryComponent).toBeNull()
    })
  })
  describe('test buildTableComponent', () => {
    test('table with only rows produces null', () => {
      const element = {
        _id: 'JNKWD2DHMFAH3JUP65ENN25DAA',
        type: 'table',
        header: [],
        rows: [
          [
            {
              _id: 'VKR4F4S6SFHO7H7SZWX4ZCQ4EE',
              content: 'Ice Cream',
              type: 'text'
            },
            {
              _id: '7VZP444LHJBF3LM6C6NV4IVOIQ',
              content: '1 cups',
              type: 'text'
            }
          ],
          [
            {
              _id: 'H72YYX7625CB3LWEP2K4DA5RF4',
              content: 'Blueberries',
              type: 'text'
            },
            {
              _id: 'BR63R7GPMZC6FMBVT4NFNZAQPA',
              content: '2 cups',
              type: 'text'
            }
          ],
          [
            {
              _id: 'JPG3NH66QVEDRCYEYEKDZWSJV4',
              content: 'Banana',
              type: 'text'
            },
            {
              _id: 'IUFARSHKVNENRKSVJDAJCFQU6I',
              content: '1 small',
              type: 'text'
            }
          ],
          [
            {
              _id: 'ZMFHKBZPF5BBVND6CIT5SNHIO4',
              content: 'Cacao Powder',
              type: 'text'
            },
            {
              _id: '7BZMDW7BSBFTPIE3REE3HMUBSA',
              content: '2 tablespoons',
              type: 'text'
            }
          ]
        ]
      }
      const tableComponent = buildTableComponent(element)
      expect(tableComponent).toBeNull()
    })
    test('table with header and rows produces component with html table with header and rows', () => {
      const element = {
        _id: 'WJZLVVKI6NBFHCJA4UA72FNJFE',
        type: 'table',
        header: [
          {
            _id: '4ZPS3UCG7ZHQJIGLC5PVPPNUTU',
            content: 'ID',
            type: 'text'
          },
          {
            _id: 'SOQJVAEPXJDYHANOF3TSVEYY4I',
            content: 'Name',
            type: 'text'
          },
          {
            _id: 'OQDGGIN63FFKJL5RAALGFBA4OI',
            content: 'Company',
            type: 'text'
          },
          {
            _id: 'WE6IAJAB7VHDHK65S273HHZ2NA',
            content: 'Country',
            type: 'text'
          }
        ],
        rows: [
          [
            {
              _id: '2XKUWZOLVJBUTNMCOMWOGPGSMI',
              content: 'ABC123',
              type: 'text'
            },
            {
              _id: '3VNZBNPA4BF6JL4FYYOTR347SQ',
              content: 'Jane Doe',
              type: 'text'
            },
            {
              _id: 'XMWWKV6NK5BRHPWTYOOHJCNDFM',
              content: 'ACME',
              type: 'text'
            },
            {
              _id: '2UF2EUXEVRAZZEWU3P2ESOZ4UQ',
              content: 'United States',
              type: 'text'
            }
          ],
          [
            {
              _id: 'BKFF4BZDHJFYDMUNIPLFBD43WQ',
              content: 'DEF345',
              type: 'text'
            },
            {
              _id: 'YK7P62IL5NAZVC5G6ZF5V6LR2I',
              content: 'James Smith',
              type: 'text'
            },
            {
              _id: 'ZKTDALBLQNAGVD3UUI7RR6DFU4',
              content: 'Kilts4Kats',
              type: 'text'
            },
            {
              _id: '5SMSEAXTCFGV7A7PVU4SLE2CUM',
              content: 'Ireland',
              type: 'text'
            }
          ],
          [
            {
              _id: '5RSZ6XYVUVBPXJPKBIZFLSQD2U',
              content: 'GHI678',
              type: 'text'
            },
            {
              _id: 'ZQIA5DUKVJCCZANFHLM2VNRUL4',
              content: 'Robert Rogers',
              type: 'text'
            },
            {
              _id: 'F2B3QR3H5NA47G23LCMYSRMRYE',
              content: 'Random Stuff',
              type: 'text'
            },
            {
              _id: 'MUCUS6BK4FHM3J6FHFGBMR5LRY',
              content: 'Canada',
              type: 'text'
            }
          ]
        ]
      }
      const tableComponent = buildTableComponent(element)
      expect(tableComponent).toMatchObject({
        role: 'htmltable',
        html: '<table><thead><th>ID</th><th>Name</th><th>Company</th><th>Country</th></thead>' +
          '<tbody><tr><td>ABC123</td><td>Jane Doe</td><td>ACME</td><td>United States</td></tr>' +
          '<tr><td>DEF345</td><td>James Smith</td><td>Kilts4Kats</td><td>Ireland</td></tr>' +
          '<tr><td>GHI678</td><td>Robert Rogers</td><td>Random Stuff</td><td>Canada</td></tr></tbody></table>'
      })
    })
    test('table with header only produces null', () => {
      const element = {
        _id: '5MKQCQXTOFGQNGQOJSFAFI55FU',
        type: 'table',
        header: [
          {
            _id: 'B4L5BYC74FEA7B4RGTFFT6DWYM',
            content: 'Data',
            type: 'text'
          },
          {
            _id: 'AKEKIMBUUJEMVNFBVVPNBPR7F4',
            content: 'To',
            type: 'text'
          },
          {
            _id: 'BCKKWWNLQBBS5HHQ343TKJ77X4',
            content: 'Get',
            type: 'text'
          },
          {
            _id: '7XABRWM2QJGM3NFLRCNXKVF2NI',
            content: 'Later',
            type: 'text'
          }
        ],
        rows: []
      }
      const tableComponent = buildTableComponent(element)
      expect(tableComponent).toBeNull()
    })
  })
  describe('test buildQuoteComponent', () => {
    test('if subtype blockquote then component role quote', () => {
      const element = {
        _id: '7TPHWBMFPFHFRKJNSTKR6XXXK4',
        type: 'quote',
        content_elements: [
          {
            _id: 'Z23OXWSZWVDHXDWLRMRXR3APSY',
            content: 'That’s one small step for a man, one giant leap for mankind.',
            type: 'text'
          }
        ],
        subtype: 'blockquote'
      }
      const quoteComponent = buildQuoteComponent(element)
      expect(quoteComponent).toMatchObject({
        role: 'quote',
        text: '<p>That’s one small step for a man, one giant leap for mankind.</p>',
        format: 'html'
      })
    })
    test('if subtype pullquote then component role pullquote', () => {
      const element = {
        _id: 'GCMARLYQ3VA6DDLHNFPFSNDLBI',
        type: 'quote',
        content_elements: [
          {
            _id: 'BY7RKX5ZDJESLIF5SO6E55MF3Y',
            content: 'The way to get started is to quit talking and begin doing.',
            type: 'text'
          }
        ],
        subtype: 'pullquote'
      }
      const quoteComponent = buildQuoteComponent(element)
      expect(quoteComponent).toMatchObject({
        role: 'pullquote',
        text: '<p>The way to get started is to quit talking and begin doing.</p>',
        format: 'html'
      })
    })
    test('multiple content_elements in a quote all are present in component html inlcuding headings', () => {
      const element = {
        _id: 'HOAGCQKHNRBEZDQBNFYJUXJVJ4',
        type: 'quote',
        content_elements: [
          {
            _id: 'LU2OP23GYRCA3HTV5RA4B7EB34',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            content: 'Heading in quote',
            level: 1,
            type: 'header'
          },
          {
            _id: '6AIRU4SKRFEHPGLHTW4EQW2CUQ',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            content: 'The greatest wealth is to live content with little.',
            type: 'text'
          },
          {
            _id: 'ML7JH46FLNGXLJFCSMCFBXP67I',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            content: 'Nothing taught by force stays in the soul.',
            type: 'text'
          },
          {
            _id: 'QLCWISDGCNE75KW764LJHSFFMQ',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            content: 'Reality is created in the mind.  We can change our reality by changing our mind.',
            type: 'text'
          }
        ],
        citation: {
          content: 'Plato',
          type: 'text'
        },
        subtype: 'blockquote',
        additional_properties: {
          _id: 'LQN5AXGQSJB4LELFMI6ITZB4BY',
          comments: []
        }
      }
      const quoteComponent = buildQuoteComponent(element)
      expect(quoteComponent).toMatchObject({
        role: 'quote',
        text: '<h1>Heading in quote</h1>' +
          '<p>The greatest wealth is to live content with little.</p>' +
          '<p>Nothing taught by force stays in the soul.</p>' +
          '<p>Reality is created in the mind.  We can change our reality by changing our mind.</p>',
        format: 'html'
      })
    })
    test('any level heading in a quote component includes headings at same level', () => {
      const element = {
        _id: 'HOAGCQKHNRBEZDQBNFYJUXJVJ4',
        type: 'quote',
        content_elements: [
          {
            _id: 'LU2OP23GYRCA3HTV5RA4B7EB34',
            content: 'Heading level 1',
            level: 1,
            type: 'header'
          },
          {
            _id: 'LU2OP23GYRCA3HTV5RA4B7EB34',
            content: 'Heading level 2',
            level: 2,
            type: 'header'
          },
          {
            _id: 'LU2OP23GYRCA3HTV5RA4B7EB34',
            content: 'Heading level 3',
            level: 3,
            type: 'header'
          },
          {
            _id: 'LU2OP23GYRCA3HTV5RA4B7EB34',
            content: 'Heading level 4',
            level: 4,
            type: 'header'
          }
        ],
        subtype: 'blockquote'
      }
      const quoteComponent = buildQuoteComponent(element)
      expect(quoteComponent).toMatchObject({
        role: 'quote',
        text: '<h1>Heading level 1</h1>' +
          '<h2>Heading level 2</h2>' +
          '<h3>Heading level 3</h3>' +
          '<h4>Heading level 4</h4>',
        format: 'html'
      })
    })
  })
})
