"use strict";

var util = require('../util');
var archive = require('../archive');

module.exports = function (opts) {
  var error = opts.silent ? null : console.error;
  return util.openWriteStream(opts.output)
    .then(function (output) { return util.zip(output); })
    .then(function (yazFile) { return archive(error, opts[''], yazFile); })
    ;
}
