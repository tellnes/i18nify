'use strict'

const fs = require('fs')
const defined = require('defined')

exports.readOptions = (input) => {
  const output = {}

  // Languages
  output.languages = []

  const setLang = (val) => {
    if (Array.isArray(val))
      output.languages.push(...val)
    else
      output.languages.push(val)
  }
  setLang(input.languages)
  setLang(input.lang)
  setLang(input.l)

  output.languages = output.languages.filter(Boolean)

  if (!output.languages.length)
    throw new Error('i18nify: You must specify at least one language')


  // Default
  output.default = defined(input.default, input.d, output.languages[0])

  return output
}


const realpathCache = new Map()
exports.realpath = function(file, cb) {
  if (realpathCache.has(file))
    return process.nextTick(() => cb(null, realpathCache.get(file)))

  fs.realpath(file, (err, rp) => {
    if (err) return cb(err)
    realpathCache.set(file, rp)
    cb(null, rp)
  })
}
