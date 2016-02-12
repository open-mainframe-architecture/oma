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
    usage: '[options] archive',
    short: 'Analyze classes in archive',
    long: 'Create extensive JSON analysis of class scripts in archive',
    examples: [
      '-o classes.json ...',
      'my-domain/1.3.7/archive.zip'
    ],
    least: 1, most: 1,
    option: {
      output: {
        letter: 'o', once: true,
        describe: 'Alternative output file, otherwise stdout'
      }
    },
    command: function (opts) {
      return util.openWriteStream(opts.output)
        .then(function (output) { return analyze(opts[''][0], output); })
        ;
    }
  },
  archive: {
    usage: '[options] directory ...',
    short: 'Create archive with modules',
    long: 'Scan directories for source assets of modules',
    examples: [
      '-o my-domain/1.3.7/archive.zip ...',
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
      var archiveDir = destination + '/' + constants.library.preserve;
      var bundleDir = destination + '/' + constants.library.publish;
      return (opts.clean ? util.rmdir(destination) : Promise.resolve())
        .then(function () {
          return Promise.all(setup.bootstrap.map(function (name) {
            var sourceDir = path.dirname(require.resolve(name));
            var version = require(sourceDir + '/package').version;
            var archiveZip = constants.archive.file;
            var archivePath = archiveDir + '/' + name + '/' + version + '/' + archiveZip + '.zip';
            return util.stat(archivePath)
              .then(null, function () {
                return util.openWriteStream(archivePath)
                  .then(function (output) { return archive(error, [sourceDir], output); })
                  ;
              })
              .then(function () { return archivePath; })
              ;
          }));
        })
        .then(function (archivePaths) {
          return Promise.all(archivePaths.map(function (archivePath) {
            var analysisPath = path.dirname(archivePath) + '/' + constants.archive.file + '.json';
            return Promise.all([
              bundle(archivePath, bundleDir),
              util.stat(analysisPath)
                .then(null, function () {
                  return util.openWriteStream(analysisPath)
                    .then(function (output) { return analyze(archivePath, output); })
                    ;
                })
            ]);
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
      'my-domain/1.3.7/archive.zip ...'
    ],
    least: 1, most: 1,
    option: {
      output: {
        letter: 'o', demand: true, once: true,
        describe: 'Output directory for new bundles'
      }
    },
    command: function (opts) {
      return bundle(opts[''][0], opts.output + '/' + constants.library.publish);
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
      return imagine(opts.input + '/' + constants.library.publish, opts['']);
    }
  }
}