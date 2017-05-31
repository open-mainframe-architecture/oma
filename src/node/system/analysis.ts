import { Analysis, AnalysisConstructor, Bundle } from 'oma/system'

const { stringify } = JSON

import * as path from 'path'

const { join } = path

import * as loop from 'oma/loop'

const { filter, zip } = loop

import * as filesystem from 'oma/local/filesystem'

const { makeDirectories, readFile, writeFile } = filesystem

export default <AnalysisConstructor>class Analysis implements Analysis {

  private builder: SystemBuilder

  private prepareBundle(directory: string, memoryBuild: InMemoryBuild) {
    const modules = memoryBuild.modules
    return Promise.all([Promise.all(modules.map(name => this.traceDependencies([name]))), makeDirectories(directory)])
      .then(([moduleDependencies]) => {
        const bundleModules: { [moduleName: string]: string[] } = {}
        for (const [name, dependencies] of zip(modules.values(), moduleDependencies.values())) {
          bundleModules[name] = [...filter(dependencies.values(), dependency => dependency !== name)]
        }
        return bundleModules
      })
  }

  private writeBundle(directory: string, content: string | Buffer, sourceMap: string, bundleSpecification: Bundle) {
    const filename = join(directory, bundleFilename)
    return Promise.all([
      typeof content === 'string' ? writeFile(filename, content, 'utf8') : writeFile(filename, content),
      writeFile(filename + '.map', sourceMap, 'utf8'),
      writeFile(filename + '.json', stringify(bundleSpecification, void 0, '  '), 'utf8')
    ]).then(() => bundleSpecification)
  }

  constructor(private readonly configuration: string) {
    this.builder = new Builder('.', require.resolve(configuration))
  }

  public generateBundle(directory: string, include: string[], foundation: Bundle, ...exclude: Bundle[]) {
    const expression = include.join(' + ') + ['', ...allModulesFrom(foundation, ...exclude)].join('-')
    return this.builder.bundle(expression, bundleOptions)
      .then(memoryBuild => this.prepareBundle(directory, memoryBuild)
        .then(modules => this.writeBundle(directory, memoryBuild.source, memoryBuild.sourceMap, {
          configuration: this.configuration, system: false, modules
        }))
      )
  }

  public generateFoundation(directory: string, include: string[]) {
    const systemPath = require.resolve('systemjs'), expression = include.join(' + ')
    return Promise.all([
      readFile(systemPath),
      readFile(systemPath + '.map', 'utf8'),
      this.builder.bundle(expression, bundleOptions)
    ]).then(([systemSource, systemSourceMap, memoryBuild]) => {
      const modules = memoryBuild.modules, concat = new Concat(true, bundleFilename)
      concat.add(systemPath, systemSource, <string>systemSourceMap)
      concat.add(null, `
// create a global variable in Node.js, because SystemJS v0.20 only exports its module in CommonJS environments
if(typeof System==="undefined"){global.System=module.exports;module.exports=void 0}
`
      )
      concat.add(null, memoryBuild.source, memoryBuild.sourceMap)
      concat.add(null, `
// bundle epilogue initializes system
System.config({packages:{'':{defaultExtension:'js'}}});
System.set('systemjs',System.newModule({default:System,__useDefault:true}));
Promise.all([${include.map(name => 'System.import(\'' + name + '\')').join(',')}]);
//# sourceMappingURL=${bundleFilename}.map
`
      )
      return this.prepareBundle(directory, memoryBuild)
        .then(modules => {
          modules.systemjs = []
          return this.writeBundle(directory, concat.content, concat.sourceMap, {
            configuration: this.configuration, system: true, modules
          })
        })
    })
  }

  public traceDependencies(include: string[]) {
    return this.builder.trace(include.join(' + '))
      .then(tree => {
        const modules = new Set<string>(include)
        for (const pathName in tree) {
          for (const moduleName in tree[pathName].depMap) {
            modules.add(moduleName)
          }
        }
        return modules
      })
  }
}

// describe interfaces of systemjs builder
interface SystemBuilder {
  bundle(moduleExpression: string, options?: BuildOptions): Promise<InMemoryBuild>
  trace(moduleExpression: string): Promise<ModuleTree>
}
interface InMemoryBuild {
  readonly source: string
  readonly sourceMap: any
  readonly modules: string[]
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
}
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
const bundleFilename = 'bundle.js'

function allModulesFrom(...bundles: Bundle[]) {
  const modules = new Set<string>()
  for (const bundle of bundles) {
    for (const module in bundle.modules) {
      modules.add(module)
    }
  }
  return modules
}
