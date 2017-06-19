import { Express, NextFunction, Request, RequestHandler, Response } from 'express'

const { create } = Object

import { Bundle, Global } from 'oma/system'
import { Agent, Job } from 'oma/theater'
import { Deployment } from 'oma/type'

import { Role } from 'oma/theater/play'

import * as loop from 'oma/loop'

const { entries } = loop

/**
 * Persistent cookies.
 */
export type CookieJar = { readonly [name: string]: string }

/**
 * Configure services of a mainframe.
 */
export interface ServiceConfiguration {

  /**
   * Module path of SystemJS builder configuration file.
   */
  readonly systemBuilderConfiguration: string

  /**
   * Directory where mainframe is booted.
   */
  readonly bootDirectory: string

  /**
   * Address where frontend server is listening.
   */
  readonly frontend: AddressConfiguration

  /**
   * Zero or more addresses of backend servers.
   */
  readonly backend: AddressConfiguration[]

  /**
   * Number of weeks that device cookie should persist after last visit.
   */
  readonly devicePersistence: number

  /**
   * Name of subdirectory in boot directory where library publishes bundles.
   */
  readonly bundleSubdirectory: string

  /**
   * Mandatory bundles to boot with.
   */
  readonly mandatoryBundles: { readonly [bundleName: string]: BundleConfiguration }

}

/**
 * Configuration of web server address.
 */
export interface AddressConfiguration {

  /**
   * Server host in IPv4 or IPv6 format.
   */
  readonly host: string

  /**
   * Server port number.
   */
  readonly port: number

  /**
   * Module path where secure web server options are exported.
   */
  readonly certification: string

}

/**
 * Bundled modules and dependencies.
 */
export interface BundleConfiguration {

  /**
   * Bundled modules.
   */
  readonly modules: string[]

  /**
   * External dependencies are provided by global variables.
   */
  readonly globals: { readonly [name: string]: Global }

}

/**
 * A service agent.
 */
export interface Service extends Agent {

  /**
   * Mount this service under the web server.
   * @param frontend Frontend HTTP handler
   * @param backend Backend HTTP handler
   * @param configuration Service configuration
   */
  mount(frontend: Express, backend: Express, configuration: ServiceConfiguration): Job<void>

  /**
   * Cooperate with other servants. Cooperation starts after all services have been mounted.
   * @param servants Servants provide services, including this one
   */
  cooperate(servants: Servants, configuration: ServiceConfiguration): Job<void>

}

export interface Library extends Service {

  /**
   * Obtain info about mandatory bundles, e.g. foundation and navigator bundle.
   * @returns Mapping from name to bundle
   */
  mandatoryBundles(): Job<{ readonly [name: string]: Bundle }>

}

export interface Welcome extends Service {

  /**
   * Generate welcome response.
   * @param request Incoming HTTP request
   * @returns HTML source
   */
  hello(request: Request): Job<string>

}

export interface Deploy extends Service {

  /**
   * Determine the application to show for given welcome request.
   * @param request Incoming HTTP request
   * @returns Application deployment
   */
  findDeploymentTarget(request: Request): Job<Deployment>

}

export interface Servants {
  readonly deploy: Deploy
  readonly library: Library
  readonly welcome: Welcome
}

export class ServantSkeleton<S extends Service> extends Role<S> {

  public mount(frontend: Express, backend: Express, configuration: ServiceConfiguration) { }

  public cooperate(servants: Servants, configuration: ServiceConfiguration) { }

}

export function bake(request: Request, response: Response, next: NextFunction) {
  const cookieHeader = request.headers.cookie as string | undefined, jar = create(null)
  response.locals.jar = cookieHeader ? cookieHeader.split(';').map(splitCookie).reduce(collectCookies, jar) : jar
  next()
}

export function local(goodies: { readonly [name: string]: any }): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    const locals = response.locals
    for (const [name, goodie] of entries(goodies)) {
      locals[name] = goodie
    }
    next()
  }
}

function splitCookie(pair: string) {
  return pair.trim().split('=')
}

function collectCookies(jar: { [name: string]: string }, [name, value]: [string, string]) {
  jar[name] = value
  return jar
}
