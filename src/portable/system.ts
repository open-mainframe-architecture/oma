import * as SystemJS from 'systemjs'

export interface Bundle {

  /**
   * Module path of SystemJS configuration file.
   */
  readonly configuration: string

  /**
   * Is this a foundation bundle with a system implementation?
   */
  readonly system: boolean

  readonly modules: {
    readonly [name: string]: string[]
  }
}

/**
 * Analysis of the modules in a system.
 */
export interface Analysis {

  /**
   * Generate bundle.
   * @param directory The directory where the bundle should be created
   * @param include Names of modules to include
   * @param foundation Mandatory foundation bundle with modules to exclude
   * @param exclude More bundles with modules to exclude
   * @returns A promise to describe the modules in the generated bundle
   */
  generateBundle(directory: string, include: string[], foundation: Bundle, ...exclude: Bundle[]): Promise<Bundle>

  /**
   * Generate executable foundation bundle with system implementation.
   * @param directory The directory where the bundle should be created
   * @param include Names of modules to include
   * @returns A promise to describe the modules in the generated bundle
   */
  generateFoundation(directory: string, include: string[]): Promise<Bundle>

  /**
   * Compute transitive closure of module dependencies.
   * @param include Names of modules to include
   * @returns Set with module names
   */
  traceDependencies(include: string[]): Promise<Set<string>>

}

/**
 * Construct analysis with module path to a SystemJS configuration file.
 */
export type AnalysisConstructor = new (configuration: string) => Analysis

/**
 * Location from where the current system was loaded.
 * The location is a script path in web environments and a module path in Node.js environments.
 */
export const location: string = SystemJS.scriptSrc // undocumented 'feature' of SystemJS