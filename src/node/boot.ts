import { Incident, Manager } from 'oma/theater'
import { Library, ServiceConfiguration } from 'oma/web'

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const { unlinkSync } = fs
const { join } = path
const { userInfo } = os

import LibraryServant from 'oma/library/servant'

import * as filesystem from 'oma/local/filesystem'
import * as management from 'oma/theater/management'
import * as play from 'oma/theater/play'

const { close, makeDirectories, open, write } = filesystem
const { Loose } = management
const { director, spawn } = play

export default function boot(configuration: ServiceConfiguration) {
  return spawn<Manager>(director, ServiceManager, configuration)
}

class ServiceManager extends Loose<Manager> {

  private library: Library

  private *prepareBootDirectory() {
    const exiting = ['SIGBREAK', 'SIGHUP', 'SIGINT', 'SIGTERM']
    const { exit, pid } = process, { username } = userInfo()
    const { bootDirectory } = this.configuration, lock = join(bootDirectory, 'lock.pid')
    yield makeDirectories(bootDirectory)
    const fd: number = yield open(lock, 'wx')
    process.on('exit', () => unlinkSync(lock))
    for (const signal of exiting) {
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

  public *initialize() {
    const self = this.self, configuration = this.configuration
    const library = this.library = spawn<Library>(self, LibraryServant)
    yield* this.prepareBootDirectory()
    yield library.boot(configuration)
  }
}
