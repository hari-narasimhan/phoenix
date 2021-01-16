'use strict'
const _ = require('lodash')
const MongoDB = require('mongodb')
const MongoClient = MongoDB.MongoClient
const genericPool = require('generic-pool')

const defaultOptions = {
  host: 'localhost',
  port: 27017,
  db: 'test',
  max: 100,
  min: 1
}

class ConnectionManager {
  constructor (options) {
    this._pool = this.init(options)
  }

  get pool () {
    return this._pool
  }

  init (options) {
    options = _.assign({}, defaultOptions, options)
    let mongoUri = options.uri
    if (!mongoUri) {
      if (options.user && options.pass) {
        mongoUri = `mongodb://${options.user}:${options.pass}@{options.host}:${options.port}/${options.db}`
      } else {
        mongoUri = `mongodb://${options.host}:${options.port}/${options.db}`
      }
    }
    return genericPool.createPool({
      create: () => MongoClient.connect(mongoUri, {
        poolSize: 1,
        native_parser: true,
        useNewUrlParser: true,
        useUnifiedTopology: true
      }),
      destroy: (client) => client.close()
    }, options)
  }

  acquire () {
    return this.pool.acquire()
  }

  release (conn) {
    this.pool.release(conn)
  }
}

module.exports = ConnectionManager
