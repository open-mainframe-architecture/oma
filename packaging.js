"use strict"

const { create, keys } = Object

const child_process = require('child_process')
const { basename, extname, join } = require('path')

// cli of typescript compiler
const tsc = join(require.resolve('typescript'), '../../bin/tsc')

// compile typescript project in a child process
function compile(projectDirectory) {
  return new Promise((resolve, reject) => {
    const child = child_process.fork(tsc, ['-p', projectDirectory])
    child.on('error', error => { reject(error) })
    child.on('exit', () => { resolve() })
  })
}

// convert callback style to promise-based code
function denodeify(code) {
  return (...parameters) => new Promise((resolve, reject) => {
    function callback(error, result) {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    }
    code(...parameters, callback)
  })
}

const fs = require('fs')
const readdir = denodeify(fs.readdir)
const stat = denodeify(fs.stat)
const symlink = denodeify(fs.symlink)

// gather stats of files and subdirectories in given directory
function readDirectoryStats(directory) {
  const stats = create(null)
  return readdir(directory)
    .then(files => Promise.all(files.map(filename => stat(join(directory, filename))))
      .then(filestats => files.forEach((filename, i) => { stats[filename] = filestats[i] }))
    )
    .then(() => stats)
}


const deleteEmptyDirectory = denodeify(fs.rmdir)
const deleteFile = denodeify(fs.unlink)

// recursively delete all files and subdirectories from given directory
function deleteDirectory(directory) {
  return readDirectoryStats(directory)
    .then(stats => Promise.all(keys(stats).map(filename => {
      const fullPath = join(directory, filename)
      return stats[filename].isDirectory() ? deleteDirectory(fullPath) : deleteFile(fullPath)
    })))
    .then(() => deleteEmptyDirectory(directory))
}

// JSON file of typescript project
const projectConfig = 'tsconfig.json'
// extensions of files generated from typescript sources 
const generatedExtensions = ['js', 'js.map', 'd.ts']

// collect name and kind of generated files (kind is true for directory, kind is false for regular file)
function determineGenerated(directory) {
  const generatedKinds = Object.create(null)
  return readDirectoryStats(directory)
    // collect source subdirectories
    .then(stats => keys(stats).filter(filename => stats[filename].isDirectory()))
    .then(subs => Promise.all(subs.map(sub => readDirectoryStats(join(directory, sub)).then(stats => {
      // test whether source subdirectory is root of a typescript project
      if (stats[projectConfig] && stats[projectConfig].isFile()) {
        for (const filename in stats) {
          if (stats[filename].isDirectory()) {
            if (filename === basename(filename)) {
              // record name of directory without extension
              generatedKinds[filename] = true
            }
          } else if (stats[filename].isFile() && extname(filename) === '.ts') {
            // record names of generated files from a typescript source file
            const name = basename(filename, '.ts')
            generatedExtensions.forEach(extension => { generatedKinds[name + '.' + extension] = false })
          }
        }
      }
    }))))
    .then(() => generatedKinds)
}

// clean files from output directory that are generated from typescript source projects
function clean(sourceDirectory, outputDirectory) {
  return Promise.all([determineGenerated(sourceDirectory), readDirectoryStats(outputDirectory)])
    .then(([generatedKinds, outputStats]) => {
      // delete generated file or directory when name and kind matches a corresponding source file or directory
      const testSourceMatch = filename =>
        filename in generatedKinds && generatedKinds[filename] === outputStats[filename].isDirectory()
      return Promise.all(keys(outputStats).filter(testSourceMatch).map(filename => {
        const fullPath = join(outputDirectory, filename)
        return generatedKinds[filename] ? deleteDirectory(fullPath) : deleteFile(fullPath)
      }))
    })
}

// link absolute home directory of a package to a 'published' directory in its node_modules subdirectory
function link(packageHome) {
  const { name } = require(join(packageHome, 'package.json'))
  const target = join(packageHome, `node_modules/${name}`)
  // if target already exists, assume it's the required symbolic link/junction
  return stat(target).catch(() => symlink(packageHome, target, 'junction'))
}

module.exports = { compile, clean, link }