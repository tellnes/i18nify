'use strict'

const plugin = require('./plugin')
const transform = require('./transform')

module.exports = function(arg, opts) {
  if (typeof arg === 'string')
    return transform(arg, opts)
  else
    return plugin(arg, opts)
}

