const { getAppleNewsConfig, getWebsiteBaseURL } = require('../../src/utils/configHelpers')

describe('configHelpers', () => {
  test('getAppleNewsConfig returns expected config object', () => {
    let appleNewsTestConfig = getAppleNewsConfig()
    expect(appleNewsTestConfig.websites).toHaveProperty('second-example')

    process.env.NODE_ENV = 'development'
    appleNewsTestConfig = getAppleNewsConfig()
    expect(appleNewsTestConfig).toBeDefined()
  })

  test('getWebsiteBaseURL should return the expected base url for a given website', () => {
    const baseUrl = getWebsiteBaseURL('example')

    expect(baseUrl).toEqual(process.env.EXAMPLE_BASE_URL)
  })
})
