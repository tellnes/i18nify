# i18nify

[![Version npm](https://img.shields.io/npm/v/i18nify.svg?style=flat-square)](https://www.npmjs.com/package/i18nify)[![npm Downloads](https://img.shields.io/npm/dm/i18nify.svg?style=flat-square)](https://www.npmjs.com/package/i18nify)[![Dependencies](https://img.shields.io/david/tellnes/i18nify.svg?style=flat-square)](https://david-dm.org/tellnes/i18nify)[![Tips](http://img.shields.io/gratipay/tellnes.png?style=flat-square)](https://gratipay.com/~tellnes/)


`i18nify` is an internationalization plugin for
[browserify](https://www.npmjs.com/package/browserify).
It works greath with
[jedify](https://www.npmjs.com/package/jedify).


## Simple usage example

If you have the following files:

```js
// entry.js
const hello = require('i18nify', './hello/%s')
console.log(i18n)
```

```js
// hello/en.js
module.exports = 'Hello World'
```

```js
// hello/nb.js
module.exports = 'Hallo Verden'
```

And then runs:

```shell
mkdir bundle
browserify                              \
  --entry entry.js                      \
  --plugin                              \
    [ i18nify                           \
      -l en                             \
      -l nb                             \
      -o 'bundle/%s.js'                 \
    ]                                   \
  --outfile bundle/main.js
```

The the following the files will be produced.

- `bundle/main.js`
- `bundle/en.js`
- `bundle/nb.js`

Then, in your html file you should add `main.js` and one of the language
spesific files.

If you are using browserify entries, then the localized bundle must run before
the main bundle because entries are executed synchronous on script execution.

If you do not use entries, then the load order does not matter which means you
can use the `async` flag on the script tag.

```html
<script src="bundle/en.js"></script>
<script src="bundle.main.js"></script>
```

## Options

When creating a bundle, `i18nify` should be used as a `browserify` plugin.

```
browserify -p [ i18nify OPTIONS ]

where OPTIONS are:

  -l
  --lang
      Add language code. This should be set multiple times to add multiple
      languages.

  -o
  --output
      Output expression that maps to a corresponding entry file at the same
      index. This should include %s in the string which will be replaced with
      the language code.
      It can either be reference a FILE or be a CMD. CMDs are executed with
      $LANG set to the current language code.
      Optionally specify a function that returns a valid value for this
      argument.

  -d
  --default
      Default language code. Defaults to the first language defined.

  --factor-bundle
      Similar to -o expect it maps to factor-bundle. CMDs are executed with
      $FILE set to the corresponding input file.
```


## Moment.js example

Moment.js does not have a `locale/en.js` language file. To support this, the
easiest way is to just tell `browserify` to ignore it.

Eg.

```js
// entry.js

try {
  require('i18nify', 'moment/locale/%s.js')
} catch(e) {}

const moment = require('moment')

console.log(moment().format('LL'))
```

And when running browserify:

```shell
mkdir bundle
browserify                              \
  --entry entry.js                      \
  --ignore moment/locale/en.js          \
  --plugin                              \
    [ i18nify                           \
      -l en                             \
      -l nb                             \
      -o 'bundle/%s.js'                 \
    ]                                   \
  --outfile bundle/main.js
```


## Usage in libraries

If you are writing a library which will be required from node_modules, then you
should add `i18nify` as a browserify transform. If the library consumer is not
using `i18nify` as a plugin, it will just bundle all the language variations in
the main bundle and just work.


## What about `factor-bundle`?

`i18nify` works with `factor-bundle`. Just add multiple `--factor-bundle`
options which maps to the `-o` option in `factor-bundle`.

Eg.

```shell
mkdir bundle
browserify                              \
  --entry foo.js                        \
  --entry bar.js                        \
                                        \
  --plugin                              \
    [ i18nify                           \
      -l en                             \
      -l nb                             \
      -o 'bundle/%s.js'                 \
      --factor-bundle bundle/foo.%.js   \
      --factor-bundle bundle/bar.%.js   \
    ]                                   \
  --plugin                              \
    [ factor-bundle                     \
      -o bundle/foo.js                  \
      -o bundle/bar.js                  \
    ]                                   \
                                        \
  --outfile bundle/common.js            \
```

The above command will produce the following files in the `bundle` folder. Then
it is up to you to include the right combination.

- `common.js`
- `en.js`
- `nb.js`
- `foo.js`
- `foo.en.js`
- `foo.nb.js`
- `bar.js`
- `bar.en.js`
- `bar.nb.js`


## What about `watchify`?

Yes, that should work out of the box.


## Ok, I'm ready

```bash
npm install --save i18nify
```


## Questions?

I'm available on IRC in `#browserify@freenode` with username `tellnes`.


## License

MIT
