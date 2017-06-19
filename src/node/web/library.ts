import { Express } from 'express'

import { Story } from 'oma/theater'
import { Bundle } from 'oma/system'
import { BundleConfiguration, Library, ServantSkeleton, ServiceConfiguration } from 'oma/web'

import { DirectoryContents, ReadData } from 'oma/local/filesystem'

const { parse, stringify } = JSON
const { create, keys } = Object

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const { createHash } = crypto
const { O_RDWR } = fs.constants
const { dirname, join } = path

import * as express from 'express'

import constants from 'oma/constants'

const { bundleFilename, foundationName, navigatorName, serviceHome, staticFiles } = constants

import * as always from 'oma/always'
import * as loop from 'oma/loop'

const { returnNothing } = always
const { iterate, values, zip } = loop

import * as filesystem from 'oma/local/filesystem'

const { access, makeDirectories, readDirectoryContents, readFile, writeFile } = filesystem

export default class LibraryServant extends ServantSkeleton<Library> {

  private readonly bundles: { [name: string]: { [digest: string]: Bundle } } = create(null)

  private builder: SystemBuilder

  private bundleDirectory: string

  private foundationBundle: Bundle

  private navigatorBundle: Bundle

  private excludeExternals(configuration: ServiceConfiguration) {
    for (const bundleConfiguration of values(configuration.mandatoryBundles)) {
      const globals = bundleConfiguration.globals
      for (const globalName in globals) {
        this.builder.config({ meta: { [globals[globalName].package]: { build: false } } })
      }
    }
  }

  private *traceDependencies(memoryBuild: InMemoryBuild) {
    const moduleNames = memoryBuild.modules
    const moduleTrees: ModuleTree[] = yield Promise.all(moduleNames.map(name => this.builder.trace(name)))
    const bundleModules: { [moduleName: string]: string[] } = {}
    for (const [moduleName, moduleTree] of zip(iterate(moduleNames), iterate(moduleTrees))) {
      const dependencies = new Set<string>()
      for (const pathName in moduleTree) {
        for (const name in moduleTree[pathName].depMap) {
          if (name !== moduleName) {
            dependencies.add(name)
          }
        }
      }
      bundleModules[moduleName] = [...dependencies]
    }
    return bundleModules
  }

  private addBundleVersion(bundleName: string, bundleSpecification: Bundle) {
    const bundles = this.bundles, versions = bundles[bundleName] || (bundles[bundleName] = create(null))
    versions[bundleSpecification.digest] = bundleSpecification
  }

  private *attemptReadBundle(bundleName: string, publishDirectory: string) {
    yield access(publishDirectory, O_RDWR)
    const bundleSpecification: Bundle = yield readBundleSpecification(publishDirectory)
    this.addBundleVersion(bundleName, bundleSpecification)
    return bundleSpecification
  }

  private *createFoundationBundle(configuration: ServiceConfiguration) {
    const bundledModules = configuration.mandatoryBundles[foundationName].modules, systemPath = require.resolve('systemjs')
    const [systemSource, systemSourceMap, memoryBuild]: [Buffer, string, InMemoryBuild] = yield Promise.all([
      readFile(systemPath),
      readFile(systemPath + '.map', 'utf8'),
      this.builder.bundle(bundledModules.join(' + '), bundleOptions)
    ])
    const digest = computeDigest(memoryBuild, systemSource), publishDirectory = join(this.bundleDirectory, foundationName, digest)
    try {
      return yield* this.attemptReadBundle(foundationName, publishDirectory)
    } catch (ignore) { }
    const concat = new Concat(true, bundleFilename)
    concat.add(systemPath, systemSource as Buffer, systemSourceMap as string)
    // create a global variable in Node.js, because SystemJS v0.20+ only exports its module in CommonJS environments
    concat.add(null, `
if(typeof System==="undefined"){global.System=module.exports;module.exports=void 0}
System.config({packages:{'':{defaultExtension:'js'}}});
System.registry.set('systemjs',System.newModule({__useDefault:System}));
`)
    concat.add(null, memoryBuild.source, memoryBuild.sourceMap)
    concat.add(null, `
//# sourceMappingURL=${bundleFilename}.map
`)
    const modules: { [moduleName: string]: string[] } = yield* this.traceDependencies(memoryBuild)
    modules.systemjs = []
    const bundleSpecification: Bundle = {
      includesSystem: true, timestamp: new Date().toISOString(), globals: {},
      digest, modules
    }
    yield makeDirectories(publishDirectory)
    yield writeBundle(publishDirectory, concat.content, concat.sourceMap, bundleSpecification)
    this.addBundleVersion(foundationName, bundleSpecification)
    return bundleSpecification
  }

  private *createBundle(configuration: ServiceConfiguration, bundleName: string, include: BundleConfiguration, ...exclude: Bundle[]) {
    const expression = include.modules.join(' + ') + ['', ...allModulesFrom(this.foundationBundle, ...exclude)].join(' - ')
    const memoryBuild: InMemoryBuild = yield this.builder.bundle(expression, bundleOptions)
    const digest = computeDigest(memoryBuild), publishDirectory = join(this.bundleDirectory, bundleName, digest)
    try {
      return yield* this.attemptReadBundle(bundleName, publishDirectory)
    } catch (ignore) { }
    const modules: { [name: string]: string[] } = yield* this.traceDependencies(memoryBuild)
    const bundleSpecification: Bundle = {
      includesSystem: false, timestamp: new Date().toISOString(), globals: include.globals,
      digest, modules
    }
    const source = memoryBuild.source + `
//# sourceMappingURL=${bundleFilename}.map
`
    yield makeDirectories(publishDirectory)
    yield writeBundle(publishDirectory, source, memoryBuild.sourceMap, bundleSpecification)
    this.addBundleVersion(bundleName, bundleSpecification)
    return bundleSpecification
  }

  private *scanAvailableBundles() {
    const bundleDirectory = this.bundleDirectory, bundles = this.bundles
    const directoryContents: DirectoryContents = yield readDirectoryContents(bundleDirectory)
    const bundleDirectories = keys(directoryContents).filter(subdirectory => directoryContents[subdirectory].isDirectory())
    const bundleContents: DirectoryContents[] =
      yield Promise.all(bundleDirectories.map(name => readDirectoryContents(join(bundleDirectory, name))))
    const readBundleSpecifications = []
    for (const [bundleName, directoryContents] of zip(iterate(bundleDirectories), iterate(bundleContents))) {
      const versions = keys(directoryContents).filter(digest =>
        directoryContents[digest].isDirectory() && (!bundles[bundleName] || !bundles[bundleName][digest]))
      const specifications = Promise.all(versions.map(digest => readBundleSpecification(join(bundleDirectory, bundleName, digest))))
      readBundleSpecifications.push(specifications)
    }
    const bundleSpecifications: Bundle[][] = yield Promise.all(readBundleSpecifications)
    for (const [bundleName, specifications] of zip(iterate(bundleDirectories), iterate(bundleSpecifications))) {
      for (const bundleSpecification of specifications) {
        this.addBundleVersion(bundleName, bundleSpecification)
      }
    }
  }

  public *mount(frontend: Express, backend: Express, configuration: ServiceConfiguration): Story<void> {
    const { bootDirectory, bundleSubdirectory } = configuration
    const builder = this.builder = new Builder(dirname(require.resolve('oma')))
    builder.config({
      meta: { systemjs: { build: false } },
      packages: { 'oma/': { defaultExtension: 'js' } },
      paths: { 'oma/*': '*' }
    })
    this.bundleDirectory = join(bootDirectory, bundleSubdirectory)
    this.excludeExternals(configuration)
    this.foundationBundle = yield* this.createFoundationBundle(configuration)
    this.navigatorBundle = yield* this.createBundle(configuration, navigatorName, configuration.mandatoryBundles[navigatorName])
    yield* this.scanAvailableBundles()
    frontend.use(`/${serviceHome}/${staticFiles}`, express.static(this.bundleDirectory, { etag: false, maxAge: '1y' }))
  }

  public mandatoryBundles() {
    return {
      [foundationName]: this.foundationBundle,
      [navigatorName]: this.navigatorBundle
    }
  }

}

// describe interfaces of systemjs builder
interface SystemBuilder {
  config(refinment: { readonly [name: string]: any }): void
  bundle(moduleExpression: string, options?: BuildOptions): Promise<InMemoryBuild>
  trace(moduleExpression: string): Promise<ModuleTree>
}
interface InMemoryBuild {
  readonly source: string
  readonly sourceMap: string
  readonly modules: string[]
  readonly tree: ModuleTree
}
interface BuildOptions {
  readonly sourceMaps?: boolean
  readonly sourceMapContents?: boolean
}
interface BuildResource {
  readonly name: string
}
type ModuleTree = { [pathName: string]: ModuleInfo }
interface ModuleInfo {
  readonly name: string
  readonly depMap: { [moduleName: string]: string }
  readonly source: string
}

// source map concatenation
interface ConcatClass {
  new (generateWithSourceMap: boolean, file: string): Concat
}
interface Concat {
  readonly content: Buffer
  readonly sourceMap: string
  add(file: string | null, content: string | Buffer, sourceMap?: string): void
}

const Builder = require('systemjs-builder')
const Concat: ConcatClass = require('concat-with-sourcemaps')
const bundleOptions = { sourceMaps: true, sourceMapContents: true }

function allModulesFrom(...bundles: Bundle[]) {
  const modules = new Set<string>()
  for (const bundle of bundles) {
    for (const module in bundle.modules) {
      modules.add(module)
    }
  }
  return modules
}

function computeDigest(memoryBuild: InMemoryBuild, ...additionalSources: ReadData[]) {
  const hash = createHash('md5'), tree = memoryBuild.tree
  for (const modulePath of keys(tree).sort()) {
    const moduleInfo = tree[modulePath]
    if (moduleInfo) {
      hash.update(moduleInfo.source)
    }
  }
  for (const source of additionalSources) {
    hash.update(source)
  }
  return hash.digest('hex') // use case-insensitive hex format
}

function readBundleSpecification(directory: string): Promise<Bundle> {
  return readFile(join(directory, bundleFilename + '.json'), 'utf8').then((content: string) => parse(content))
}

function writeBundle(directory: string, content: ReadData, sourceMap: string, bundleSpecification: Bundle) {
  const filename = join(directory, bundleFilename)
  const writeSource = typeof content === 'string' ? writeFile(filename, content, 'utf8') : writeFile(filename, content)
  const writeSourceMap = writeFile(filename + '.map', sourceMap, 'utf8')
  const writeSpecification = writeFile(filename + '.json', stringify(bundleSpecification, void 0, '  '), 'utf8')
  return Promise.all([writeSource, writeSourceMap, writeSpecification]).then(returnNothing)
}
