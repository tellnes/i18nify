'use strict'

const path = require('path')
const fs = require('fs')
const through = require('through2')
const defined = require('defined')
const acorn = require('acorn')
const estraverse = require('estraverse')
const escodegen = require('escodegen')
const splicer = require('labeled-stream-splicer')
const xtend = require('xtend')
const bpack = require('browser-pack')
const combineSourceMap = require('combine-source-map')


const EMPTY = path.join(__dirname, 'empty.js')


module.exports = function(b, pOptions) {
  const bOptions = b._options

  const outdir =
    path.resolve(
        defined(pOptions.basedir, bOptions.basedir, process.cwd())
      , defined(pOptions.o, pOptions.outdir, './locale')
      )

  const languages = []
    .concat(pOptions._ || [])
    .concat(pOptions.l || [])
    .concat(pOptions.lang || [])
  if (!languages.length)
    throw new Error('i18n: You must specify at least one language')

  const map = {}
  const pipelines = {}

  var exposeCounter = 0
  var pending = 0
  var ended = false
  var pushedLangCode = false

  b.ignore('i18nify')
  b._bpack.hasExports = true


  // We need to call b._mdeps.walk() on our dependencies before module-deps
  // sends of EOF.
  const pushFn = b._mdeps.push
  b._mdeps.push = function(row) {
    if (row === null) {
      if (pending)
        ended = true
      else
        pushFn.call(b._mdeps, null)
      return
    }

    if (!/\.js$/.test(row.file) ||
        bOptions.noParse === true ||
        ( Array.isArray(bOptions.noParse) &&
          ~bOptions.noParse.indexOf(row.file)
        )
      ) {
      return pushFn.call(b._mdeps, row)
    }

    pending++

    let counter = 0
    let changed = false

    const current =
      { id: row.file
      , filename: row.file
      , paths: b._mdeps.paths
      }

    const ast = acorn.parse(
        row.source
      , { ecmaVersion: 6
        , allowReturnOutsideFunction: true
        }
      )
    estraverse.replace(ast, { leave })

    function leave(node) {
      const args = node.arguments
      if (node.type !== 'CallExpression' ||
          node.callee.type !== 'Identifier' ||
          node.callee.name !== 'require' ||
          args[0].type !== 'Literal' ||
          args[0].value !== 'i18nify'
        ) return

      if (!row.i18nify) row.i18nify = {}
      if (!row.i18nify.deps) row.i18nify.deps = {}

      const id = args[1] && args[1].value

      if (!id) { // Require lang code
        if (!pushedLangCode) {
          pushedLangCode = true

          b._expose['i18nify:0'] = 'i18nify:0'
          languages.forEach(lang => {
            const rec =
              { id: 'i18nify:0'
              , expose: 'i18nify:0'
              , source: 'module.exports=' + JSON.stringify(lang)
              , deps: {}
              , file: path.join(__dirname, '__fake_' + lang + '.js')
              , i18nify: { lang }
              , noparse: true
              }
            pushFn.call(b._mdeps, rec)
          })
        }

        row.i18nify.deps['i18nify'] = 'i18nify:0'
        return
      }

      // Require lang file

      changed = true
      node.arguments =
        [ { type: 'Literal'
          , value: id
          }
        ]

      // Dep required
      if (row.i18nify.deps[id])
        return node

      const expose = 'i18nify:' + (++exposeCounter)
      const rOptions = parseOptions(row.source, args[2])

      const ignoreMissing = defined(
          rOptions.ignoreMissing
        , pOptions.ignoreMissing
        , bOptions.ignoreMissing
        )
      const noParse = defined(
          rOptions.noParse
        , pOptions.noParse
        )

      languages.forEach(lang => {
        const idl = id.replace(/%s/, lang)

        counter++
        b._mdeps.resolve(idl, current, (err, file) => {
          if (err && ignoreMissing) {
            file = EMPTY
          } else if (err) return b.emit('error', err)

          if (map[file]) {
            row.i18nify.deps[id] = map[file]
            finish()
            return
          }

          map[file] = expose
          row.i18nify.deps[id] = expose

          const rec =
            { id: expose
            , expose: expose
            , file: file
            , i18nify: { lang }
            , noparse: noParse
            }

          b._mdeps.walk(rec, current, finish)
        })
      })

      return node
    } // function leave()

    counter++
    finish()

    function finish() {
      if (--counter) return

      if (changed) {
        let sm = combineSourceMap.create()
        sm.addFile(
            { sourceFile: row.file
            , source: row.source
            }
          , { line: 1 }
          )
        row.source =
          combineSourceMap.removeComments( escodegen.generate(ast) ) +
          '\n' +
          sm.comment()
      }

      pushFn.call(b._mdeps, row)

      pending--
      if (!pending && ended)
        pushFn.call(b._mdeps, null)
    }
  } // b._mdeps.push

  b.pipeline.get('dedupe').unshift(through.obj(function(row, enc, cb) {
    if (row.i18nify && row.i18nify.lang) {
      if (row.dedupe)
        row.dedupe = null
      if (row.dedupeIndex)
        row.dedupeIndex = null
    }
    cb(null, row)
  }))

  b.pipeline.get('label').push(through.obj(function(row, enc, cb) {
    if (row.indexDeps && row.i18nify && row.i18nify.deps) {
      Object.keys(row.i18nify.deps).forEach(id => {
        row.indexDeps[id] = row.i18nify.deps[id]
      })
    }
    cb(null, row)
  }))

  const lPackOpts = xtend(bOptions,
    { raw: true
    , hasExports: true
    })



  languages.forEach(lang => {
    pipelines[lang] = splicer.obj(
      [ 'pack', [ bpack(lPackOpts) ]
      , 'wrap', []
      ]
      )
    pipelines[lang].pipe(fs.createWriteStream(path.join(outdir, lang + '.js')))

    b.emit('i18nify.pipeline', pipelines[lang], lang)
  })

  b.pipeline.get('pack').unshift(through.obj(function(row, enc, cb) {
    if (row.i18nify && row.i18nify.lang)
      pipelines[row.i18nify.lang].write(row)
    else
      this.push(row)

    cb()
  }, function(cb) {
    languages.forEach(lang => pipelines[lang].end())
    cb()
  }))

}


function parseOptions(source, node) {
  if (!node || node.type !== 'ObjectExpression')
    return {}

  const src = 'return ' + source.slice(node.start, node.end)

  /*jshint -W054 */
  return (new Function([], src))()
  /*jshint +W054 */
}
