import * as always from 'oma/always'

const { returnNothing } = always

/**
 * The global scope is the same on all modern JavaScript systems.
 */
export interface GlobalScope {
  ///////////////
  // constants //
  ///////////////
  readonly undefined: undefined
  readonly Infinity: typeof Infinity
  readonly NaN: typeof NaN
  ///////////////
  // functions //
  ///////////////
  readonly eval: typeof eval
  readonly isFinite: typeof isFinite
  readonly isNaN: typeof isNaN
  readonly parseFloat: typeof parseFloat
  readonly parseInt: typeof parseInt
  readonly decodeURI: typeof decodeURI
  readonly decodeURIComponent: typeof decodeURIComponent
  readonly encodeURI: typeof encodeURI
  readonly encodeURIComponent: typeof encodeURIComponent
  //////////////////
  // fundamentals //
  //////////////////
  readonly Object: typeof Object
  readonly Function: typeof Function
  readonly Boolean: typeof Boolean
  readonly Symbol: typeof Symbol
  readonly Error: typeof Error
  readonly EvalError: typeof EvalError
  readonly RangeError: typeof RangeError
  readonly ReferenceError: typeof ReferenceError
  readonly SyntaxError: typeof SyntaxError
  readonly TypeError: typeof TypeError
  readonly URIError: typeof URIError
  ////////////////
  // magnitudes //
  ////////////////
  readonly Number: typeof Number
  readonly Math: typeof Math
  readonly Date: typeof Date
  /////////////////////
  // text processing //
  /////////////////////
  readonly String: typeof String
  readonly RegExp: typeof RegExp
  /////////////////////////
  // arrayed collections //
  /////////////////////////
  readonly Array: typeof Array
  readonly Int8Array: typeof Int8Array
  readonly Uint8Array: typeof Uint8Array
  readonly Uint8ClampedArray: typeof Uint8ClampedArray
  readonly Int16Array: typeof Int16Array
  readonly Uint16Array: typeof Uint16Array
  readonly Int32Array: typeof Int32Array
  readonly Uint32Array: typeof Uint32Array
  readonly Float32Array: typeof Float32Array
  readonly Float64Array: typeof Float64Array
  ///////////////////////
  // keyed collections //
  ///////////////////////
  readonly Map: typeof Map
  readonly Set: typeof Set
  readonly WeakMap: typeof WeakMap
  readonly WeakSet: typeof WeakSet
  /////////////////////
  // structured data //
  /////////////////////
  readonly ArrayBuffer: typeof ArrayBuffer
  readonly DataView: typeof DataView
  readonly JSON: typeof JSON
  ////////////////////
  // asynchronicity //
  ////////////////////
  readonly Promise: typeof Promise
  ////////////////
  // reflection //
  ////////////////
  readonly Reflect: typeof Reflect
  readonly Proxy: typeof Proxy
  //////////////////////////
  // internationalization //
  //////////////////////////
  readonly Intl: typeof Intl
  ///////////////////////////////////////////////
  // console output (not part of es6 standard) //
  ///////////////////////////////////////////////
  readonly console: {
    error(...parameters: any[]): void
  }
  ///////////////////////////////////////
  // timers (not part of es6 standard) //
  ///////////////////////////////////////
  clearInterval(handle: OpaqueTimer): void
  setInterval(handler: (...parameters: any[]) => void, timeout: number, ...parameters: any[]): OpaqueTimer
  clearTimeout(handle: OpaqueTimer): void
  setTimeout(handler: (...parameters: any[]) => void, timeout: number, ...parameters: any[]): OpaqueTimer
  // not universally supported
  clearImmediate?(handle: OpaqueTimer): void
  setImmediate?(handler: (...parameters: any[]) => void, ...parameters: any[]): OpaqueTimer
}

/**
 * Opaque timer handle.
 */
export interface OpaqueTimer { }

/**
 * A Node.js system.
 */
export declare namespace node {
  interface Global extends GlobalScope {
    readonly Buffer: {
      concat(list: Buffer[]): Buffer
    }
    readonly process: Process
    setImmediate(handler: (...parameters: any[]) => void, ...parameters: any[]): OpaqueTimer
  }
  interface Buffer extends Uint8Array { }
  interface Module {
    readonly require: RequireFunction
  }
  interface Process {
    readonly mainModule: Module
    addListener(event: 'message', listener: (data: any) => void): this
    hrtime(time?: [number, number]): [number, number]
    send?(data: any): void
  }
  interface RequireFunction {
    (id: 'child_process'): child_process
    (id: 'http'): http
    (id: string): any
  }
  interface child_process {
    fork(modulePath: string): child_process.ChildProcess
  }
  namespace child_process {
    interface ChildProcess {
      addListener(event: 'message', listener: (data: any) => void): this
      kill(): void
      send(data: any): void
    }
  }
  interface http {
    request(options: http.RequestOptions, cb: (response: http.IncomingMessage) => void): http.ClientRequest
  }
  namespace http {
    interface ClientRequest {
      abort(): void
      end(data?: ArrayBuffer | string): void
      once(event: 'error', listener: (error: Error) => void): this
    }
    interface IncomingMessage {
      readonly headers: { [name: string]: string | string[] }
      readonly statusCode: number
      readonly statusMessage: string
      on(event: 'data', listener: (chunk: Buffer | string) => void): this
      once(event: 'end', listener: () => void): this
      once(event: 'error', listener: (error: Error) => void): this
      setEncoding(format: string): this
    }
    interface RequestOptions {
      readonly auth: string
      readonly headers: { [name: string]: string | string[] }
      readonly hostname: string
      readonly method: string
      readonly path: string
      readonly port: number
    }
  }
}

/**
 * Web covers browsers and workers.
 */
export declare namespace web {
  interface ErrorEvent extends Event {
    readonly message: string
  }
  interface Event { }
  interface Global extends GlobalScope {
    readonly MessageChannel: { new (): MessageChannel }
    readonly XMLHttpRequest: { new (): XMLHttpRequest }
    readonly Worker: { new (location: string): Worker }
    readonly performance?: Performance
  }
  interface MessageChannel {
    readonly port1: MessagePort
    readonly port2: MessagePort
  }
  interface MessageEvent extends Event {
    readonly data: any
  }
  interface MessagePort {
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
    postMessage(data: any): void
    start(): void
  }
  interface Performance {
    now(): number
  }
  interface Worker {
    addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
    postMessage(data: any): void
    terminate(): void
  }
  interface XMLHttpRequest {
    response: null | ArrayBuffer | string
    responseType: 'arraybuffer' | 'text'
    readonly status: number
    readonly statusText: string
    abort(): void
    addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void
    addEventListener(type: 'load', listener: (event: Event) => void): void
    getAllResponseHeaders(): string
    open(method: string, uri: string, asynchronous?: boolean, user?: string, password?: string): void
    send(data?: ArrayBuffer | string): void
    setRequestHeader(header: string, value: string): void
  }
}

/**
 * A web browser system.
 */
export declare namespace browser {
  interface Window extends web.Global {
    readonly performance: web.Performance
  }
}

/**
 * A web worker system.
 */
export declare namespace worker {
  interface WorkerGlobalScope extends web.Global {
    addEventListener(type: 'message', listener: (event: web.MessageEvent) => void): void
    postMessage(data: any): void
  }
}

/**
 * A feature is installed when the test is positive.
 */
export type Feature<T> = {

  /**
   * A boolean test or a numeric flavor mask.
   * The test is positive if the boolean is true or if the mask matches the flavor of this environment.
   */
  readonly when: boolean | number

  /**
   * Obtain feature implementation when the test is postive.
   * @returns Feature implementation
   */
  readonly install: () => T

}

/**
 * Flavor is a bit pattern that identifies a type of JavaScript environments.
 */
export enum Flavor {

  /**
   * This bit is set in Node.js environments.
   */
  Nodejs = 1,

  /**
   * This bit is set in web browser environments.
   */
  WebBrowser = 2,

  /**
   * This bit is set in web worker environments.
   */
  WebWorker = 4,

  /**
   * Bit mask for web environments, either browser or worker.
   */
  Web = WebBrowser | WebWorker,

  /**
   * Bit mask for any JavaScript environments.
   */
  AnyEnvironment = ~0

}

/**
 * A channel connects isolated environments.
 */
export interface Channel<T> {

  /**
   * Install receiver that handles item arrival.
   * @param handler Handler that processes the item that arrived over this channel
   */
  addReceiver(handler: (item: T) => void): void

  /**
   * Send an item over this channel.
   * @param item Item to send
   */
  send(item: T): void

}

/**
 * A channel to a child environment allows the parent to terminate the relationship.
 */
export interface Child<T> extends Channel<T> {

  /**
   * Terminate child environment and release its resources, e.g. memory.
   */
  terminate(): void

}

// the only 'cross platform' pollution in the global namespace is restricted to this module
declare const global: node.Global
declare const window: browser.Window
declare const self: worker.WorkerGlobalScope

// detect flavor of environment (order matters!)
const flavor = detect<Flavor>(
  // global variable 'window' should only be available in web browsers
  { when: typeof window !== 'undefined', install: () => Flavor.WebBrowser },
  // global variable 'self' should be available in web browsers and workers, but not in Node.js
  { when: typeof self !== 'undefined', install: () => Flavor.WebWorker },
  // global variable 'global' is available in Node.js, but it may have been transpiled into a web context as well
  { when: typeof global !== 'undefined', install: () => Flavor.Nodejs }
)

/**
 * Detect first feature whose test is positive.
 * @param features Features to test in order
 * @returns Feature implementation
 * @throws When all tests failed
 */
export function detect<T>(...features: Feature<T>[]) {
  for (const { when, install } of features) {
    if (typeof when === 'boolean' ? when : flavor & when) {
      return install()
    }
  }
  throw new Error('unsupported feature')
}

const globalScope = detect<GlobalScope>(
  { when: Flavor.WebBrowser, install: () => window },
  { when: Flavor.WebWorker, install: () => self },
  { when: Flavor.Nodejs, install: () => global }
)

/**
 * Obtain typed access to the global namespace.
 * Type parameter should match an environment flavor, e.g. scope<kernel.browser.Window>() in web browsers.
 * @returns Global scope
 */
export function scope<T extends GlobalScope>() {
  return <T>globalScope
}

/**
 * Schedule macrotask routine in earliest possible event cycle after current one.
 * @function
 * @param routine Macrotask code
 */
export const asap = detect<(routine: () => void) => void>(
  {
    // setImmediate is preferred implementation (available in Node.js and Edge browser)
    when: !!scope<GlobalScope>().setImmediate, install: () => {
      const { setImmediate } = scope<node.Global>()
      return routine => { setImmediate(routine) }
    }
  }, {
    // web implementation uses a message channel in browsers and workers
    when: Flavor.Web, install: () => {
      const { MessageChannel } = scope<web.Global>(), { port1, port2 } = new MessageChannel(), macrotasks: (() => void)[] = []
      port1.addEventListener('message', () => {
        const routine = <() => void>macrotasks.shift()
        routine()
      })
      port1.start()
      return routine => {
        macrotasks.push(routine)
        port2.postMessage(null)
      }
    }
  }
)

/**
 * Measure uptime as accurately as possible.
 * @function
 * @returns Uptime in seconds
 */
export const uptime = detect<() => number>(
  {
    // implementation in Node.js relies on process.hrtime
    when: Flavor.Nodejs, install: () => {
      const { hrtime } = scope<node.Global>().process, t0 = hrtime()
      return () => {
        const [seconds, nanoseconds] = hrtime(t0)
        return seconds + nanoseconds / 1e9
      }
    }
  }, {
    // performance object is available in browsers and most workers
    when: !!scope<web.Global>().performance, install: () => {
      const { performance } = scope<browser.Window>(), t0 = performance.now()
      return () => (performance.now() - t0) / 1e3
    }
  }, {
    // reference implementation with Date.now() in web workers without performance object
    when: Flavor.AnyEnvironment, install: () => {
      const now = Date.now, t0 = now()
      return () => (now() - t0) / 1e3
    }
  }
)

/**
 * The parent channel connects back to parent environment, if this is a child environment.
 */
export const parentChannel = detect<void | Channel<any>>(
  { when: Flavor.WebBrowser, install: returnNothing },
  {
    when: Flavor.WebWorker, install: () => {
      const { addEventListener, postMessage } = scope<worker.WorkerGlobalScope>()
      return <Channel<any>>{
        addReceiver(handler) { addEventListener('message', event => { handler(event.data) }) },
        send(item) { postMessage(item) }
      }
    }
  },
  {
    when: Flavor.Nodejs, install: () => {
      const { process, process: { send } } = scope<node.Global>()
      if (send) {
        return <Channel<any>>{
          addReceiver(handler) { process.addListener('message', item => { handler(item) }) },
          send(item) { send(item) }
        }
      }
    }
  }
)

/**
 * Bear child environment, which is isolated from this parent environment.
 * @function
 * @param location Location of main module (Node.js) or script (web)
 * @returns Channel to new child environment
 */
export const bearChild = detect<(<T>(location: string) => Child<T>)>(
  {
    when: Flavor.Nodejs, install: () => {
      const child_process = scope<node.Global>().process.mainModule.require('child_process')
      return <T>(location: string) => {
        const child = child_process.fork(location)
        return <Child<T>>{
          addReceiver(handler: (item: T) => void) { child.addListener('message', item => { handler(item) }) },
          send(item) { child.send(item) },
          terminate() { child.kill() }
        }
      }
    }
  },
  {
    when: Flavor.Web, install: () => {
      const { Worker } = scope<web.Global>()
      return <T>(location: string) => {
        const child = new Worker(location)
        return <Child<T>>{
          addReceiver(handler: (item: T) => void) { child.addEventListener('message', event => { handler(event.data) }) },
          send(item) { child.postMessage(item) },
          terminate() { child.terminate() }
        }
      }
    }
  }
)
