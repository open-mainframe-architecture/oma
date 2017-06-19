import { Shape, Universe, Value } from 'oma/data'
import { Agent, Cue, Forensics, Job, Manager, Story } from 'oma/theater'

const { isArray } = Array
const { parse, stringify } = JSON

import * as always from 'oma/always'
import * as data from 'oma/data'
import * as kernel from 'oma/kernel'
import * as loop from 'oma/loop'
import * as theater from 'oma/theater'

const { throwError } = always
const { isValuable } = data
const { detect, scope } = kernel
const { entries } = loop
const { Testimony } = theater

import * as play from 'oma/theater/play'
import * as wait from 'oma/theater/wait'

const { Role, spawn } = play
const { AbstractCue, employment } = wait

export interface URI {
  readonly scheme: string
  readonly user: string
  readonly password: string
  readonly host: string
  readonly port: string
  readonly path: string[]
  readonly query: [string, string][]
  readonly fragment: string
}

export type Body = ArrayBuffer | string
export type Headers = [string, string][]

export interface Message {
  readonly headers?: Headers
  readonly body?: Body
}

export interface Request extends Message {
  readonly method: string
  readonly uri: URI
}

export interface Response extends Message {
  readonly code: number
  readonly status?: string
}

export function createURI(partial: Partial<URI>): URI {
  return {
    scheme: partial.scheme || '',
    user: partial.user || '',
    password: partial.password || '',
    host: partial.host || '',
    port: partial.port || '',
    path: partial.path || [],
    query: partial.query || [],
    fragment: partial.fragment || ''
  }
}

export function decodeURI(input: string): URI | undefined {
  const parts = uriPattern.exec(input)
  if (parts) {
    const authority = parts[2] && authorityPattern.exec(parts[2])
    if (!parts[2] || authority) {
      const scheme = parts[1] && decode(parts[1])
      const user = authority && authority[1] ? decode(authority[1]) : ''
      const password = authority && authority[2] ? decode(authority[2]) : ''
      const host = authority && authority[3] ? decode(authority[3]) : ''
      const port = authority && authority[4] ? decode(authority[4]) : ''
      const path = parts[3] ? parts[3].split('/').map(decode) : []
      const query = parts[4] ? parts[4].split('&').map(decodeParameter) : []
      const fragment = parts[5] && decode(parts[5])
      return { scheme, user, password, host, port, path, query, fragment }
    }
  }
}

export function encodeURI(uri: URI) {
  const output = []
  if (uri.scheme) {
    output.push(encode(uri.scheme), ':')
  }
  if (uri.scheme || uri.host) {
    output.push('//')
  }
  if (uri.host) {
    if (uri.user) {
      output.push(encode(uri.user), '@')
    }
    output.push(encode(uri.host), uri.port ? ':' : '', uri.port)
  }
  if (uri.path.length) {
    output.push(uri.path.map(encode).join('/'))
  }
  if (uri.query.length) {
    output.push('?', uri.query.map(encodeParameter).join('&'))
  }
  if (uri.fragment) {
    output.push('#', uri.fragment)
  }
  return output.join('')
}

export function get(location: string | URI, binary?: boolean) {
  return send({ method: 'GET', uri: validateURI(location) }, binary)
}

export function post(location: string | URI, body?: Body, binary?: boolean) {
  return send({ body, method: 'POST', uri: validateURI(location) }, binary)
}

export function send(request: Request, binary = false): Cue<Response> {
  return new SendRequest(request, binary)
}

export function sink<A extends Agent>(manager: Manager, location: string | URI, universe: Universe) {
  return spawn<A>(manager, Sink, location, universe)
}

export function rise(agent: Agent, universe: Universe) {
  const { get } = Reflect
  const unmarshaller = (shape: Shape) => universe.unmarshal(shape)
  return function* (request: Request): Story<Response> {
    let body: RiseBody, job: Job<any> = yield employment()
    try {
      const { selector, parameters: shapes }: SinkBody = parse(<string>request.body)
      job = get(agent, selector)(...shapes.map(unmarshaller))
      const value: Value = yield job
      if (!isValuable(value)) {
        throw new Error('remote agent should produce valuable result')
      }
      body = { result: universe.marshal(value) }
    } catch (problem) {
      const exception = problem instanceof Error ? problem : new Error(problem)
      const forensics = job.gatherForensics(exception)
      body = { forensics }
    }
    return { code: 200, body: stringify(body) } as Response
  }
}

interface SinkBody {
  readonly selector: string
  readonly parameters: Shape[]
}
interface RiseBody {
  readonly result?: Shape
  readonly forensics?: Forensics
}

class Sink<A extends Agent> extends Role<A>  {

  private readonly uri: URI

  private readonly marshaller: (value: Value) => Shape

  constructor(location: string | URI, private readonly universe: Universe) {
    super()
    this.uri = validateURI(location)
    this.marshaller = (value: Value) => universe.marshal(value)
  }

  public *improviseStory<T>(selector: string, values: Value[]): Story<T> {
    if (!values.every(isValuable)) {
      throw new Error('remote agent expects valuable parameters')
    }
    const response: Response = yield send({
      method: 'POST',
      uri: this.uri,
      headers: [['Accept', 'application/json'], ['Content-Type', 'application/json']],
      body: stringify({ selector, parameters: values.map(this.marshaller) } as SinkBody)
    })
    const { result, forensics }: RiseBody = parse(<string>response.body)
    return forensics ? new Testimony(forensics) : this.universe.unmarshal(<Shape>result)
  }

}

const decode = decodeURIComponent
const encode = encodeURIComponent

const uriPattern = /^(?:([^:/?#]+):)?(?:\/\/([^/?#]*))?([^?#]+)?(?:\?([^#]*))?(?:#(.*))?$/
const authorityPattern = /^(?:([^:]+)(?::(.*))@)?([^:]+)(?::([0-9]{1,5}))?$/

function validateURI(location: string | URI) {
  return typeof location === 'string' ? decodeURI(location) || throwError('bad URI') : location
}

function decodeParameter(parameterPair: string) {
  return parameterPair.split('=').map(decode) as [string, string]
}
function encodeParameter([name, value]: [string, string]) {
  return `${encode(name)}=${encode(value)}`
}

const SendRequest = detect<new (request: Request, binary: boolean) => Cue<Response>>(
  {
    when: kernel.Flavor.Nodejs, install: () => class SendRequest extends AbstractCue<Response> {
      private clientRequest: kernel.node.http.ClientRequest
      constructor(private readonly request: Request, binary: boolean) {
        super()
        const { uri } = request, parameters: string[] = [], headers: { [name: string]: string } = {}
        for (const pair of uri.query) {
          parameters.push(encodeParameter(pair))
        }
        if (request.headers) {
          for (const [name, value] of request.headers) {
            headers[name] = headers[name] ? headers[name] + ', ' + value : value
          }
        }
        const options: kernel.node.http.RequestOptions = {
          hostname: uri.host, port: parseInt(uri.port),
          method: request.method,
          path: uri.path.map(encode).join('/') + (parameters.length ? '?' : '') + parameters.join('&'),
          headers: headers,
          auth: uri.user ? encode(uri.user) + (uri.password ? ':' : '') + encode(uri.password) : ''
        }
        const { Buffer, process: { mainModule } } = scope<kernel.node.Global>()
        const chunks: (kernel.node.Buffer | string)[] = [], handleChunk = chunks.push.bind(chunks)
        const handleError = (error: Error) => this.ignite(void 0, error)
        const handleResponse = (response: kernel.node.http.IncomingMessage) => {
          if (!binary) {
            response.setEncoding('utf8')
          }
          response.on('data', handleChunk).once('error', handleError).once('end', () => {
            const headers: Headers = []
            if (response.headers) {
              for (const [name, value] of entries(response.headers)) {
                if (isArray(value)) {
                  for (const singleValue of value) {
                    headers.push([name, singleValue])
                  }
                } else {
                  headers.push([name, value])
                }
              }
            }
            const body = binary ? new Uint8Array(Buffer.concat(<kernel.node.Buffer[]>chunks)).buffer : chunks.join('')
            this.ignite({ code: response.statusCode, status: response.statusMessage, headers, body })
          })
        }
        const protocol = uri.scheme === 'https' ? <'http'>'https' : 'http'
        this.clientRequest = mainModule.require(protocol).request(options, handleResponse).once('error', handleError)
      }
      protected begin() {
        this.clientRequest.end(this.request.body)
      }
      protected end(discharged: boolean) {
        if (discharged) {
          this.clientRequest.abort()
        }
        return super.end(discharged)
      }
    }
  }, {
    when: kernel.Flavor.Web, install: () => class SendRequest extends AbstractCue<Response> {
      private readonly xhr: kernel.web.XMLHttpRequest
      constructor(private readonly request: Request, binary: boolean) {
        super()
        const { XMLHttpRequest } = scope<kernel.web.Global>()
        const { uri: { scheme, user, password, host, port, path, query } } = request
        const uri = { scheme, host, port, path, query, user: '', password: '', fragment: '' }
        const xhr = this.xhr = new XMLHttpRequest()
        xhr.open(request.method, encodeURI(uri), true, user, password)
        xhr.responseType = binary ? 'arraybuffer' : 'text'
        if (request.headers) {
          for (const [name, value] of request.headers) {
            xhr.setRequestHeader(name, value)
          }
        }
        xhr.addEventListener('error', event => this.ignite(void 0, new Error(event.message)))
        xhr.addEventListener('load', (event) => {
          const headers: Headers = []
          for (const headerPair of xhr.getAllResponseHeaders().split('\r\n')) {
            const colonIndex = headerPair.indexOf(':')
            if (colonIndex > 0) {
              const name = headerPair.substring(0, colonIndex).trim()
              const value = headerPair.substring(colonIndex + 1).trim()
              headers.push([name, value])
            }
          }
          this.ignite({ code: xhr.status, status: xhr.statusText, headers, body: <Body>xhr.response })
        })
      }
      protected begin() {
        this.xhr.send(this.request.body)
      }
      protected end(discharged: boolean) {
        if (discharged) {
          this.xhr.abort()
        }
        return super.end(discharged)
      }
    }
  })