'use strict'

const ResourceFactory = require('../lib/resource-factory')

test('@phoenix/resource-factory', () => {
  expect(true).toBe(true)
})

test('@phoelix/resource-factory::Should create a resource factory with valid resources', () => {
  const rf = ResourceFactory.create({})
  expect(typeof rf).toBe('object')
  expect(rf.constructor.name).toBe('ResourceFactory')
})

test('@phoelix/resource-factory::Should get a resource by its name', () => {
  const rf = ResourceFactory.create({ db: { type: 'MongoProvider' } })
  expect(typeof rf).toBe('object')
  expect(rf.constructor.name).toBe('ResourceFactory')
  expect(rf.get('db').type).toBe('MongoProvider')
})

test('@phoelix/resource-factory::Should add a resource', () => {
  const rf = ResourceFactory.create()
  expect(typeof rf).toBe('object')
  expect(rf.constructor.name).toBe('ResourceFactory')
  rf.add({ name: 'db', resource: { type: 'MongoProvider' } })
  expect(rf.get('db').type).toBe('MongoProvider')
})

test('@phoelix/resource-factory::Should add multiple resource', () => {
  const rf = ResourceFactory.create()
  expect(typeof rf).toBe('object')
  expect(rf.constructor.name).toBe('ResourceFactory')
  rf.addMultiple([{ name: 'db', resource: { type: 'MongoProvider' } }, { name: 'cache', resource: { type: 'RedisProvider' } }])
  expect(rf.get('db').type).toBe('MongoProvider')
})
