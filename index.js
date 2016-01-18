"use strict";

var path = require('path');
var pkg = require('./package')
var setup = pkg[pkg.name];

var analyze = require('oma-analyze');
var archive = require('oma-archive');
var bundle = require('oma-bundle');
var constants = require('oma-constants');
var imagine = require('oma-imagine');
var util = require('oma-util');

// common option not to verify JavaScript sources
var silentJavaScript = {
  letter: 's', arity: 0,
  describe: 'Do not verify JavaScript sources'
};

// specify commands for oma-cli
module.exports = {
  analyze: {
    usage: '',
    short: '',
    long: '',
    examples: [],
    least: 1,
    option: {
      
    },
    command: function(opts) {
      return analyze();
    }
  },
  archive: {
    usage: '[options] directory ...',
    short: 'Create archive with modules',
    long: 'Scan directories for source assets of modules',
    examples: [
      '-o my-archive/1.3.7.zip ...',
      'src other/src ...'
    ],
    least: 1,
    option: {
      output: {
        letter: 'o', once: true,
        describe: 'Alternative output archive, otherwise stdout'
      },
      silent: silentJavaScript
    },
    command: function (opts) {
      var error = opts.silent ? null : console.error;
      return util.openWriteStream(opts.output)
        .then(function (output) { return archive(error, opts[''], output); })
        ;
    }
  },
  bootstrap: {
    usage: '[options] destination',
    short: 'Bootstrap initial archives and bundles',
    long: 'Copy first archives and bundles to destination',
    examples: [
      '-s /usr/local/oma/_',
      '-c ~/.oma/_'
    ],
    least: 1, most: 1,
    option: {
      clean: {
        letter: 'c', arity: 0,
        describe: 'Remove existing archives and bundles'
      },
      silent: silentJavaScript
    },
    command: function (opts) {
      var error = opts.silent ? null : console.error;
      var destination = opts[''][0];
      var archiveDirectory = destination + '/' + constants.library.archives;
      var bundleDirectory = destination + '/' + constants.library.bundles;
      return (opts.clean ? util.rmdir(destination) : Promise.resolve())
        .then(function () {
          return Promise.all(setup.bootstrap.map(function (archiveName) {
            var sourceDirectory = path.dirname(require.resolve(archiveName));
            var version = require(sourceDirectory + '/package').version;
            var archivePath = archiveDirectory + '/' + archiveName + '/' + version + '.zip';
            return util.stat(archivePath)
              .then(null, function () {
                return util.openWriteStream(archivePath)
                  .then(function (output) { return archive(error, [sourceDirectory], output); })
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
  },
  bundle: {
    usage: '[options] archive',
    short: 'Create bundles from archive',
    long: 'Search archive for new bundles to publish',
    examples: [
      '-o usr/local/oma/_ ...',
      'my-archive/1.3.7.zip ...'
    ],
    least: 1, most: 1,
    option: {
      output: {
        letter: 'o', demand: true, once: true,
        describe: 'Output directory for new bundles'
      }
    },
    command: function (opts) {
      return bundle(opts[''][0], opts.output + '/' + constants.library.bundles);
    }
  },
  imagine: {
    usage: '[options] bundle ...',
    short: 'Create application image',
    long: 'Compute image from most recent bundle releases',
    examples: [
      '-i _ my-bundle ...'
    ],
    least: 1,
    option: {
      input: {
        letter: 'i', demand: true, once: true,
        describe: 'Input directory for bundles'
      }
    },
    command: function (opts) {
      return imagine(opts.input + '/' + constants.library.bundles, opts['']);
    }
  }
}