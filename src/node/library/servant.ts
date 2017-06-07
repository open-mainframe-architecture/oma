import { Story } from 'oma/theater'
import { Bundle } from 'oma/system'
import { Library, ServiceConfiguration } from 'oma/web'
import { DirectoryContents, ReadData } from 'oma/local/filesystem'
import { Role } from 'oma/theater/play'

const { parse, stringify } = JSON
const { create, keys } = Object

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

const { createHash } = crypto
const { O_RDWR } = fs.constants
const { join } = path

import * as always from 'oma/always'
import * as loop from 'oma/loop'
import * as web from 'oma/web'

const { returnNothing } = always
const { iterate, zip } = loop
const { bundleFilename } = web.constants

import * as filesystem from 'oma/local/filesystem'

const { access, makeDirectories, readDirectoryContents, readFile, writeFile } = filesystem

export default class LibraryServant extends Role<Library> {

  private configuration: ServiceConfiguration

  private builder: SystemBuilder

  private bundleDirectory: string

  private foundationBundle: Bundle

  private navigatorBundle: Bundle

  private readonly bundles: { [name: string]: { [digest: string]: Bundle } } = create(null)

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

  private *createFoundationBundle() {
    const { systemConfiguration, foundationName, foundationModules } = this.configuration
    const systemPath = require.resolve('systemjs')
    const [systemSource, systemSourceMap, memoryBuild]: [Buffer, string, InMemoryBuild] = yield Promise.all([
      readFile(systemPath),
      readFile(systemPath + '.map', 'utf8'),
      this.builder.bundle(foundationModules.join(' + '), bundleOptions)
    ])
    const digest = computeDigest(memoryBuild, systemSource), publishDirectory = join(this.bundleDirectory, foundationName, digest)
    try {
      return yield* this.attemptReadBundle(foundationName, publishDirectory)
    } catch (ignore) { }
    const concat = new Concat(true, bundleFilename)
    concat.add(systemPath, systemSource as Buffer, systemSourceMap as string)
    concat.add(null, `
// create a global variable in Node.js, because SystemJS v0.20+ only exports its module in CommonJS environments
if(typeof System==="undefined"){global.System=module.exports;module.exports=void 0}
`)
    concat.add(null, memoryBuild.source, memoryBuild.sourceMap)
    concat.add(null, `
// bundle epilogue initializes SystemJS
System.config({packages:{'':{defaultExtension:'js'}}});
System.set('systemjs',System.newModule({__useDefault:System}));
${foundationModules.map(name => 'System.import(\'' + name + '\')').join(';')};
//# sourceMappingURL=${bundleFilename}.map
`)
    const modules: { [moduleName: string]: string[] } = yield* this.traceDependencies(memoryBuild)
    modules.systemjs = []
    const bundleSpecification: Bundle = {
      systemConfiguration,
      includesSystem: true,
      timestamp: new Date().toISOString(),
      digest, modules
    }
    yield makeDirectories(publishDirectory)
    yield writeBundle(publishDirectory, concat.content, concat.sourceMap, bundleSpecification)
    this.addBundleVersion(foundationName, bundleSpecification)
    return bundleSpecification
  }

  private *createBundle(bundleName: string, include: string[], ...exclude: Bundle[]) {
    const { systemConfiguration } = this.configuration
    const expression = include.join(' + ') + ['', ...allModulesFrom(this.foundationBundle, ...exclude)].join(' - ')
    const memoryBuild: InMemoryBuild = yield this.builder.bundle(expression, bundleOptions)
    const digest = computeDigest(memoryBuild), publishDirectory = join(this.bundleDirectory, bundleName, digest)
    try {
      return yield* this.attemptReadBundle(bundleName, publishDirectory)
    } catch (ignore) { }
    const modules: { [name: string]: string[] } = yield* this.traceDependencies(memoryBuild)
    const bundleSpecification: Bundle = {
      systemConfiguration,
      includesSystem: false,
      timestamp: new Date().toISOString(),
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

  private *bootBundles() {
    const { bootDirectory, bundleSubdirectory, navigatorName, navigatorModules } = this.configuration
    const bundleDirectory = this.bundleDirectory = join(bootDirectory, bundleSubdirectory)
    this.foundationBundle = yield* this.createFoundationBundle()
    this.navigatorBundle = yield* this.createBundle(navigatorName, navigatorModules)
    const bundles = this.bundles
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

  public *boot(configuration: ServiceConfiguration): Story<void> {
    const { systemConfiguration } = this.configuration = configuration
    this.builder = new Builder('.', require.resolve(systemConfiguration))
    yield* this.bootBundles()
  }
}

// describe interfaces of systemjs builder
interface SystemBuilder {
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
  for (const modulePath of keys(tree).filter(modulePath => modulePath.indexOf('systemjs') < 0).sort()) {
    hash.update(tree[modulePath].source)
  }
  for (const source of additionalSources) {
    hash.update(source)
  }
  return hash.digest('base64').replace(/=*$/, '').replace(/\//g, '-').replace(/\+/g, '_')
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
