'use strict'

const App = require('../lib/app')
const request = require('supertest')
const params = require('./appConfig')
const ProxyToken = require('@super-phoenix/proxy-token')

let appInstance = null

beforeAll(async (done) => {
  appInstance = App.create(params)
  console.log('Phoenix::App E2E starting!')
  done()
})

afterAll(async () => {
  // IMPORTANT
  // below line is required to avoid jest open handle error
  await new Promise(resolve => setTimeout(() => resolve(), 500))
  console.log('E2E completed, closed the server')
})

test('@phoenix/app:: healthcheck', async (done) => {
  const response = await request(appInstance.callback())  
    .get('/healthcheck')
    expect(response.status).toEqual(200)
  done()
})

test('@phoenix/app:: version', async (done) => {
  const response = await request(appInstance.callback())  
    .get('/version')
    expect(response.status).toEqual(200)
  done()
})

test('@phoenix/app:: try to access a protected route', async (done) => {
  const response = await request(appInstance.callback())  
    .get('/api/v1/products')
    expect(response.status).toEqual(401)
  done()
})

test('@phoenix/app:: try to access a open route', async (done) => {
  const response = await request(appInstance.callback())  
    .get('/api/v1/requestId')
    expect(response.status).toEqual(200)
    expect(response.body.requestId).toBeTruthy()
  done()
})

test('@phoenix/app:: try to access a open route error path', async (done) => {
  const response = await request(appInstance.callback())  
    .get('/api/v1/error')
    expect(response.status).toEqual(500)
    expect(response.body).toBeTruthy()
  done()
})

test('@phoenix/app:: try to access a protected route with auth header', async (done) => {
  const jwt = ProxyToken.generateJWT({user: 'noel'}, params.secret)
  const response = await request(appInstance.callback())  
    .get('/api/v1/projects')
    .set('Authorization', `Bearer ${jwt}`)
    expect(response.status).toEqual(200)
  done()
})


test('@phoenix/app:: should decode token into jwt to retrieve data', async (done) => {
  const jwt = ProxyToken.generateJWT({user: 'noel'}, params.secret)
  const response = await request(appInstance.callback())  
    .get('/api/v1/projects?token=1u1yi12712671jhgugh')
    expect(response.status).toEqual(200)
  done()
})
