# i18nify

[![Version npm](https://img.shields.io/npm/v/i18nify.svg?style=flat-square)](https://www.npmjs.com/package/i18nify)[![npm Downloads](https://img.shields.io/npm/dm/i18nify.svg?style=flat-square)](https://www.npmjs.com/package/i18nify)[![Dependencies](https://img.shields.io/david/tellnes/i18nify.svg?style=flat-square)](https://david-dm.org/tellnes/i18nify)[![Tips](http://img.shields.io/gratipay/tellnes.png?style=flat-square)](https://gratipay.com/~tellnes/)


`i18nify` is an internationalization plugin for
[browserify](https://www.npmjs.com/package/browserify).
It works greath with
[jedify](https://www.npmjs.com/package/jedify).


## Usage

`entry.js`:
```js
// moment.js
require('i18nify', 'moment/locale/%s.js')
const moment = require('moment')
console.log(moment().format('LL'))


// gettext with jedify
const jed = require('i18nify', './locale/%s.po')
console.log(jed.gettext('Hello World'))
```

```shell
mkdir locale
browserify -e entry.js -t jedify -p [ i18nify en nb -o locale ] -o main.js
```

The above command will create three files. Each of them will bundle the
following files:
- `main.js`:
  - `entry.js`
  - `node_modules/moment/moment.js`
  - `node_modules/jedify/browser.js`
  - `node_modules/jedify/node_modules/jed/jed.js`
- `locale/en.js`:
  - `node_modules/moment/locale/en.js`
  - `locale/en.po`
- `locale/nb.js`:
  - `node_modules/moment/locale/nb.js`
  - `locale/nb.po`

If you are using browserify entries, then the localized bundle must run before
the main bundle because entries are executed synchronous on script execution.
If you do not use entries, then the load order does not matter which means you
can use the `async` flag.

```html
<script src="locale/en.js"></script>
<script src="main.js"></script>
```

## Install

```bash
npm install --save i18nify
```


## License

MIT
