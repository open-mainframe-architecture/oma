"use strict";

var bundle = require('../bundle');

module.exports = function (opts) {
  return bundle(opts[''][0], opts.output);
}
