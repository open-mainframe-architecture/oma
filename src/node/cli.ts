const { assign } = Object

import boot from 'oma/boot'
import standard from 'oma/configuration/standard'

boot(assign({}, standard, ...process.argv.slice(2).map(name => require(name).default)))