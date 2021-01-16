// cSpell:ignore colkeys, upsert
'use strict'
const ObjectID = require('mongodb').ObjectID
const to = require('await-to-js').default
// const Errors = require('./errors')
const csvStringify = require('csv-stringify')
const { v4: uuidv4 } = require('uuid')
const _ = require('lodash')

const getCollection = (mongo, context) => {
  return mongo.db(context.tenant).collection(context.coll)
}

const addIdToProjection = (projection = {}) => {
  if (_.keys(projection).length > 0) {
    projection.id = 1
  }
  return projection
}

const convertObjectIdForQuery = (query) => {
  // converting object id
  let q = {}
  if (query._id) {
    if (typeof query._id === 'string') {
      q._id = ObjectID(query._id)
    } else if (typeof query._id === 'object' && query._id.constructor === Object) {
      if (query._id.$in && typeof query._id.$in === 'object' && query._id.$in.constructor === Array) {
        q = { _id: { $in: [] } }
        query._id.$in.forEach(id => {
          q._id.$in.push(ObjectID(id))
        })
      } else {
        return query
      }
    }
    return q
  } else {
    return query
  }
}

const thunkAggregate = (collection, pipeline) => {
  return new Promise((resolve, reject) => {
    collection.aggregate(pipeline, (error, cursor) => {
      if (error) {
        return reject(error)
      }
      cursor.toArray(function (cursorErr, result) {
        if (cursorErr) {
          reject(cursorErr)
        }
        return resolve(result)
      })
    })
  })
}

class Database {
  constructor (connectionManager) {
    if (!connectionManager) {
      throw new Error('Invalid connection manager, cannot construct a Database object')
    }
    this._connectionManager = connectionManager
  }

  get connectionManager () {
    return this._connectionManager
  }

  get ObjectID () {
    return ObjectID
  }

  // TODO implement distinct

  /**
   * find
   * @param {*} options
   */
  async find (options = {}) {
    const { context, query, projection, page, limit, sort, includeCursor } = { ...options }

    // Acquire a connection
    const [connError, mongo] = await to(this.connectionManager.acquire())

    if (connError) {
      throw connError
    }

    try {
      const _limit = limit || 10
      const _page = page || 1
      const _query = convertObjectIdForQuery(query || {})
      const _projection = addIdToProjection(projection)
      const _sort = sort || { _id: -1 }
      const _skip = _page > 0 ? ((_page - 1) * _limit) : 0
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)

      // Getting the total record count if includeCursor = true
      let cursor

      if (includeCursor === true) {
        const [err, totRecords] = await to(this.count({ context, query: _query }))
        if (err) {
          throw err
        }
        const totalRecords = totRecords.count
        cursor = {
          currentPage: _page,
          perPage: _limit,
          totalRecords
        }
      }

      const [error, result] = await to(collection.find(_query)
        .project(_projection)
        .sort(_sort)
        .skip(_skip)
        .limit(_limit)
        .toArray())

      if (error) {
        throw error
      } else {
        return {
          cursor: cursor,
          records: result
        }
      }
    } finally {
      // Release the connection after  us
      this.connectionManager.release(mongo)
    }
  }

  /**
   * findAsStream
   * @param {*} options
   */
  async findAsStream (options = {}) {
    const { context, query, projection, limit, sort, params } = { ...options }
    // Acquire a connection
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      const _limit = limit || 10
      const _query = convertObjectIdForQuery(query || {})
      const _projection = addIdToProjection(projection)
      const _sort = sort || { _id: -1 }
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      // let count = 0
      return collection.find(_query)
        .project(_projection)
        .sort(_sort)
        .limit(_limit)
        .stream({
          transform: function (doc) {
            const transformer = _.get(params, 'transformer', _.identity)
            return transformer(doc)
          }
        })
        .pipe(csvStringify({ header: true }))
    } finally {
      // Release the connection after  us
      this.connectionManager.release(mongo)
    }
  }

  /**
   * count
   * @param {*} options
   */
  async count (options = {}) {
    const { context, query } = { ...options }
    // Acquire a connection
    const [connError, mongo] = await to(this.connectionManager.acquire())

    if (connError) {
      throw connError
    }

    try {
      const _query = query || {}
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      const [error, result] = await to(collection.countDocuments(_query))
      if (error) {
        throw error
      } else {
        return {
          count: result
        }
      }
    } finally {
      // Release the connection after  us
      this.connectionManager.release(mongo)
    }
  }

  async findOne (options = {}) {
    const { context, query, projection } = { ...options }
    // Acquire a connection
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      const _projection = addIdToProjection(projection)
      const _query = query || {}
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      const [error, result] = await to(collection.findOne(_query, { projection: _projection }))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      // Release the connection after use
      this.connectionManager.release(mongo)
    }
  }

  findById (options = {}) {
    const { context, id, projection } = { ...options }
    return this.findOne({ context, query: { id }, projection })
  }

  findByParams (options = {}) {
    const { context, query, projection } = { ...options }
    return this.findOne({ context, query, projection })
  }

  async insert (options = {}) {
    const { context, payload } = { ...options }
    // Acquire a connection
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    if (Array.isArray(payload)) {
      throw new Error('insert does not handle array as payload, use insertMany instead.')
    }
    try {
      // add uuid
      payload.id = payload.id || uuidv4()
      // Add timestamps
      if (Object.prototype.toString.call(payload) === '[object Object]') {
        const timeStamp = new Date()
        payload.createdAt = timeStamp
        payload.updatedAt = timeStamp
      }
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      const [error, result] = await to(collection.insertOne(payload))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }

  async insertMany (options = {}) {
    const { context, payload } = { ...options }
    let _payload = _.cloneDeep(payload)
    // Acquire a connection
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      if (!Array.isArray(_payload)) {
        throw new Error('insertMany expects payload to be an array')
      }

      if (Object.prototype.toString.call(_payload) === '[object Array]') {
        const timeStamp = new Date()
        _payload = _payload.map(function (val) {
          val.id = uuidv4()
          val.createdAt = timeStamp
          val.updatedAt = timeStamp
          return val
        })
      }
      const [error, result] = await to(collection.insertMany(_payload))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }

  async update (options = {}) {
    const { context, criteria, payload, incPayload = {}, returnOriginal = false, upsert = false, isSetUpdate = true } = { ...options }
    const [connError, mongo] = await to(this.connectionManager.acquire())
    const _payload = _.cloneDeep(payload)
    const _incPayload = _.cloneDeep(incPayload)
    if (connError) {
      throw connError
    }
    try {
      if (upsert === true) {
        // add id (uuid)
        _payload.id = _payload.id || uuidv4()
        _payload.createdAt = new Date()
      }

      // Add timestamps
      _payload.updatedAt = new Date()
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)

      const updatePayload = Object.keys(_incPayload).length === 0 ? { $set: _payload } : { $set: _payload, $inc: _incPayload }

      const [error, result] = await to(collection
        .findOneAndUpdate(
          criteria,
          isSetUpdate ? updatePayload : _payload,
          { returnOriginal, upsert }
        ))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }

  async upsert (options = {}) {
    // call update with upsert set to true
    options.upsert = true
    return this.update(options)
  }

  findByIdAndUpdate (options = {}) {
    const { context, id, payload, incPayload = {}, returnOriginal = false, upsert = false, isSetUpdate = true } = { ...options }
    const _options = {
      context, criteria: { id }, payload, incPayload, returnOriginal, upsert, isSetUpdate
    }
    return this.update(_options)
  }

  async remove (options = {}) {
    const { context, criteria } = { ...options }
    // Acquire a new connection
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      const [error, result] = await to(collection.findOneAndDelete(criteria))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }

  async removeMultiple (options = {}) {
    const { context, criteria } = { ...options }
    // Acquire a new connection
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      const [error, result] = await to(collection.deleteMany(criteria))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }

  findByIdAndRemove (options = {}) {
    const { context, id } = { ...options }
    const _options = { context, criteria: { id } }
    return this.remove(_options)
  }

  removeByCriteria (options = {}) {
    return this.removeMultiple(options)
  }

  async updateByCriteria (options = {}) {
    const { context, criteria, payload, incPayload = {}, multi = false, upsert = false } = { ...options }
    const _payload = _.cloneDeep(payload)
    const _incPayload = _.cloneDeep(incPayload)
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      // Add timestamps
      _payload.updatedAt = new Date()
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)

      const updatePayload = Object.keys(_incPayload).length === 0 ? { $set: _payload } : { $set: _payload, $inc: _incPayload }

      const [error, result] = await to(collection
        .update(
          criteria,
          updatePayload,
          { multi, upsert }
        ))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }

  async findAndUpdate (options = {}) {
    const { context, criteria, payload, incPayload = {}, multi = false, upsert = false } = { ...options }
    return this.updateByCriteria({ context, criteria, payload, incPayload, multi, upsert })
  }

  async aggregate (options = {}) {
    const { context, pipeline } = { ...options }
    const [connError, mongo] = await to(this.connectionManager.acquire())
    if (connError) {
      throw connError
    }
    try {
      const collection = getCollection(mongo, context) // mongo.db(context.tenant).collection(context.coll)
      const [error, result] = await to(thunkAggregate(collection, pipeline))
      if (error) {
        throw error
      } else {
        return result
      }
    } finally {
      this.connectionManager.release(mongo)
    }
  }
}

module.exports = Database
