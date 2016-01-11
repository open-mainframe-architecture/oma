"use strict";

var path = require('path');

var util = require('./util');

module.exports = function (bundleDirectory, bundleNames) {
  return scanBundleReleases(bundleDirectory, bundleNames)
    .then(function (bundleReleases) {
      var missingBundles = bundleNames.filter(function (name) { return !bundleReleases[name]; });
      if (missingBundles.length) {
        throw 'Unknown bundle(s): ' + missingBundles.join();
      }
      var bestReleases = bestBundleReleases(bundleReleases);
      var bestArchives = bestArchiveVersions(bestReleases, bundleReleases);
      console.log(bestReleases);
      console.log(bestArchives);
    })
    ;
}

function scanBundleReleases(bundleDirectory, bundleNames) {
  var bundleReleases = {};
  var pattern = '/@(' + bundleNames.join('|') + ')/*/' + util.setup.bundle.loaderBase + '.json';
  return util.mapFiles(bundleDirectory + pattern, function (file, cb) {
    util.readFileText(file)
      .then(function (jsonSource) {
        var bundleHome = path.dirname(file.path);
        var releaseIdentity = path.basename(bundleHome);
        var bundleName = path.basename(path.dirname(bundleHome));
        var bundleRelease = bundleReleases[bundleName] || (bundleReleases[bundleName] = {});
        var archiveVersions = bundleRelease[releaseIdentity] = {};
        var metaObject = JSON.parse(jsonSource);
        for (var moduleName in metaObject) {
          var matches = metaObject[moduleName].archive.match(/^(.*)\/(.*)$/);
          archiveVersions[matches[1]] = matches[2];
        }
        cb(null);
      })
    ;
  })
    .then(function () {
      return bundleReleases;
    })
    ;
}

function bestBundleReleases(bundleReleases) {
  var bestReleases = {};
  for (var bundleName in bundleReleases) {
    var bestReleaseIdentity = null;
    var releases = bundleReleases[bundleName]
    for (var releaseIdentity in releases) {
      var thisRelease = releases[releaseIdentity];
      if (!bestReleaseIdentity || isBetterRelease(thisRelease, releases[bestReleaseIdentity])) {
        bestReleaseIdentity = releaseIdentity;
      }
    }
    bestReleases[bundleName] = bestReleaseIdentity;
  }
  return bestReleases;
}

function isBetterRelease(newVersions, oldVersions) {
  var totalComparison = 0;
  for (var archiveName in newVersions) {
    var newVersion = newVersions[archiveName], oldVersion = oldVersions[archiveName];
    // if new or old version is undefined, continue with other names
    if (newVersion && oldVersion) {
      var comparison = util.compareVersions(newVersion, oldVersion);
      if (comparison > 0 && totalComparison >= 0) {
        // new version becomes or remains better version
        totalComparison = 1;
      } else if (comparison < 0 && totalComparison <= 0) {
        // new version becomes or remains worse version
        totalComparison = -1;
      } else if (comparison !== 0) {
        // if versions are different, they must be consistently better or worse
        throw 'Inconsistent versions: ' + archiveName + ' ' + newVersion + ' & ' + oldVersion;
      }
    }
  }
  return totalComparison > 0;
}

function bestArchiveVersions(bestReleases, bundleReleases) {
  var archives = {}
  for (var bundleName in bestReleases) {
    var releaseIdentity = bestReleases[bundleName];
    var archiveVersions = bundleReleases[bundleName][releaseIdentity];
    for (var archiveName in archiveVersions) {
      var thisVersion = archiveVersions[archiveName];
      var existingVersion = archives[archiveName];
      if (!existingVersion) {
        archives[archiveName] = thisVersion;
      } else if (existingVersion !== thisVersion) {
        throw 'Version conflict: ' + archiveName + ' ' + existingVersion + ' & ' + thisVersion;
      }
    }
  }
  return archives;
}