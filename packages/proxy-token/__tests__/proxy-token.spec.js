const ProxyToken = require('../lib/proxy-token')
const secret = 'S3cR3t'
const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2dpbiI6Im5vZWwiLCJpYXQiOjE2MDA2OTA5NDYsImV4cCI6MTYwMDY5MTI0Nn0.GPhXAbva-e7UPVpUKOq3ltTZzkDXeY6ef3Ne9hgPcps'

test('should generate token', async (done) => {
  const payload = { user: 'noel' }
  const token = ProxyToken.generateJWT(payload, secret)
  expect(token).toBeTruthy()
  expect(typeof token).toBe('string')
  done()
})

test('should throw error if secret is not set', () => {
  expect(() => {
    const payload = { user: 'noel' }
    ProxyToken.generateJWT(payload)
  }).toThrow(new Error('Invalid secret!'))
})

test('should extend token', async (done) => {
  const newToken = ProxyToken.extendJWT(sampleToken, secret, 10)
  expect(newToken).toBeTruthy()
  expect(typeof newToken).toBe('string')
  done()
})

test('should throw error if secret is not set for extend', () => {
  expect(() => {
    ProxyToken.extendJWT(sampleToken)
  }).toThrow(new Error('Invalid secret!'))
})
