'use strict'
const _ = require('lodash')
const jwtDecode = require('jwt-decode')

// Parse the JWT to extract tenant and login
function parseJWT (headers) {
  const jwt = _.get(headers, 'authorization', '').split(' ')[1] || ''
  let tenant = 'unknown-tenant'
  let login = 'unknown-login'
  if (jwt && jwt.length > 0) {
    try {
      const parsedJwt = jwtDecode(jwt)
      tenant = parsedJwt.tenant
      login = parsedJwt.login
    } catch (error) {
      console.log('JWT parsing error')
    }
  }
  return { tenant, login }
}

// extends the combined log format
// :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"
function extended (tokens, req, res) {
  const parsedJWT = parseJWT(req.headers)
  const role = req.headers['x-role'] || 'unknown-role'
  return [
    tokens['remote-addr'](req, res),
    '-',
    tokens['remote-user'](req, res) || '-',
    '[' + tokens.date(req, res, 'clf') + ']',
    '"' + tokens.method(req, res),
    tokens.url(req, res),
    'HTTP/' + tokens['http-version'](req, res) + '"',
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms',
    tokens.referrer(req, res) || '-',
    '"' + tokens['user-agent'](req, res) + '"',
    parsedJWT.tenant,
    parsedJWT.login,
    role
  ].join(' ')
}

module.exports = {
  extended
}
