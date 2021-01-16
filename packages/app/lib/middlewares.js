'use strict'
const _ = require('lodash')
const { v4: uuidv4 } = require('uuid')
const compress = require('koa-compress')
const cors = require('@koa/cors')
const helmet = require('koa-helmet')
const jwt = require('jsonwebtoken')
const Logger = require('./logger')
const morgan = require('koa-morgan')
const to = require('await-to-js').default
const unless = require('koa-unless')

const ERROR_PERFORMING_HEALTH_CHECK = { message: 'Error occurred while performing health check', statusCode: 400 }
const ERROR_INVALID_TOKEN = { message: 'Invalid api token, please verify authenticity', statusCode: 401 }
const ERROR_INVALID_JWT = { message: 'Invalid jwt token, please verify authenticity', statusCode: 401 }
const ERROR_INVALID_TENANT_RESOLVER = { message: 'Tenant resolver is not a function', statusCode: 500 }

const healthCheckFn = async () => ({ statusCode: 200, message: 'All is well!' })
const versionFn = (params) => _.get(params, 'version', { version: '0.0.1' })

/**
 * Audit middleware
 * @param {*} params
 */
const audit = (params) => {
  return async (ctx, next) => {
    const fn = params.audit || _.identity
    await fn(ctx)
    await next()
  }
}

/**
 * authentication middleware
 * @param {*} params
 */
const authenticate = (params) => {
  const middleware = async (ctx, next) => {
    const authHeader = ctx.request.headers.authorization || ''
    const token = ctx.query.token
    const key = params.stateKey || 'user'
    let role = ctx.request.headers['x-role'] || ''
    let jwtToken = authHeader ? authHeader.split(' ')[1] : null

    if (authHeader && token) {
      Logger.warn('Authentication conflict, both token and auth header found, using auth header')
    } else if (token) {
      const [tokenResolverError, resolvedToken] = await to(params.resolvers.token(token))
      if (tokenResolverError) {
        ctx.status = ERROR_INVALID_TOKEN.statusCode
        ctx.body = ERROR_INVALID_TOKEN.message
        return
      }
      jwtToken = resolvedToken.token
      role = resolvedToken.role
    }

    // validate the jwt token
    try {
      const decoded = jwt.verify(jwtToken, params.secret)
      ctx.state[key] = decoded
      ctx.state[key].role = role
      return next()
    } catch (jwtError) {
      ctx.status = ERROR_INVALID_JWT.statusCode
      ctx.body = ERROR_INVALID_JWT.message
    }
  }
  middleware.unless = unless
  return middleware
}

/**
 * Authorization middleware
 * @param {*} params
 */
const authorize = (params) => {
  return async (ctx, next) => {
    
    await next()
  }
}

/**
 * Common error handler
 * @param {*} ctx
 * @param {*} next
 */
const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    ctx.status = error.status || 500
    ctx.body = error
    ctx.app.emit('error', error, ctx)
  }
}

/**
 * Middleware to configure and return healthcheck
 * @param {object} params
 */
const healthCheck = (params = {}) => {
  const path = `${params.basePath}/healthcheck`
  return async (ctx, next) => {
    const fn = params.healthcheck || healthCheckFn
    if (ctx.path === path) {
      const [err, result] = await to(fn(ctx))
      if (err) {
        ctx.body = ERROR_PERFORMING_HEALTH_CHECK
        ctx.status = ERROR_PERFORMING_HEALTH_CHECK.statusCode
        return
      }
      ctx.body = result.message
      ctx.status = result.statusCode
      return
    }
    await next()
  }
}

/**
 * Tenant Resolver
 * @param {*} params
 */
const resolveTenantDB = (params = {}) => {
  return async (ctx, next) => {
    const fn = _.get(params, 'resolvers.tenantDB', null)
    if (typeof fn !== 'function') {
      ctx.body = ERROR_INVALID_TENANT_RESOLVER.message
      ctx.status = ERROR_INVALID_TENANT_RESOLVER.statusCode
    }
    const tenantDB = await fn(ctx)
    ctx.tenantDB = tenantDB
    await next()
  }
}

/**
 * Capture request id
 * @param {*} ctx
 * @param {*} next
 */
const requestId = async (ctx, next) => {
  ctx.requestId = uuidv4()
  await next()
}

/**
 * Capture request start time
 * @param {*} ctx
 * @param {*} next
 */
const requestStartTime = async (ctx, next) => {
  ctx.requestStartTime = new Date()
  await next()
}

/**
 * Version middleware
 * @param {*} params
 */
const version = (params = {}) => {
  const path = `${params.basePath}/version`
  return async (ctx, next) => {
    const fn = params.version || versionFn
    if (ctx.path === path) {
      ctx.status = 200
      ctx.body = await fn()
      return
    }
    await next()
  }
}

module.exports = {
  audit,
  authenticate,
  authorize,
  compress,
  cors,
  errorHandler,
  healthCheck,
  helmet,
  requestId,
  requestLogger: morgan,
  requestStartTime,
  resolveTenantDB,
  version
}
