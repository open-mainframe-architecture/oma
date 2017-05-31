"use strict"

const { dirname, join } = require('path')

const packageHome = dirname(require.resolve('../packaging'))

require('../packaging').clean(join(packageHome, 'src'), packageHome)