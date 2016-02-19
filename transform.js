'use strict'

const btt = require('browserify-transform-tools')
const common = require('./common')


module.exports = btt.makeRequireTransform('i18nify'
  , { evaluateArguments: true
    , falafelOptions:
      { ecmaVersion: 6
      , allowReturnOutsideFunction: true
      }
    , jsFilesOnly: true
    }
  , function(args, opts, done) {
      if (args[0] !== 'i18nify')
        return done()

      if (!args[1]) {
        done(null, 'I18NIFY')
        return
      }

      const options = common.readOptions(opts.config)

      common.realpath(opts.file, (err, file) => {
        if (err) return done(err)

        this.emit('i18nify', file, args[1])

        const source =
          '(' +
          options.languages
          .filter((lang) => options.default !== lang)
          .map((lang) => (
            'I18NIFY==' +
            JSON.stringify(lang) +
            '?require(' +
              JSON.stringify(args[1].replace(/%s/, lang)) +
            ')'
          )).join(':') +
          ':require(' +
          JSON.stringify(args[1].replace(/%s/, options.default)) +
          '))' +
          ''

        done(null, source)
      })
    }
  )
