import { CommandStream, ControlStream, Message, MessageStream } from 'oma/io'
import { Channel, Child } from 'oma/kernel'
import { Forensics, Hint, Job, Manager, Story } from 'oma/theater'
import { Queue } from 'oma/theater/wait'

const { assign } = Object

import * as always from 'oma/always'
import * as io from 'oma/io'
import * as kernel from 'oma/kernel'
import * as system from 'oma/system'

const { returnNothing, throwError } = always
const { command, control, synthesize } = io
const { bearChild, parentChannel } = kernel
const { location } = system

import * as management from 'oma/theater/management'
import * as news from 'oma/theater/news'
import * as play from 'oma/theater/play'
import * as wait from 'oma/theater/wait'

const { Loose } = management
const { addOutlet } = news
const { director, run, report, spawn } = play
const { queue } = wait

/**
 * An isolated environment cannot share objects with other environments.
 */
export interface Environment extends Manager {

}

/**
 * A subsidiary represents a child environment.
 */
export interface Subsidiary extends Manager {

  /**
   * Brief about problem in the child environment.
   * @param forensics Forensics in child environment
   */
  brief(forensics: Forensics): Job<void>

  /**
   * Post initialize acknowledges an initialized child environment.
   */
  postInitialize(): Job<void>

}


/**
 * The isolated environment of this JavaScript system.
 */
export const environment = spawn<Environment>(director, class $Environment extends Loose<Environment> {

  // command/control mirror of switchboard in subsidiary
  private parentSwitchboard: Switchboard

  // control subsidiary in parent environment
  private parentSubsidiary: Subsidiary

  public *initialize(): Story<void> {
    if (parentChannel) {
      const self = this.self
      const switchboard = this.parentSwitchboard = new Switchboard(parentChannel)
      // command subsidiary agent in parent environment
      const subsidiaryCommand = switchboard.open<CommandStream>(self, subsidiaryLine)
      const subsidiary = this.parentSubsidiary = command<Subsidiary>(self, subsidiaryCommand)        
      // deliver forensics to subsidiary in parent
      addOutlet(forensics => { subsidiary.brief(forensics).run() })
      // allow parent to control this child environment
      const parentalControl = switchboard.open<ControlStream>(self, environmentLine)
      yield run<void>(function controlling() { return control(self, parentalControl) })
      // acknowledge initialization
      return subsidiary.postInitialize()
    }
  }

})

/**
 * Hatch a new subsidiary environment.
 * @param manager Manager of new subsidiary
 * @param description Descriptive name of subsidiary, e.g. for tracking problems in child environments.
 * @returns A subsidiary agent
 */
export function hatch(manager: Manager, description: string) {
  return spawn<Subsidiary>(manager, $Subsidiary, description)
}

// switchboard multiplexes command and control streams over a channel
class Switchboard {

  // every line has its own queue with unread messages
  private readonly lines: { [numeric: string]: Queue<Message> } = {}

  // construct switchboard with channel to another environment
  constructor(private channel: Channel<[number, Message]>) {
    const lines = this.lines
    function receive([line, message]: [number, Message]) {
      const unread = lines[line] || throwError(`cannot receive over unused line ${line} on switchboard`)
      unread.enqueue(message)
    }
    channel.addReceiver(receive)
  }

  // open command or control stream over a line in this switchboard
  public open<T extends MessageStream>(manager: Manager, line: number) {
    const lines = this.lines, channel = this.channel
    if (lines[line]) {
      throw Error(`line ${line} is already in use on switchboard`)
    }
    const unread = lines[line] = queue<Message>()
    function* produce(): IterableIterator<Hint<any>> {
      const message: Message = yield unread
      return message
    }
    function consume(message: Message) {
      channel.send([line, message])
    }
    return <T>synthesize<Message, Message>(manager, produce, consume)
  }

}

// two reserved lines in a switchboard
const environmentLine = -1, subsidiaryLine = -2

// a subsidiary lives in the parent environment to encapsulate a child environment
class $Subsidiary extends Loose<Subsidiary> {

  private switchboard: Switchboard

  private child: Child<[number, Message]>

  private environment: Environment

  constructor(private readonly description: string) {
    super()
  }

  public dispose() {
    this.child.terminate()
    super.dispose()
  }

  public *initialize() {
    const self = this.self, child = this.child = bearChild<[number, Message]>(location)
    const switchboard = this.switchboard = new Switchboard(child)
    this.environment = command<Environment>(self, switchboard.open<CommandStream>(self, environmentLine))
    yield run<void>(function controlling() {
      return control(self, switchboard.open<ControlStream>(self, subsidiaryLine))
    })
  }

  public brief(childForensics: Forensics) {
    const subsidiaries = [this.description, ...(childForensics.subsidiaries || [])]
    const forensics = assign({}, childForensics, { subsidiaries })
    // report enhanced forensics in this environment
    report(forensics)
  }

  public postInitialize() {
    console.log('post initialized from child ' + this.description)
  }

}
