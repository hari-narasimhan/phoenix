'use strict'

const ProviderMongo = require('../lib/provider-mongo')
const isStream = require('is-stream')
const _ = require('lodash')
const to = require('await-to-js').default

const config = {
  mongo: {}
}

config.env = 'test'
config.mongo.host = 'localhost'
config.mongo.dbName = 'testProviders'
config.mongo.uri = process.env.MONGODB_URI || `mongodb://localhost:27017/${config.mongo.dbName}`

const mongoConfig = {
  host: config.mongo.host,
  db: config.mongo.dbName,
  max: 5,
  min: 1,
  timeout: 30000,
  logout: false,
  useMongoClient: true,
  keepAlive: 300000,
  connectTimeoutMS: 30000
}

const ctxProviders = { tenant: 'providerMongoTest', coll: 'providers' }
const ctxDepartments = { tenant: 'providerMongoTest', coll: 'departments' }

const db = ProviderMongo.create(mongoConfig)

test('@super-phoenix/provider-mongo::Cleanup previous run', async (done) => {
  const criteria = { name: 'mongo' }
  let result = await db.removeMultiple({ context: ctxProviders, criteria })
  result = await db.removeMultiple({ context: ctxDepartments, criteria: {} })
  expect(result).toBeTruthy()
  done()
})

test('@super-phoenix/provider-mongo::Should insert a document into the database', async (done) => {
  const payload = { name: 'mongo', config: {} }
  const result = await db.insert({ context: ctxProviders, payload })
  const id = result.ops[0].id
  const inserted = await db.findById({ context: ctxProviders, id })
  expect(inserted.id).toEqual(payload.id)
  done()
})

test('@super-phoenix/provder-mongo::Should find one', async (done) => {
  const query = { name: 'mongo' }
  const result = await db.findOne({ context: ctxProviders, query })
  expect(result.name).toEqual(query.name)
  done()
})

test('@super-phoenix/provder-mongo::Should find by params', async (done) => {
  const query = { name: 'mongo' }
  const result = await db.findByParams({ context: ctxProviders, query })
  expect(result.name).toEqual(query.name)
  done()
})

test('@super-phoenix/provder-mongo::Should upsert', async (done) => {
  const criteria = { name: 'mongo-upserted' }
  const result = await db.upsert({ context: ctxProviders, criteria, payload: criteria })
  expect(result.value.name).toEqual(criteria.name)
  expect(result.value._id).toBeTruthy()
  expect(result.value.id).toBeTruthy()
  done()
})

test('@super-phoenix/provder-mongo::Should remove', async (done) => {
  const criteria = { name: 'mongo-upserted' }
  const result = await db.remove({ context: ctxProviders, criteria })
  expect(result.value.name).toEqual(criteria.name)
  expect(result.value.id).toBeTruthy()
  done()
})

test('@super-phoenix/provder-mongo::Should find by id and remove', async (done) => {
  const criteria = { name: 'mongo-upserted-removed' }
  const result = await db.upsert({ context: ctxProviders, criteria, payload: criteria })
  expect(result.value.name).toEqual(criteria.name)
  expect(result.value.id).toBeTruthy()
  const removeByIdResult = await db.findByIdAndRemove({ context: ctxProviders, id: result.value.id })
  expect(removeByIdResult.value.name).toEqual(result.value.name)
  expect(removeByIdResult.value.id).toEqual(result.value.id)
  done()
})

test('@super-phoenix/provder-mongo::Should find without cursor', async (done) => {
  const query = { name: 'mongo' }
  const result = await db.find({ context: ctxProviders, query })
  expect(result.cursor).toBeFalsy()
  done()
})

test('@super-phoenix/provder-mongo::Should find with cursor', async (done) => {
  const query = { name: 'mongo' }
  const result = await db.find({ context: ctxProviders, query, includeCursor: true })
  expect(result.cursor.totalRecords).toBeGreaterThanOrEqual(1)
  done()
})

test('@super-phoenix/provder-mongo::Should find by id and update', async (done) => {
  const criteria = { name: 'mongo' }
  const result = await db.findOne({ context: ctxProviders, criteria })
  // console.log(result, inserted)
  const updateCriteria = { name: 'new mongo' }
  await db.findByIdAndUpdate({ context: ctxProviders, id: result.id, payload: updateCriteria })
  const updatedResult = await db.findOne({ context: ctxProviders, criteria: updateCriteria })
  expect(updatedResult.name).toEqual(updateCriteria.name)
  done()
})

test('@super-phoenix/provder-mongo::Should aggregate', async (done) => {
  await db.insert({ context: ctxDepartments, payload: { name: 'mathematics', category: 'students', count: 10 } })
  await db.insert({ context: ctxDepartments, payload: { name: 'physics', category: 'students', count: 20 } })
  await db.insert({ context: ctxDepartments, payload: { name: 'history', category: 'students', count: 100 } })
  await db.insert({ context: ctxDepartments, payload: { name: 'engineering', category: 'students', count: 50 } })
  await db.insert({ context: ctxDepartments, payload: { name: 'engineering', category: 'tutors', count: 5 } })
  const pipeline = [
    { $match: {} },
    {
      $group: {
        _id: { category: '$category' },
        total: { $sum: '$count' }
      }
    }
  ]
  const result = await db.aggregate({ context: ctxDepartments, pipeline })
  expect(result.length).toEqual(2)
  done()
})

test('@super-phoenix/provder-mongo::Should find as stream', async (done) => {
  const result = await db.findAsStream({ context: ctxDepartments })
  expect(isStream(result)).toEqual(true)
  done()
})

test('@super-phoenix/provder-mongo::Should return count', async (done) => {
  const result = await db.count({ context: ctxDepartments })
  expect(result.count).toEqual(5)
  done()
})

test('@super-phoenix/provder-mongo::Should insert multiple records', async (done) => {
  const result = await db.insertMany({
    context: ctxDepartments,
    payload: [
      { name: 'advanced mathematics', category: 'students', count: 10 },
      { name: 'astro physics', category: 'students', count: 10 }
    ]
  })
  const find1 = await db.find({ context: ctxDepartments, query: { _id: { $in: _.values(result.insertedIds) } }, includeCursor: true })
  expect(find1.cursor.totalRecords).toEqual(2)
  const find2 = await db.find({ context: ctxDepartments, query: { id: result.ops[0].id.toString() }, includeCursor: true })
  expect(find2.cursor.totalRecords).toEqual(1)
  expect(find2.records[0].id).toEqual(result.ops[0].id)
  done()
})

test('@super-phoenix/provder-mongo::Should throw error if insert many payload is not an array', async (done) => {
  const [err, result] = await to(db.insertMany({
    context: ctxDepartments,
    payload: { name: 'advanced mathematics', category: 'students', count: 10 }
  }
  ))
  expect(err).toBeTruthy()
  expect(result).toBeFalsy()
  done()
})

test('@super-phoenix/provder-mongo::Should throw error if insert payload is an array', async (done) => {
  const [err, result] = await to(db.insert({
    context: ctxDepartments,
    payload: [{ name: 'advanced mathematics', category: 'students', count: 10 }]
  }
  ))
  expect(err).toBeTruthy()
  expect(result).toBeFalsy()
  done()
})

test('@super-phoenix/provder-mongo::Should access ObjectId', async (done) => {
  const ObjectID = db.ObjectID
  const oid = new ObjectID()
  expect(ObjectID.isValid(oid)).toEqual(true)
  done()
})

test('@super-phoenix/provder-mongo::Should find with projections', async (done) => {
  const find1 = await db.find({ context: ctxDepartments, query: {}, projection: { name: 1 }, includeCursor: true })
  expect(find1.cursor.totalRecords).toBeGreaterThanOrEqual(2)
  expect(find1.records[0].category).toBeFalsy()
  expect(find1.records[0].id).toBeTruthy()
  done()
})

test('@super-phoenix/provder-mongo::Should find one with projections', async (done) => {
  const department = await db.findOne({ context: ctxDepartments, query: { name: 'astro physics' }, projection: { name: 1 } })
  expect(department.category).toBeFalsy()
  done()
})
