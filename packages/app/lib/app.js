'use strict'
const Koa = require('koa')
const mount = require('koa-mount')
const Logger = require('./logger')
const Middlewares = require('./middlewares')
const LogFormatter = require('./logFormatter')
const logSkipper = require('./logSkipper')
const _ = require('lodash')
const ResourceFactory = require('@super-phoenix/resource-factory')
let _resources = null

function create (params = {}) {
  const app = new Koa()
  _resources = ResourceFactory.create(params.resources)
  console.log('_resources', _resources, _resources.get('db'))
  // Set the default base path to empty string if not provided
  params.basePath = params.basePath || ''

  // Setup common error handling middleware
  Logger.info('Configuring common error handling middleware')
  // app.use(Middlewares.errorHandler)

  app.use(Middlewares.errorHandler)

  // Set request start time
  Logger.info('Configuring request start time middleware')
  app.use(Middlewares.requestStartTime)

  // Set request id
  Logger.info('Configuring request id middleware')
  app.use(Middlewares.requestId)

  // Set helmet
  Logger.info('Configuring helmet middleware')
  app.use(Middlewares.helmet(params.hemletOptions || {}))

  // set compress
  Logger.info('Configuring compress middleware')
  app.use(Middlewares.compress(params.compressOptions || { threshold: 2048 }))

  // set cors
  Logger.info('Configuring CORS middleware')
  app.use(Middlewares.cors(params.corsOptions || { maxAge: 86400 }))

  // set logging
  Logger.info('Configuring logging middleware')
  app.use(Middlewares.requestLogger(LogFormatter.extended, params.loggingOptions || { skip: logSkipper }))

  // set health check
  Logger.info('Configuring healthcheck middleware')
  app.use(Middlewares.healthCheck(params))

  // set version
  Logger.info('Configuring version middleware')
  app.use(Middlewares.version(params))

  // set authentication
  Logger.info('Configuring authentication middleware')
  app.use(Middlewares.authenticate(params).unless({ path: params.unprotectedPaths || [] }))

  // set tenant resolution
  Logger.info('Configuring tenant resolution middleware')
  app.use(Middlewares.resolveTenantDB(params))

  // set authorization
  Logger.info('Configuring authorization middleware')
  if (_.has(params, 'handlers.authorize')) {
    app.use(Middlewares.authorize(params))
  }

  // set endPoints
  if (params.endPoints) {
    Logger.info('Configuring endpoints')
    params.endPoints.forEach((endPoint) => {
      const ep = new Koa()
      ep.use(endPoint.service)
      app.use(mount(`${params.basePath}/${endPoint.location}`, ep))
    })
  }

  // set audits
  if (params.audit) {
    Logger.info('Configuring audit middleware')
    app.use(Middlewares.audit(params))
  }

  // Error handler
  app.on('error', (error, ctx) => {
    if (_.has(params, 'handlers.error')) {
      params.handlers.error(error, ctx)
    }
    Logger.error(error)
  })

  return app
}

function resources () {
  return _resources
}

module.exports = {
  create,
  resources
}
