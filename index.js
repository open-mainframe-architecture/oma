"use strict";

const path = require('path');
const pkg = require('./package');

const analyze = require('oma-analyze');
const archive = require('oma-archive');
const bundle = require('oma-bundle');
const bootstrap = require('oma-bootstrap');
const constants = require('oma-constants');
const imagine = require('oma-imagine');
const util = require('oma-util');

// common option to skip JavaScript source verification
const silentJavaScript = {
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
      '-o archive.json ...',
      'my-domain/1.3.7/archive.zip'
    ],
    least: 1, most: 1,
    option: {
      output: {
        letter: 'o', once: true,
        describe: 'Alternative output file, otherwise stdout'
      }
    },
    command: opts => util.openWriteStream(opts.output)
      .then(output => util.copyJSON(analyze(opts[''][0]), output))
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
    command: opts => util.openWriteStream(opts.output)
      .then(output => archive(opts.silent ? null : console.error, opts[''], output))
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
    command: opts => {
      const archives = {};
      pkg[pkg.name].bootstrap.forEach(name => {
        archives[name] = path.dirname(require.resolve(name));
      });
      return bootstrap(archives, opts);
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
    command: opts => bundle(opts[''][0], `${opts.output}/${constants.library.publish}`)
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
      },
      output: {
        letter: 'o', once: true,
        describe: 'Alternative image file, otherwise stdout'
      }
    },
    command: opts => util.openWriteStream(opts.output)
      .then(output =>
        util.copyJSON(imagine(`${opts.input}/${constants.library.publish}`, opts['']), output)
      )
  }
}