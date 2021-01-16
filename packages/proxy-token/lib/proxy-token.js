'use strict'
const jwt = require('jsonwebtoken')

/**
 * Generates a jwt token
 * @param {object} payload
 * @param {string} secret
 * @param {number} expiry
 */

const generateJWT = (payload, secret, expiresIn = 5) => {
  if (!secret) {
    throw new Error('Invalid secret!')
  }
  return jwt.sign(payload, secret, { expiresIn: expiresIn * 60 })
}

/**
 * Extends the expiry of the jwt token
 * @param {*} token 
 * @param {*} secret 
 * @param {*} expiresIn 
 */
const extendJWT = (token, secret, expiresIn = 5) => {
  if (!secret) {
    throw new Error('Invalid secret!')
  }
  const payload = jwt.decode(token)
  delete payload.iat
  delete payload.exp
  return generateJWT(payload, secret, expiresIn)
}

module.exports = {
  extendJWT,
  generateJWT
}
