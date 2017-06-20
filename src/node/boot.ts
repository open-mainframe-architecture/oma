import { Express } from 'express'

import { Job, Incident, Manager, Story } from 'oma/theater'
import {
  AddressConfiguration,
  Deploy,
  Library,
  Servants,
  Service,
  ServiceConfiguration,
  Welcome
} from 'oma/web'

import * as fs from 'fs'
import * as https from 'https'
import * as os from 'os'
import * as path from 'path'

const { unlinkSync } = fs
const { join } = path
const { userInfo } = os

import * as express from 'express'

import DeployServant from 'oma/web/deploy'
import LibraryServant from 'oma/web/library'
import WelcomeServant from 'oma/web/welcome'

import * as loop from 'oma/loop'

const { map, values } = loop

import * as filesystem from 'oma/local/filesystem'
import * as management from 'oma/theater/management'
import * as play from 'oma/theater/play'
import * as when from 'oma/theater/when'

const { close, makeDirectories, open, write } = filesystem
const { Loose } = management
const { director, spawn } = play
const { all } = when

export default function boot(configuration: ServiceConfiguration) {
  return spawn<Manager>(director, ServiceManager, configuration)
}

type WebServer = https.Server

class ServiceManager extends Loose<Manager> {

  private servants: Servants

  private frontendServer: https.Server

  private backendServers: https.Server[]

  private *prepareBootDirectory() {
    const { exit, pid } = process, { username } = userInfo()
    const { bootDirectory } = this.configuration, lock = join(bootDirectory, 'lock.pid')
    yield makeDirectories(bootDirectory)
    const fd: number = yield open(lock, 'wx')
    process.on('exit', () => unlinkSync(lock))
    for (const signal of ['SIGBREAK', 'SIGHUP', 'SIGINT', 'SIGTERM'] as NodeJS.Signals[]) {
      process.on(signal, () => {
        console.error(`Exiting after receiving ${signal}`)
        exit(99)
      })
    }
    process.on('uncaughtException', (exception: Error) => {
      console.error('Exiting after uncaught exception %s', exception.stack)
      exit(98)
    })
    yield write(fd, `process ${pid} of user ${username}`)
    yield close(fd)
  }

  constructor(private readonly configuration: ServiceConfiguration) {
    super()
  }

  public *initialize(): Story<void> {
    const self = this.self, configuration = this.configuration
    yield* this.prepareBootDirectory()
    const frontend = createHandler(), backend = createHandler()
    const servants = this.servants = {
      deploy: spawn<Deploy>(self, DeployServant),
      library: spawn<Library>(self, LibraryServant),
      welcome: spawn<Welcome>(self, WelcomeServant)
    }
    yield all([...map<Service, Job<void>>(values(servants), service => service.mount(frontend, backend, configuration))])
    yield all([...map<Service, Job<void>>(values(servants), service => service.cooperate(servants, configuration))])
    if (configuration.backend.length > 0) {
      this.frontendServer = yield createWebServer(configuration.frontend, frontend)
      this.backendServers = yield Promise.all(configuration.backend.map(address => createWebServer(address, backend)))
    } else {
      const combinedService = createHandler()
      combinedService.use(frontend, backend)
      this.backendServers = [this.frontendServer = yield createWebServer(configuration.frontend, combinedService)]
    }
    console.log(`Mainframe running in ${configuration.bootDirectory}`)
    console.log('Frontend:', describeServer(this.frontendServer))
    console.log('Backends:', this.backendServers.map(server => describeServer(server)).join())
  }

}

function createHandler() {
  const handler = express()
  handler.disable('x-powered-by')
  handler.disable('etag')
  return handler
}

function createWebServer(address: AddressConfiguration, handler: Express): Promise<https.Server> {
  const server = https.createServer(require(address.certification).default, handler)
  return new Promise(resolve => server.listen(address.port, address.host, () => resolve(server)))
}

function describeServer(server: https.Server) {
  const bound = server.address()
  return `host ${bound.address} (${bound.family}) port ${bound.port}`
}