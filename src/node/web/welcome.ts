import { Express, Request } from 'express'

import { Launch } from 'oma/isolate'
import { Bundle } from 'oma/system'
import { Story } from 'oma/theater'
import { Deployment, NavigatorInfo } from 'oma/type'
import { Deploy, ServantSkeleton, Servants, ServiceConfiguration, Welcome } from 'oma/web'

const { stringify } = JSON
const { max } = Math

import * as crypto from 'crypto'

const { createHash } = crypto

import * as bodyParser from 'body-parser'
import * as httpStatusCodes from 'http-status-codes'

const { NOT_ACCEPTABLE } = httpStatusCodes

import constants from 'oma/constants'

const {
  addNavigator,
  bundleFilename,
  cacheMaxAge,
  foundationName,
  navigatorElement,
  navigatorName,
  resetElement,
  serviceHome,
  staticFiles
} = constants

import * as security from 'oma/security'
import * as tracking from 'oma/tracking'
import * as web from 'oma/web'

const { authenticate } = security
const { trace } = tracking
const { bake, local } = web

import * as filesystem from 'oma/local/filesystem'

const { readFile } = filesystem

export default class WelcomeServant extends ServantSkeleton<Welcome> {

  private foundationPath: string

  private navigatorInitiation: string

  private resetStylePath: string

  private navigatorStylePath: string

  private terminalStylePath: string

  private iconPath: string

  private deploy: Deploy

  private *mountWelcomeSupport(frontend: Express, configuration: ServiceConfiguration) {
    const [resetSheet, navigatorSheet, terminalSheet, icon]: Buffer[] = yield Promise.all([
      readFile(require.resolve('oma/asset/reset.css')),
      readFile(require.resolve('oma/asset/navigator.css')),
      readFile(require.resolve('oma/asset/terminal.css')),
      readFile(require.resolve('oma/asset/compass.png'))
    ])
    const cachedCss = { 'Content-Type': 'text/css', 'Cache-Control': `public, max-age=${cacheMaxAge}` }
    const cachedPng = { 'Content-Type': 'image/png', 'Cache-Control': `public, max-age=${cacheMaxAge}` }
    const resetStylePath = this.resetStylePath = `${serviceHome}/css/${computeDigest(resetSheet)}/reset`
    frontend.get(`/${resetStylePath}`, (request, response) => {
      response.set(cachedCss)
      response.end(resetSheet)
    })
    const navigatorStylePath = this.navigatorStylePath = `${serviceHome}/css/${computeDigest(navigatorSheet)}/navigator`
    frontend.get(`/${navigatorStylePath}`, (request, response) => {
      response.set(cachedCss)
      response.end(navigatorSheet)
    })
    const terminalStylePath = this.terminalStylePath = `${serviceHome}/css/${computeDigest(terminalSheet)}/terminal`
    frontend.get(`/${terminalStylePath}`, (request, response) => {
      response.set(cachedCss)
      response.end(terminalSheet)
    })
    const iconPath = this.iconPath = `${serviceHome}/i/${computeDigest(icon)}/favicon`
    frontend.get(`/${iconPath}`, (request, response) => {
      response.set(cachedPng)
      response.end(icon)
    })
    const scope = local({ configuration }), embody = bodyParser.json()
    frontend.post(`/${serviceHome}/${addNavigator}`, scope, embody, bake, trace, authenticate, (request, response) => {
      console.log(request.body)
      const info: NavigatorInfo = {
        id: 'generatedId',
        terminalStylePath: this.terminalStylePath
      }
      response.type('json')
      response.end(stringify(info))
    })
  }

  private hello(request: Request) {
    return `<!doctype html>
<html>
  <head>
    <base href="./${'../'.repeat(max(request.path.split('/').length - 2, 0))}">
    <script>document.querySelector('base').setAttribute('href',document.baseURI)</script>
    <link href="${this.resetStylePath}" rel="stylesheet" id="${resetElement}">
    <link href="${this.navigatorStylePath}" rel="stylesheet">
    <link href="${this.iconPath}" rel="icon">
  </head>
  <body>
    <div id="${navigatorElement}"></div>
    <script src="${this.foundationPath}"></script>
    <script>System.import('oma/isolate').then(isolate=>isolate.environment.initiate(${this.navigatorInitiation}))</script>
  </body>
</html>`
  }

  public *mount(frontend: Express, backend: Express, configuration: ServiceConfiguration): Story<void> {
    yield* this.mountWelcomeSupport(frontend, configuration)
    frontend.get(new RegExp(`^\\/(?!${serviceHome}\\/).*$`), (request, response) => {
      if (request.accepts('text/html')) {
        response.send(this.hello(request))
      } else {
        response.status(NOT_ACCEPTABLE).end()
      }
    })
  }

  public *cooperate(servants: Servants, configuration: ServiceConfiguration): Story<void> {
    const mandatory: { readonly [name: string]: Bundle } = yield servants.library.mandatoryBundles()
    this.foundationPath = `${serviceHome}/${staticFiles}/${foundationName}/${mandatory[foundationName].digest}/${bundleFilename}`
    this.navigatorInitiation = stringify({
      staticHome: `${serviceHome}/${staticFiles}`,
      bundles: {
        [navigatorName]: mandatory[navigatorName]
      },
      mainModules: ['oma/navigator']
    } as Launch)
    this.deploy = servants.deploy
  }

}

function computeDigest(data: Buffer) {
  return createHash('md5').update(data).digest('hex')
}