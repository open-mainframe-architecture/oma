"use strict";

var path = require('path');

var archive = require('../archive');
var bundle = require('../bundle');
var util = require('../util');

module.exports = function (opts) {
  var error = opts.silent ? null : console.error;
  var destination = opts[''][0];
  var archiveDirectory = destination + '/' + util.setup.library.archivesHome;
  var bundleDirectory = destination + '/' + util.setup.library.bundlesHome;
  return (opts.clean ? util.rmdir(destination) : Promise.resolve())
    .then(function () {
      return Promise.all(util.setup.bootstrap.archives.map(function (archiveName) {
        var sourceDirectory = path.dirname(require.resolve(archiveName));
        var version = require(sourceDirectory + '/package').version;
        var archivePath = archiveDirectory + '/' + archiveName + '/' + version + '.zip';
        return util.stat(archivePath)
          .then(null, function () {
            return util.openWriteStream(archivePath)
              .then(function (output) { return util.zip(output); })
              .then(function (yazFile) { return archive(error, [sourceDirectory], yazFile); })
              ;
          })
          .then(function () { return archivePath; })
          ;
      }));
    })
    .then(function (archivePaths) {
      return Promise.all(archivePaths.map(function (archivePath) {
        return bundle(archivePath, bundleDirectory);
      }));
    })
    ;
}
