import { Stats } from 'fs'

const { create } = Object

import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

const { dirname, join } = path
const { promisify } = util

export type ReadData = string | Buffer
export type ReadOptions = string | { encoding: string, flag?: string } | { flag: string }
export type WriteData = string | Buffer | Uint8Array
export type WriteOptions = string | { encoding?: string, flag?: string, mode?: number }

export type DirectoryContents = { readonly [filename: string]: Stats }

export const access = promisify(fs.access) as (filename: string, mode?: number) => Promise<void>
export const peekFile = promisify(fs.stat) as (filename: string) => Promise<fs.Stats>
export const readFile = promisify(fs.readFile) as (filename: string, options?: ReadOptions) => Promise<ReadData>
export const writeFile = promisify(fs.writeFile) as (filename: string, data: WriteData, options?: WriteOptions) => Promise<void>

export const open = promisify(fs.open) as (filename: string, flags: string | number, mode?: number) => Promise<number>
export const write = promisify(fs.write) as (fd: number, content: Buffer | string) => Promise<number>
export const close = promisify(fs.close) as (fs: number) => Promise<void>

export const makeDirectory = promisify(fs.mkdir) as (directory: string, mode?: number) => Promise<void>
export const readDirectory = promisify(fs.readdir) as (directory: string) => Promise<string[]>

export const stat = promisify(fs.stat) as (filename: string) => Promise<Stats>

export function makeDirectories(directory: string, mode?: number): Promise<void> {
  return peekFile(directory)
    .then(stats => {
      // ensure there is an existing directory
      if (!stats.isDirectory()) {
        throw new Error(`cannot make directory ${directory}, because it is already an existing file`)
      }
    }, reason => {
      if (reason.code === 'ENOENT') {
        // if directory name does not exist, create new directory after parent directories have been created 
        return makeDirectories(dirname(directory)).then(() => makeDirectory(directory, mode))
      } else {
        throw reason
      }
    })
}

export function readDirectoryContents(directory: string): Promise<DirectoryContents> {
  const stats: { [filename: string]: Stats } = create(null)
  return readDirectory(directory)
    .then(files => Promise.all(files.map(filename => stat(join(directory, filename))))
      .then(filestats => files.forEach((filename, i) => { stats[filename] = filestats[i] }))
    )
    .then(() => stats)
}