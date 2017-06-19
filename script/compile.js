"use strict"

const { dirname, join } = require('path')

const packageHome = dirname(require.resolve('../packaging'))

const { compile, link } = require('../packaging')

link(packageHome)
  .then(() => compile(join(packageHome, 'src/portable')))
  .then(() => Promise.all(['src/node', 'src/browser'].map(relative => compile(join(packageHome, relative)))))
