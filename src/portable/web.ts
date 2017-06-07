import { Agent, Job } from 'oma/theater'

/**
 * Various constants.
 */
export const constants = {

  /**
   * Name of JavaScript file with bundled modules.
   */
  bundleFilename: 'bundle.js'

}

/**
 * Configure web services of a mainframe.
 */
export interface ServiceConfiguration {

  /**
   * Module path of SystemJS configuration file.
   */
  readonly systemConfiguration: string

  /**
   * Directory where mainframe is booted.
   */
  readonly bootDirectory: string

  /**
   * Name of subdirectory in boot directory where library publishes bundles.
   */
  readonly bundleSubdirectory: string

  /**
   * Name of mandatory foundation bundle.
   */
  readonly foundationName: string

  /**
   * Paths of modules to include in foundation bundle. This cannot contain wildcards.
   */
  readonly foundationModules: string[]

  /**
   * Name of mandatory navigator bundle.
   */
  readonly navigatorName: string


  /**
   * Paths of modules to include in navigator bundle. This may contain wildcards.
   */
  readonly navigatorModules: string[]

}

/**
 * A service agent.
 */
export interface Service extends Agent {

  /**
   * Boot this service.
   * @param configuration Service configuration
   */
  boot(configuration: ServiceConfiguration): Job<void>

}

export interface Library extends Service {
}

export interface Welcome extends Service {
}