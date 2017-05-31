import { Agent, Forensics, Job, Manager, Story } from 'oma/theater'

const { get } = Reflect

import * as always from 'oma/always'
import * as theater from 'oma/theater'

const { throwError } = always
const { Testimony } = theater

import * as play from 'oma/theater/play'
import * as wait from 'oma/theater/wait'

const { run, spawn } = play
const { anticipation } = wait

/**
 * A stream is an agent which reads and/or writes items.
 */
export interface Stream<In, Out> extends Agent {

  /**
   * Read next item from this stream.
   * @returns Next item
   */
  read(): Job<In>

  /**
   * Write an item on this stream.
   * @param item Item to write
   */
  write(item: Out): Job<void>

}

/**
 * Synthetic production of a stream item.
 */
export type Production<Item> = () => Story<Item>

/**
 * Synthetic consumption of a stream item.
 */
export type Consumption<Item> = (item: Item) => Story<void>

/**
 * Spawn synthetic stream.
 * @param manager Stream manager
 * @param production Item production
 * @param consumption Item consumption
 * @returns New stream
 */
export function synthesize<In, Out>(manager: Manager, production: Production<In>, consumption: Consumption<Out>) {
  return spawn<Stream<In, Out>>(manager, Synthesizer, production, consumption)
}

/**
 * Unique message identifies invocation of a scene method.
 */
export interface Message {

  /**
   * Unique sequence number.
   */
  readonly id: number

}

/**
 * Ask message invokes a scene method.
 */
export interface Ask extends Message {

  /**
   * Selector is scene name.
   */
  readonly selector: string

  /**
   * Scene parameters.
   */
  readonly parameters: any[]

}

/**
 * Reply message conveys result of scene method.
 */
export interface Reply extends Message {

  /**
   * Successful scene result.
   */
  readonly result?: any

  /**
   * Forensics of scene failure.
   */
  readonly forensics?: Forensics

}

/**
 * Either command or control over a message stream.
 */
export type MessageStream = CommandStream | ControlStream

/**
 * Write ask message on command stream and read corresponding reply message afterwards.
 */
export type CommandStream = Stream<Reply, Ask>

/**
 * Read ask message from control stream and write corresponding reply message afterwards.
 */
export type ControlStream = Stream<Ask, Reply>

/**
 * Command an agent over a stream.
 * @param manager Manager of a new commander
 * @param stream Command stream
 * @returns New agent that sends commands over stream
 */
export function command<A extends Agent>(manager: Manager, stream: CommandStream) {
  return spawn<A>(manager, Commander, stream)
}

/**
 * Control an agent over a stream.
 * @param agent Agent to control
 * @param stream Control stream
 */
export function* control(agent: Agent, stream: ControlStream): Story<void> {
  for (; ;) {
    const { id, selector, parameters }: Ask = yield stream.read()
    const asking: Job<void> = yield run<void>(function* ask() {
      let reply: Reply, job: Job<any> = <any>null
      try {
        job = get(agent, selector)(...parameters)
        const result = yield job
        reply = { id, result }
      } catch (problem) {
        const exception = problem instanceof Error ? problem : new Error(problem)
        const forensics = (job || asking).gatherForensics(exception)
        reply = { id, forensics }
      }
      return stream.write(reply)
    })
  }
}

// synthesize stream items
class Synthesizer<In, Out> extends play.Role<Stream<In, Out>> {

  constructor(private production: Production<In>, private consumption: Consumption<Out>) {
    super()
  }

  public read() {
    const production = this.production
    return production()
  }

  public write(item: Out) {
    const consumption = this.consumption
    return consumption(item)
  }

}

// a commander controls an agent on the other side of the stream
class Commander<A extends Agent> extends play.Role<A> {

  private nextId = 0

  private readonly expected: { [numeric: string]: (result: any) => void } = {}

  constructor(private readonly commandStream: CommandStream) {
    super()
  }

  public *improviseStory<T>(selector: string, parameters: any[]): Story<T> {
    const id = this.nextId++, anticipatedResult = anticipation<T>(reveal => { this.expected[id] = reveal })
    yield this.commandStream.write({ id, selector, parameters })
    const result: T = yield anticipatedResult
    return result
  }

  public *initialize(): Story<void> {
    const expected = this.expected, stream = this.commandStream
    yield run<void>(function* replies() {
      for (; ;) {
        const { id, forensics, result }: Reply = yield stream.read()
        const reveal = expected[id] || throwError(`unexpected reply message: ${id}`)
        delete expected[id]
        reveal(forensics ? new Testimony(forensics) : result)
      }
    })
  }

}
