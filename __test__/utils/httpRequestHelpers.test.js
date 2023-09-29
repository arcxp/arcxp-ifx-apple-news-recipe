const { isResponseStatusOk } = require('../../src/utils/httpRequestHelpers')

describe('httpRequestHelpers', () => {
  test('isResponseStatusOk returns true if response code is Ok', () => {
    expect(isResponseStatusOk(200)).toBe(true)
  })

  test('isResponseStatusOk returns false if response code is error', () => {
    expect(isResponseStatusOk(500)).toBe(false)
  })
})
