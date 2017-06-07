const { keys } = Object

import * as SystemJS from 'systemjs'

/**
 * A bundle publishes modules.
 */
export interface Bundle {

  /**
   * Module path of SystemJS configuration file.
   */
  readonly systemConfiguration: string

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
   * Bundled modules.
   */
  readonly modules: {

    /**
     * Map full path of a module to its module dependencies.
     */
    readonly [name: string]: string[]

  }

}

/**
 * Location from where bundle with SystemJS was loaded.
 * The location is a script path in web environments and a module path in Node.js environments.
 */
export const bundleLocation: string = SystemJS.scriptSrc // undocumented 'feature' of SystemJS

/**
 * Prepare SystemJS for bundle loading.
 * @param home URL to directory where bundles are located
 */
export function setBundlesHome(home: string) {
  // 'register' will become 'system' format?
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
}

/**
 * Import modules from bundles.
 * @param moduleNames Names of modules to import
 * @returns Promise of array with imported modules
 */
export function importModules(moduleNames: string[]) {
  return Promise.all(moduleNames.map(name => SystemJS.import(name)))
}
