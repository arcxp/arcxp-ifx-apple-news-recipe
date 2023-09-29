const { pino } = require('pino')

const namedLogger = (name) => {
  const pinoOptions = {
    name,
    enabled: true,
    messageKey: 'message',
    level: 'info',
    timestamp: false
  }
  if (typeof process.env.LOG_LEVEL === 'string') {
    if (process.env.LOG_LEVEL.toLowerCase() === 'disabled') {
      pinoOptions.enabled = false
    }
    pinoOptions.level = process.env.LOG_LEVEL.toLowerCase()
  }
  pinoOptions.formatters = {
    level (label) {
      return { level: label }
    },
    bindings () {
      return { loggerName: name }
    }
  }
  const namedLogger = pino(pinoOptions)
  return namedLogger
}

module.exports = { namedLogger }
