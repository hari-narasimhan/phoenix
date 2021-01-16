'use strict'
const LOGGING_ENABLED = process.env.ENABLE_LOGGING === 'true'

const log = (level = 'info', ...params) => {
  const canLog = LOGGING_ENABLED || level === 'error' || level === 'warn' || level === 'debug'
  const fn = console[level] || console.log
  if (canLog) {
    fn(level.toUpperCase(), ...params)
    return true
  }
}

const warn = (...params) => log('warn', ...params)
const error = (...params) => log('error', ...params)
const info = (...params) => log('info', ...params)
const debug = (...params) => log('debug', ...params)
const runtimeError = (message, ...params) => {
  return log('error', JSON.stringify(message), ...params)
}

module.exports = {
  debug,
  error,
  info,
  log,
  runtimeError,
  warn
}
