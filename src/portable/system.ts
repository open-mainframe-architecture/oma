const { keys } = Object

import * as SystemJS from 'systemjs'

/**
 * A bundle publishes modules.
 */
export interface Bundle {

  /**
   * Is this a foundation bundle with a System implementation?
   */
  readonly includesSystem: boolean

  /**
   * Timestamp in ISO 8601 format when bundle was published.
   */
  readonly timestamp: string

  /**
   * Digest of bundled sources.
   */
  readonly digest: string

  /**
   * Bundled modules and their dependencies.
   */
  readonly modules: { readonly [name: string]: string[] }

  /**
   * Global variable dependencies.
   */
  readonly globals: { readonly [name: string]: Global }

}

/**
 * Dependency on global variable.
 */
export interface Global {

  /**
   * Package provided by global variable.
   */
  readonly package: string

  /**
   * Path from where package is downloaded.
   */
  readonly path: string

  /**
   * Dependencies to load before this global.
   */
  readonly depends?: string[]

}

/**
 * Path to bundle that loaded SystemJS.
 * It is a script path in web environments and a module path in Node.js environments.
 */
export const bundlePath: string = SystemJS.scriptSrc // undocumented 'feature' of SystemJS

/**
 * Prepare SystemJS for bundle loading.
 * @param home URL to directory where bundles are located
 */
export function setBundlesHome(home: string) {
  // 'register' will become 'system' format in newer versions?
  SystemJS.config({ meta: { [`${home}/*`]: { format: 'register' } } })
}

/**
 * Add bundled modules to system.
 * @param bundleLocation URL to JavaScript file with bundled sources in System.register format
 * @param specification Bundle specification
 */
export function addBundledModules(bundleLocation: string, specification: Bundle) {
  SystemJS.config({
    bundles: {
      [bundleLocation]: keys(specification.modules)
    }
  })
  for (const globalName in specification.globals) {
    const { package: packageName, path, depends } = specification.globals[globalName]
    SystemJS.config({
      map: { [packageName]: path },
      meta: { [packageName]: { format: 'global', exports: globalName, deps: depends ? depends : [] } }
    })
  }
}

/**
 * Import modules from bundles.
 * @param moduleNames Names of modules to import
 * @returns Promise of array with imported modules
 */
export function importModules(moduleNames: string[]) {
  return Promise.all(moduleNames.map(importModule))
}

function importModule(name: string) {
  return SystemJS.import(name)
}