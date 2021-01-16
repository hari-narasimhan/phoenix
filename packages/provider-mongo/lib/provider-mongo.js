'use strict'

const ConnectionManager = require('./connectionManager')
const Database = require('./db')

exports.create = (config) => {
  const cm = new ConnectionManager(config)
  return new Database(cm)
}
