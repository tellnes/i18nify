'use strict'

const through = require('through2')
const defined = require('defined')
const splicer = require('labeled-stream-splicer')
const xtend = require('xtend')
const bpack = require('browser-pack')
const outpipe = require('outpipe')
const transform = require('./transform')
const common = require('./common')


module.exports = function(br, bOptions) {
  const options = common.readOptions(bOptions)
  const languages = options.languages

  br._bpack.hasExports = true

  const trOptions =
    { languages
    , default: options.default
    }
  br.transform(transform, trOptions)

  const map = {}
  const take = {}

  br.on('transform', (tr) => {
    tr.on('i18nify', (file, id) => {
      const lmap = map[file] || (map[file] = {})
      languages.forEach((lang) => {
        lmap[ id.replace(/%s/, lang) ] = lang
      })
    })
  })


  // This is undocumented because it relates to how i18nify works internaly.
  // If you want to use it, please open an issue. I'll probably document it and
  // removes this comment.
  const prelude = defined(bOptions.prelude, true)

  // Setup language pipelines
  const bpackOptions = xtend(br._options,
    { raw: true
    , hasExports: true
    })

  const splitPipeline = (pipeline, outStr, file) => {
    const pipelines = languages.reduce((pipelines, lang) => {
      pipelines[lang] = splicer.obj(
        [ 'pack', [ bpack(bpackOptions) ]
        , 'wrap', [ ]
        ])

      const env = xtend(process.env
        , { LANG: lang
          , FILE: file
          }
        )
      const out = outpipe(outStr.replace(/%s/, lang), env)

      if (prelude)
        out.write('I18NIFY=' + JSON.stringify(lang) + ';')

      pipelines[lang].pipe(out)

      br.emit('i18nify.pipeline', lang, pipelines[lang])

      return pipelines
    }, {})

    pipeline.get('pack').unshift(through.obj(function(row, enc, cb) {
      common.realpath(row.file, (err, file) => {
        if (err) return cb(err)

        if (take[file])
          pipelines[take[file]].write(row)
        else
          this.push(row)

        cb()
      })
    }, function(cb) {
      languages.forEach(lang => pipelines[lang].end())
      cb()
    }))
  }


  const output = defined(bOptions.output, bOptions.o)

  const factor = defined(bOptions.factorBundle, bOptions['factor-bundle'])
  let factorIndex = 0
  if (factor) {
    br.on('factor.pipeline', (file, pipeline) => {
      const output = Array.isArray(factor) ? factor[factorIndex++] : factor
      splitPipeline(pipeline, output, file)
    })
  }

  const addHooks = () => {
    factorIndex = 0

    br.pipeline.get('deps').push(through.obj(function(row, enc, cb) {
      common.realpath(row.file, (err, file) => {
        if (err) return cb(err)
        // row.file = file

        row.i18nify = row.i18nify || map[file]
        if (row.i18nify)
          Object.keys(row.deps)
            .filter((id) => row.i18nify[id])
            .forEach((id) => take[row.deps[id]] = row.i18nify[id])

        cb(null, row)
      })
    }))

    splitPipeline(br.pipeline, output, '')
  }
  br.on('reset', addHooks)
  addHooks()

}
