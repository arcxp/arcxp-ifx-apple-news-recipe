const { concatenateAuthors, constructArcResizerURL, getLargestStreamURL, convertListToHTML, convertImageToANSFromURL } = require('../../src/utils/ansHelpers')
const { getPhoto } = require('../../src/services/photoAPI')
const { mockedImageANS } = require('../mocks')

jest.mock('../../src/services/photoAPI', () => ({
  getPhoto: jest.fn()
}))

describe('ansHelpers', () => {
  describe('concatenateAuthors', () => {
    test('concatenateAuthors should concatenate multiple authors in credits into a single string', () => {
      const creditsArray = [
        {
          name: 'John Doe',
          type: 'author'
        },
        {
          name: 'Jane Doe',
          type: 'author'
        }
      ]

      const expectedAuthorString = 'John Doe Jane Doe'
      expect(concatenateAuthors(creditsArray, ' ')).toBe(expectedAuthorString)
    })

    test('concatenateAuthors should return "Unknown" if creditsArray is undefined', () => {
      const creditsArray = undefined

      const expectedAuthorString = 'Unknown'
      expect(concatenateAuthors(creditsArray, ' ')).toBe(expectedAuthorString)
    })

    test('concatenateAuthors should return "Unknown" if creditsArray is empty', () => {
      const creditsArray = []

      const expectedAuthorString = 'Unknown'
      expect(concatenateAuthors(creditsArray, ' ')).toBe(expectedAuthorString)
    })
  })

  describe('constructArcResizerURL', () => {
    test('constructArcResizerURL should convert image URL into resizer URL if resizer token exists', () => {
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

      const expectedResizerURL = 'https://example.com/resizer/v2/SOMEUNIQUEIDENTIFIER.jpg?auth=s0m3Auth3t1cati0nT0k3n'
      expect(constructArcResizerURL(imageANS, 'example')).toBe(expectedResizerURL)
    })
  })

  test('constructArcResizerURL should return full size cloudfront URL if resizer token does NOT exist', () => {
    const imageANS = {
      _id: 'SOMEUNIQUEIDENTIFIER',
      caption: 'A descriptive caption for the image',
      created_date: '2023-06-06T20:20:20Z',
      height: 2000,
      last_updated_date: '2023-06-28T20:30:51Z',
      type: 'image',
      url: 'https://cloudfront-us-east-1.images.arcpublishing.com/sandbox.someorg/SOMEUNIQUEIDENTIFIER.jpg',
      version: '0.10.9',
      width: 3000
    }

    const expectedCloudfrontURL = 'https://cloudfront-us-east-1.images.arcpublishing.com/sandbox.someorg/SOMEUNIQUEIDENTIFIER.jpg'
    expect(constructArcResizerURL(imageANS, 'example')).toBe(expectedCloudfrontURL)
  })

  describe('getLargestStreamURL', () => {
    test('getLargestStreamURL should retrieve the largest stream URL of "ts" stream types', () => {
      const streams = [
        {
          bitrate: 580,
          filesize: 1489336,
          height: 360,
          provider: 'mediaconvert',
          stream_type: 'ts',
          url: 'https://dym4aochb43cn.cloudfront.net/someorg/20230427/644adc53a25e305b08a039e7/t_544cd085da2c4ddbb37068398db48111_resource_name/mobile.m3u8',
          width: 480
        },
        {
          bitrate: 910,
          filesize: 2115376,
          height: 480,
          provider: 'mediaconvert',
          stream_type: 'ts',
          url: 'https://dym4aochb43cn.cloudfront.net/someorg/20230427/644adc53a25e305b08a039e7/t_544cd085da2c4ddbb37068398db48111_resource_name/mobile.m3u8',
          width: 640
        },
        {
          bitrate: 1600,
          filesize: 3436452,
          height: 540,
          provider: 'mediaconvert',
          stream_type: 'ts',
          url: 'https://dym4aochb43cn.cloudfront.net/someorg/20230427/644adc53a25e305b08a039e7/t_544cd085da2c4ddbb37068398db48111_resource_name/sd.m3u8',
          width: 720
        },
        {
          bitrate: 3000,
          filesize: 6143464,
          height: 720,
          provider: 'mediaconvert',
          stream_type: 'ts',
          url: 'https://dym4aochb43cn.cloudfront.net/someorg/20230427/644adc53a25e305b08a039e7/t_544cd085da2c4ddbb37068398db48111_resource_name/hd.m3u8',
          width: 960
        },
        {
          bitrate: 1600,
          filesize: 9999999,
          height: 540,
          provider: 'mediaconvert',
          stream_type: 'mp4',
          url: 'https://dym4aochb43cn.cloudfront.net/someorg/20230427/644adc53a25e305b08a039e7/t_544cd085da2c4ddbb37068398db48111_resource_name/file_960x540-1600-v4.mp4',
          width: 720
        }
      ]

      const expectedStreamURL = 'https://dym4aochb43cn.cloudfront.net/someorg/20230427/644adc53a25e305b08a039e7/t_544cd085da2c4ddbb37068398db48111_resource_name/hd.m3u8'

      expect(getLargestStreamURL(streams)).toBe(expectedStreamURL)
    })
  })

  describe('convertListToHTML', () => {
    test('convertListToHTML should convert a simple unordered list from ANS to HTML', () => {
      const listElementANS = {
        _id: 'DQFDJDA5EZCIVNYC3MF5URGZRA',
        additional_properties: {
          comments: [],
          inline_comments: []
        },
        items: [
          {
            _id: '62LKNCFFNNGZTMXL74STQ372TU',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 1',
            type: 'text'
          },
          {
            _id: '7MJVBR4UQJCE5BMVSEZZH2POGI',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 2',
            type: 'text'
          },
          {
            _id: 'ILMZSWZCY5CFNGNDFGV76X2GDY',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 3',
            type: 'text'
          }
        ],
        list_type: 'unordered',
        type: 'list'
      }

      const expectedHTMLOutput = '<ul><li>List item 1</li><li>List item 2</li><li>List item 3</li></ul>'

      expect(convertListToHTML(listElementANS.list_type, listElementANS.items)).toBe(expectedHTMLOutput)
    })

    test('convertListToHTML should convert a simple ordered list from ANS to HTML', () => {
      const listElementANS = {
        _id: 'DQFDJDA5EZCIVNYC3MF5URGZRA',
        additional_properties: {
          comments: [],
          inline_comments: []
        },
        items: [
          {
            _id: '62LKNCFFNNGZTMXL74STQ372TU',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 1',
            type: 'text'
          },
          {
            _id: '7MJVBR4UQJCE5BMVSEZZH2POGI',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 2',
            type: 'text'
          },
          {
            _id: 'ILMZSWZCY5CFNGNDFGV76X2GDY',
            additional_properties: {
              comments: [],
              inline_comments: []
            },
            block_properties: {},
            content: 'List item 3',
            type: 'text'
          }
        ],
        list_type: 'ordered',
        type: 'list'
      }

      const expectedHTMLOutput = '<ol><li>List item 1</li><li>List item 2</li><li>List item 3</li></ol>'

      expect(convertListToHTML(listElementANS.list_type, listElementANS.items)).toBe(expectedHTMLOutput)
    })

    test('convertListToHTML should convert a single list type nested list from ANS to HTML', () => {
      const listElementANS = {
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

      const expectedHTMLOutput = '<ul><li>List item 1</li><li>List item 2</li><ul><li>Nested list item 1</li><li>Nested list item 2</li><ul><li>More nested list item 1</li><li>More nested list item 2</li><ul><li>Even more nested item 1</li></ul></ul></ul></ul>'

      expect(convertListToHTML(listElementANS.list_type, listElementANS.items)).toBe(expectedHTMLOutput)
    })

    test('convertListToHTML should convert a multiple list type nested list from ANS to HTML', () => {
      const listElementANS = {
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
                list_type: 'ordered',
                type: 'list'
              }
            ],
            list_type: 'unordered',
            type: 'list'
          }
        ],
        list_type: 'ordered',
        type: 'list'
      }

      const expectedHTMLOutput = '<ol><li>List item 1</li><li>List item 2</li><ul><li>Nested list item 1</li><li>Nested list item 2</li><ol><li>More nested list item 1</li><li>More nested list item 2</li><ul><li>Even more nested item 1</li></ul></ol></ul></ol>'

      expect(convertListToHTML(listElementANS.list_type, listElementANS.items)).toBe(expectedHTMLOutput)
    })
  })

  describe('convertImageToANSFromURL', () => {
    test('convertImageToANSFromURL should return full ANS object on successful Photo API request', async () => {
      getPhoto.mockResolvedValue({ status: 200, message: mockedImageANS })

      const inputURL = 'https://cloudfront-us-east-1-env.images.arcpublishing.com/sandbox.someorg/ABM6FH6SUJB6RDFRYKYUFVJ686.jpg'
      const resultImageANS = await convertImageToANSFromURL(inputURL)

      expect(resultImageANS).toEqual(mockedImageANS)
    })

    test('convertImageToANSFromURL should return partial ANS object on failed Photo API request', async () => {
      getPhoto.mockResolvedValue({ status: 404, message: 'Not Found' })

      const inputURL = 'https://cloudfront-us-east-1-env.images.arcpublishing.com/sandbox.someorg/ABM6FH6SUJB6RDFRYKYUFVJ686.jpg'
      const expectedImageANS = {
        url: inputURL,
        _id: 'ABM6FH6SUJB6RDFRYKYUFVJ686'
      }
      const resultImageANS = await convertImageToANSFromURL(inputURL)
      expect(resultImageANS).toEqual(expectedImageANS)
    })
  })
})
