import { Stats } from 'fs'

const { create } = Object

import * as fs from 'fs'
import * as path from 'path'

const { dirname, join } = path

import denodeify from 'oma/denodeify'

export type ReadData = string | Buffer
export type ReadOptions = string | { encoding: string, flag?: string } | { flag: string }
export type WriteData = string | Buffer | Uint8Array
export type WriteOptions = string | { encoding?: string, flag?: string, mode?: number }

export type DirectoryContents = { readonly [filename: string]: Stats }

export const access = denodeify<(filename: string, mode?: number) => Promise<void>>(fs.access)
export const peekFile = denodeify<(filename: string) => Promise<fs.Stats>>(fs.stat)
export const readFile = denodeify<(filename: string, options?: ReadOptions) => Promise<ReadData>>(fs.readFile)
export const writeFile = denodeify<(filename: string, data: WriteData, options?: WriteOptions) => Promise<void>>(fs.writeFile)

export const open = denodeify<(filename: string, flags: string | number, mode?: number) => Promise<number>>(fs.open)
export const write = denodeify<(fd: number, content: Buffer | string) => Promise<number>>(fs.write)
export const close = denodeify<(fs: number) => Promise<void>>(fs.close)

export const makeDirectory = denodeify<(directory: string, mode?: number) => Promise<void>>(fs.mkdir)
export const readDirectory = denodeify<(directory: string) => Promise<string[]>>(fs.readdir)

export const stat = denodeify<(filename: string) => Promise<Stats>>(fs.stat)

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