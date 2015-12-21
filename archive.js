"use strict";

var path = require('path');

var util = require('./util');

var assetPath = {
  bootScript: util.filesPattern(util.setup.category, util.setup.module.bootScript),
  bundleScripts: util.filesPattern(util.setup.category, util.setup.archive.bundleScripts),
  classScripts: util.filesPattern(util.setup.category, util.setup.module.classScripts),
  configScript: util.filesPattern(util.setup.category, util.setup.module.configScript),
  configScripts: util.filesPattern(util.setup.category, util.setup.module.configScripts),
  javaScripts: util.filesPattern(util.setup.category, util.setup.module.classScripts, 'js'),
  launchScripts: util.filesPattern(util.setup.category, util.setup.archive.launchScripts),
  parserScripts: util.filesPattern(util.setup.category, util.setup.module.classScripts, 'jison'),
  publicAssets: util.filesPattern(util.setup.category, util.setup.module.publicAssets)
};

// promise to fill archive by scanning directories for modules
module.exports = function (error, directories, archive) {
  return Promise.all([
    // collect configure scripts
    collectConfigs(error, assetPath.bundleScripts, directories, archive),
    collectConfigs(error, assetPath.launchScripts, directories, archive),
    // collect source assets of modules
    collectModules(error, util.setup.archive.topConfig, directories, archive)
  ])
    .then(function (results) {
      // wait for archive to close and return archived module names
      return new Promise(function (resolve) {
        archive.end(function () { resolve(results[2]); });
      });
    })
    ;
};

function collectConfigs(error, files, directories, archive) {
  var configs = {}, patterns = directories.map(function (dir) { return dir + '/' + files; });
  return util.mapFiles(patterns, function (file, cb) {
    var dir = path.dirname(file.path);
    var relative = path.relative(path.dirname(dir), file.path).replace(util.seps, '/');
    if (configs[relative]) {
      throw 'Duplicate configuration in archive:' + relative;
    }
    configs[relative] = file;
    util.zipFile(archive, relative, file);
    cb(null);
  })
    .then(function () {
      return Promise.all(Object.keys(configs).map(function (relative) {
        return verifyExpression(error, configs[relative]);
      }));
    })
    .then(function () { })
    ;
}

function collectModules(error, files, directories, archive) {
  return collectTopModules(files, directories, archive)
    .then(function (modules) {
      return Promise.all(Object.keys(modules).map(function (name) {
        // recursively collect configure scripts of submodules
        return collectSubModules(util.setup.archive.subConfig, archive, modules, name);
      }))
        .then(function () {
          // configure scripts of all modules are now archived, continue with other assets
          var names = Object.keys(modules);
          return Promise.all(names.map(function (name) {
            var home = modules[name];
            return Promise.all([
              verifyExpressions(error, assetPath.bootScript, home),
              verifyExpressions(error, assetPath.configScript, home),
              verifyExpressions(error, assetPath.configScripts, home),
              verifyExpressions(error, assetPath.javaScripts, home),
              archiveFiles(assetPath.bootScript, archive, name, home),
              archiveFiles(assetPath.configScripts, archive, name, home),
              archiveFiles(assetPath.classScripts, archive, name, home),
              archiveFiles(assetPath.publicAssets, archive, name, home),
              archiveParsers(assetPath.parserScripts, archive, name, home)
            ]);
          }))
            .then(function () { return names.sort(); })
            ;
        });
    })
}

function collectTopModules(files, directories, archive) {
  var modules = {};
  var patterns = directories.map(function (dir) { return dir + '/' + files; });
  return util.mapFiles(patterns, function (file, cb) {
    var dir = path.dirname(file.path), name = path.basename(dir);
    if (modules[name]) {
      throw 'Duplicate module in archive: ' + name;
    }
    modules[name] = dir;
    var relative = path.relative(path.dirname(dir), file.path).replace(util.seps, '/');
    util.zipFile(archive, relative, file);
    cb(null);
  })
    .then(function () { return modules; })
    ;
}

function collectSubModules(files, archive, modules, name) {
  return util.mapFiles(modules[name] + '/' + files, function (file, cb) {
    var dir = path.dirname(file.path), subName = name + '.' + path.basename(dir);
    if (modules[subName]) {
      throw 'Duplicate module in archive: ' + subName;
    }
    modules[subName] = dir;
    var relative = subName + '/' + path.relative(dir, file.path).replace(util.seps, '/');
    util.zipFile(archive, relative, file);
    collectSubModules(archive, modules, subName).then(function () { cb(null); });
  });
}

function verifyExpression(error, file) {
  return error && util.readFileText(file)
    .then(function (expressionSource) {
      var jsErrors = util.verifyJavaScript('void ' + expressionSource + ';');
      jsErrors.forEach(function (jsError) {
        error(file.path + ':' + jsError.line + ':' + jsError.character, jsError.reason);
      });
    });
}

function verifyExpressions(error, files, home) {
  return error && util.mapFiles(home + '/' + files, function (file, cb) {
    verifyExpression(error, file)
      .then(function () { cb(null); })
    ;
  });
}

function archiveFiles(files, archive, name, home) {
  return util.mapFiles(home + '/' + files, function (file, cb) {
    var relative = name + '/' + path.relative(home, file.path).replace(util.seps, '/');
    util.zipFile(archive, relative, file);
    cb(null);
  });
}

function archiveParsers(files, archive, name, home) {
  return util.mapFiles(home + '/' + files, function (file, cb) {
    util.readFileText(file)
      .then(function (grammar) {
        file.contents = new Buffer(util.generateJisonClass(grammar));
        var relative = name + '/' + path.relative(home, file.path).replace(util.seps, '/');
        util.zipFile(archive, relative.replace(/jison$/, 'js'), file);
        cb(null);
      });
  });
}
