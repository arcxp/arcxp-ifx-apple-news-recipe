const { pino } = require('pino')
const { namedLogger } = require('../../src/utils/namedLogger')

jest.mock('pino')

describe('getNamedLogger utility', () => {
  beforeEach(() => {
    pino.mockReset()
  })
  it('should instantiate a pino logger appropriately', () => {
    process.env.LOG_LEVEL = 'DEBUG'
    namedLogger('TEST')
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
        name: 'TEST'
      })
    )
  })
  it('should respect LOG_LEVEL env var', () => {
    process.env.LOG_LEVEL = 'INFO'
    namedLogger('test logger utility')
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        name: 'test logger utility'
      })
    )
  })
  it('should disable the logger when LOG_LEVEL env var set to disabled', () => {
    process.env.LOG_LEVEL = 'DISABLED'
    namedLogger('TEST')
    expect(pino).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        level: 'disabled',
        name: 'TEST'
      })
    )
  })
  it('should include formatters', () => {
    process.env.LOG_LEVEL = 'INFO'
    namedLogger('TEST')
    expect(pino.mock.lastCall[0].formatters).toEqual(
      expect.objectContaining({
        level: expect.any(Function),
        bindings: expect.any(Function)
      })
    )
    expect(pino.mock.lastCall[0].formatters.level('info', 1)).toMatchObject({ level: 'info' })
    expect(pino.mock.lastCall[0].formatters.bindings()).toMatchObject({ loggerName: 'TEST' })
  })
})
