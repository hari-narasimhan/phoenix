const Router = require('koa-router')
const ProxyToken = require('@phoenix/proxy-token')
const MongoProvider = require('@phoenix/provider-mongo')
const router = new Router()
require('./routes').register(router)

const mongoConfig = {
  host: 'localhost',
  db: 'testDB',
  max: 5,
  min: 1,
  timeout: 30000,
  logout: false,
  useMongoClient: true,
  keepAlive: 300000,
  connectTimeoutMS: 30000
}

const params = {
  secret: 'S3cR3t',
  basePath: '',
  unprotectedPaths: [/requestId/i, /error/i],
  resolvers: {
    tenantDB: async (ctx) => 'default-tenant',
    token: async (token) => {
      return { token: ProxyToken.generateJWT({user: 'neal'}, params.secret), role: 'user' }
    }
  },
  endPoints: [
    {location: 'api/v1', service: router.middleware()}
  ],
  handlers: {
    error: (error, ctx) =>  console.log('ERROR HANDLER', error),
    audit: async (ctx) => console.log('AUDIT', ctx.path),
    authorize: async (ctx, next) => next
  },
  resources: {db: MongoProvider.create(mongoConfig)}
}

module.exports = params
