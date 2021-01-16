'use strict'

class ResourceFactory {
  constructor (resources = {}) {
    this._resources = resources
  }

  static create (resources = {}) {
    return new ResourceFactory(resources)
  }

  get (name) {
    return this._resources[name] || null
  }

  add (params) {
    this._resources[params.name] = params.resource
  }

  addMultiple (resources = []) {
    for (let i = 0; i < resources.length; i++) {
      this._resources[resources[i].name] = resources[i].resource
    }
  }
}

module.exports.create = (resources) => ResourceFactory.create(resources)
