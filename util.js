"use strict";

var fs = require('fs');
var path = require('path');
var stream = require('stream');

var Datauri = require('datauri');

var ebnf = require('ebnf-parser');
var es = require('event-stream');
var extfs = require('fs-extra');
var imageDimsOf = require('image-size');
var jshint = require('jshint').JSHINT;
var jison = require('jison');
var semver = require('semver');
var uglify = require('uglify-js');
var vfs = require('vinyl-fs');
var yauzl = require('yauzl');
var yazl = require('yazl');

function promiseCallback(resolve, reject) {
  return function (err, result) {
    if (err) {
      reject(err);
    } else {
      resolve(result);
    }
  };
}
function denodeify(f) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(promiseCallback(resolve, reject));
      f.apply(null, args);
    });
  };
}

var openZip = denodeify(yauzl.open);

var pkg = require('./package');

var util = module.exports = {
  bestVersion: semver.maxSatisfying,
  compareVersions: function(v1, v2) {
    return semver.gt(v1, v2) ? 1 : semver.lt(v1, v2) ? -1 : 0;
  },
  denodeify: denodeify,
  imageDimsOf: imageDimsOf,
  mkdir: denodeify(extfs.mkdirs),
  promiseCallback: promiseCallback,
  rmdir: denodeify(extfs.remove),
  setup: pkg[pkg.name],
  seps: new RegExp('\\' + path.sep, 'g'),
  stat: denodeify(fs.stat),
  version: pkg.version,
  vseps: /\//g
};

util.chunkReader = function () {
  var chunks = [].slice.call(arguments);
  var input = new stream.Readable();
  input._read = function () {
    chunks.forEach(function (chunk) { input.push(chunk); });
    input.push(null);
  };
  return input;
};

util.copy = function (inputPromise, outputPromise) {
  return Promise.all([inputPromise, outputPromise])
    .then(function (io) {
      var input = io[0], output = io[1];
      return new Promise(function (resolve, reject) {
        output.once('error', reject);
        input.once('error', reject).once('end', resolve).pipe(output);
      });
    })
    ;
};

util.datafy = function (extension, buffer) {
  var uri = new Datauri();
  uri.format(extension, buffer);
  return uri.content;
};

util.endsWith = function (s, postfix) {
  return postfix.length <= s.length && s.lastIndexOf(postfix) === (s.length - postfix.length);
};

util.fileExtensions = function (categories, selection) {
  var names = selection ? selection.split(',') : Object.getOwnPropertyNames(categories);
  var exts = [];
  for (var i = 0, n = names.length; i < n; ++i) {
    exts.push.apply(exts, categories[names[i]].split(','));
  }
  return exts;
};

util.filesPattern = function (categories, files, alternativeExts) {
  if (typeof files === 'string') {
    return files;
  }
  var home = files.home || '.';
  var base = files.base || '*';
  var exts = alternativeExts ? alternativeExts.split(',')
    : files.category ? util.fileExtensions(categories, files.category)
      : null
    ;
  var ext = !exts ? '*' : exts.length === 1 ? exts[0] : '@(' + exts.join('|') + ')';
  return home + '/' + base + '.' + ext;
};

var P = '\'' + util.setup.tool.parser + '\'';
// create template of parse method that references outer variable
var jisonParser = (function () {
  var parseMethod = function (input) {
    jisonParser.yy = { self: this };
    try {
      return jisonParser.parse(input);
    } finally {
      jisonParser.yy = null;
    }
  };
  // extract name of outer variable from source
  var source = parseMethod.toString().replace(/[\n\r]/g, '');
  var outerName = source.substring(source.indexOf('{') + 1, source.indexOf('.')).trim();
  return { methodSource: source, moduleName: outerName };
} ());
util.generateJisonClass = function (grammar) {
  // generate jison parser with name of outer variable
  var options = { moduleName: jisonParser.moduleName, moduleType: 'js' };
  var generator = new jison.Generator(new ebnf.parse(grammar), options);
  var parser = generator.generate(options);
  // wrap generated parser in a class script with parse method from template  
  var method = jisonParser.methodSource;
  return P + '.subclass(function(I){' + parser + 'I.know({parse:' + method + '});})';
};

util.mapFiles = function (files, fn) {
  return new Promise(function (resolve, reject) {
    vfs.src(files).pipe(es.map(fn)).once('error', reject).once('end', resolve);
  });
};

util.minify = function (source) {
  return uglify.minify(source, { fromString: true });
};

util.openReadStream = function (filePath, fileOpts) {
  return new Promise(function (resolve, reject) {
    if (!filePath) {
      resolve(process.stdin);
    } else {
      fs.createReadStream(filePath, fileOpts)
        .once('open', function () { resolve(this); })
        .once('error', reject)
      ;
    }
  });
};

util.openWriteStream = function (filePath, fileOpts) {
  return new Promise(function (resolve, reject) {
    if (!filePath) {
      resolve(process.stdout);
    } else {
      util.mkdir(path.dirname(filePath))
        .then(function () {
          fs.createWriteStream(filePath, fileOpts)
            .once('open', function () { resolve(this); })
            .once('error', reject);
        })
      ;
    }
  });
};

util.readFileText = function (file, withCrs) {
  var contents = file.contents;
  if (file.isStream()) {
    return util.readStreamText(contents, withCrs);
  } else {
    var result = file.isBuffer() ? contents.toString() : contents;
    return Promise.resolve(result);
  }
};

util.readStreamBuffer = function (input) {
  return util.readStreamChunks(input)
    .then(function (chunks) { return Buffer.concat(chunks); })
    ;
};

util.readStreamChunks = function (input) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    input
      .on('data', function (chunk) { chunks.push(chunk); })
      .on('error', reject)
      .on('end', function () { resolve(chunks); });
  });
};

util.readStreamText = function (input, withCrs) {
  input.setEncoding('utf8');
  return util.readStreamChunks(input)
    .then(function (chunks) {
      var text = chunks.join('');
      return withCrs ? text : text.replace(/\r/g, '');
    })
    ;
};

util.selectEntries = function (entries, prefix, postfix) {
  var selected = {};
  postfix = postfix || '';
  for (var key in entries) {
    if (util.startsWith(key, prefix) && util.endsWith(key, postfix)) {
      selected[key.substring(prefix.length, key.length - postfix.length)] = entries[key];
    }
  }
  return selected;
};

util.startsWith = function (s, prefix) {
  return s.indexOf(prefix) === 0;
};

util.unzip = function (filePath) {
  var zip = { entries: {} };
  return openZip(filePath, { autoClose: false })
    .then(function (yauzFile) {
      zip.file = yauzFile;
      return new Promise(function (resolve, reject) {
        yauzFile.on('entry', function (entry) {
          var fileName = entry.fileName;
          if (zip.entries[fileName]) {
            throw 'Duplicate ' + fileName + ' in ' + filePath;
          }
          zip.entries[fileName] = entry;
        })
          .once('error', reject)
          .once('end', function () { resolve(zip); });
      });
    })
    ;
};

util.unzipDirectory = function (yauzFile, entries, targetDir) {
  var completions = [];
  for (var entryPath in entries) {
    var filePath = path.resolve(targetDir, entryPath);
    completions.push(util.unzipFile(yauzFile, entries[entryPath], filePath));
  }
  return Promise.all(completions).then(function () { });
};

util.unzipFile = function (yauzFile, entry, filePath) {
  return Promise.all([util.unzipStream(yauzFile, entry), util.openWriteStream(filePath)])
    .then(function (streams) {
      var input = streams[0], output = streams[1];
      return new Promise(function (resolve, reject) {
        output.once('close', resolve).once('error', reject);
        input.pipe(output);
      });
    })
    ;
};

util.unzipBuffer = function (yauzFile, entry) {
  return util.unzipStream(yauzFile, entry)
    .then(function (input) { return util.readStreamBuffer(input); })
    ;
};

util.unzipStream = function (yauzFile, entry) {
  return new Promise(function (resolve, reject) {
    yauzFile.openReadStream(entry, promiseCallback(resolve, reject));
  });
};

util.unzipText = function (yauzFile, entry, withCrs) {
  return util.unzipStream(yauzFile, entry)
    .then(function (input) { return util.readStreamText(input, withCrs); })
    ;
};

util.verifyJavaScript = function (source) {
  jshint(source, util.setup.tool.jshint);
  return jshint.errors.slice();
};

util.zip = function (output) {
  var yazFile = new yazl.ZipFile();
  yazFile.outputStream.pipe(output);
  return yazFile;
};

util.zipBuffer = function (yazFile, relative, buffer, mtime, plain) {
  yazFile.addBuffer(buffer, relative, { mtime: mtime, compress: !plain });
};

util.zipFile = function (yazFile, relative, file, plain) {
  var options = { mtime: file.stat.mtime, mode: file.stat.mode, compress: !plain };
  if (file.isBuffer()) {
    yazFile.addBuffer(file.contents, relative, options);
  } else if (file.isStream()) {
    yazFile.addReadStream(file.contents, relative, options);
  }
};

util.zipStream = function (yazFile, relative, input, mtime, plain) {
  yazFile.addReadStream(input, relative, { mtime: mtime, compress: !plain });
};
