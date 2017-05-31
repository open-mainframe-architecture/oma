import { Cue, Forensics, Job, Teleprompter } from 'oma/theater'

import * as always from 'oma/always'

const { returnNothing, throwError } = always

/**
 * Adding a queue item is synchronous, but removing a queue item is asynchronous.
 */
export interface Queue<T> extends Teleprompter<T> {

  /**
   * Try to remove the first item from this queue.
   * @returns Theater cue that prompts the first item that was removed
   */
  dequeue(): Cue<T>

  /**
   * Add item to this queue.
   * @param item Item to add
   */
  enqueue(item: T): void

}

/**
 * All cues are derived from this base implementation.
 */
export abstract class AbstractCue<T> implements Cue<T> {

  /**
   * Parent cue if this cue is charged, otherwise null.
   */
  private parentCue: Cue<any> | null = null

  /**
   * Begin waiting period or ignite immediately upon charging.
   * @param job Job that is charging this cue
   */
  protected abstract begin(job: Job<any>): void

  /**
   * End the waiting period of this cue.
   * @param discharged True if this cue ended with a discharge, otherwise this cue ended with an ignition
   */
  protected end(discharged: boolean): void {
  }

  public get isCharged() {
    return !!this.parentCue
  }

  public *precharge(parent: Cue<any>, job: Job<any>): IterableIterator<[Cue<any>, Cue<any>]> {
    yield [parent, this]
  }

  public charge(parent: Cue<any>, job: Job<any>) {
    this.parentCue = this.parentCue ? throwError('cue cannot charge if already charged') : parent
    this.begin(job)
  }

  public witness(blooper: Error): Forensics {
    const parent = this.parentCue || throwError('cue cannot witness a blooper if not charged')
    return parent.witness(blooper)
  }

  public ignite(prompt?: T, blooper?: Error) {
    const parent = this.parentCue || throwError('cue cannot ignite if not charged')
    this.parentCue = null
    this.end(false)
    parent.propagate(this, prompt, blooper)
  }

  public propagate<U>(child: Cue<U>, prompt?: U, blooper?: Error) {
    const parent = this.parentCue || throwError('cue cannot propagate ignition')
    this.parentCue = null
    this.end(false)
    parent.propagate<any>(this, prompt, blooper)
  }

  public discharge() {
    const parent = this.parentCue || throwError('cue cannot discharge if not charged')
    this.parentCue = null
    this.end(true)
  }

}

/**
 * A group collects charged theater cues with the same origin.
 */
export class Group<T> {

  /**
   * Collect group members when they do not ignite upon charging.
   */
  private chargedMembers: Set<GroupMember<T>> | false = false

  /**
   * Construct new group.
   * @param testIgnition Test ignition of group member that is charging
   * @param prompter Compute prompt when member ignites
   */
  constructor(
    public readonly testIgnition: (job: Job<any>) => boolean,
    public readonly prompter: () => T
  ) {
  }

  /**
   * Create member of this group.
   */
  public get member() {
    return new GroupMember<T>(this)
  }

  /**
   * Add member that did not ignite upon charging.
   * @param member Group member
   */
  public addCharged(member: GroupMember<T>) {
    const charged = this.chargedMembers || (this.chargedMembers = new Set<GroupMember<T>>())
    charged.add(member)
  }

  /**
   * Delete member after discharge or ignition.
   * @param member Group member
   * @param discharged True if member is discharged, otherwise member ignited
   */
  public deleteCharged(member: GroupMember<T>, discharged: boolean) {
    const charged = this.chargedMembers
    if (charged) {
      if (!charged.delete(member)) {
        throw new Error('cannot delete missing group member')
      }
      if (!charged.size) {
        this.chargedMembers = false
      }
    } else if (discharged) {
      throw new Error('member cannot discharge if group is empty')
    }
  }

  /**
   * Ignite all charged members.
   */
  public igniteAll() {
    const charged = this.chargedMembers
    if (charged) {
      this.chargedMembers = false
      for (const member of charged) {
        member.ignite()
      }
    }
  }

  /**
   * Ignite oldest charged members.
   * @returns True if oldest member ignited, otherwise false
   */
  public igniteOldest() {
    const charged = this.chargedMembers
    if (charged) {
      const [member] = charged
      if (member) {
        member.ignite()
        return true
      }
    }
    return false
  }

}

/**
 * Default group member.
 */
export class GroupMember<T> extends AbstractCue<T> {

  protected begin(job: Job<any>) {
    const group = this.group
    if (group.testIgnition(job)) {
      this.ignite()
    } else {
      group.addCharged(this)
    }
  }

  protected end(discharged: boolean) {
    this.group.deleteCharged(this, discharged)
    super.end(discharged)
  }

  constructor(protected readonly group: Group<T>) {
    super()
  }

  public ignite(prompt?: T, blooper?: Error) {
    super.ignite(blooper ? prompt : this.group.prompter(), blooper)
  }

}

/**
 * Signal to obtain theater cue from a hint.
 * @param hint Potential hint to block on after yield
 * @returns Theater cue
 * @throws When hint is neiter a theater cue, a teleprompter nor a promise
 */
export function signal(hint: any) {
  if (hint instanceof AbstractCue) {
    return hint
  }
  if (hint) {
    if (typeof hint.autocue === 'function') {
      return (<Teleprompter<any>>hint).autocue()
    } else if (typeof hint.then === 'function') {
      return resolution(<Promise<any>>hint)
    }
  }
  throw new Error('hint is not a cue, autocue or promise')
}

/**
 * Create a theater cue that prompts the active employment. This always ignites a job upon charging.
 * @returns New theater cue
 */
export function employment<T>(): Cue<Job<T>> {
  return new Employment<T>()
}

/**
 * Create theater cue that always ignites a prompt upon charging. It never blocks a job.
 * @param prompt Optional prompt to ignite
 * @returns New theater cue
 */
export function spark<T>(prompt?: T): Cue<T> {
  return new Spark<T>(prompt)
}

/**
 * Create theater cue that prompts when result has been revealed.
 * @param use Closure that uses revelation capability
 * @returns New theater cue that prompts result
 */
export function anticipation<T>(use: ((reveal: (result: T) => void) => void)): Cue<T> {
  return new Anticipation(use)
}

/**
 * Create theater cue that prompts the resolution or rejection of a promise.
 * @param promise Promise that resolves a result or rejects with an error
 * @returns New theater cue
 */
export function settlement<T>(promise: Promise<T>): Cue<T | Error> {
  return new Settlement(promise)
}

/**
 * Create theater cue that prompts the resolution of a promise.
 * A promise rejection is treated as a blooper.
 * @param promise Promise that resolves a result
 * @returns New theater cue
 */
export function resolution<T>(promise: Promise<T>): Cue<T> {
  return new Resolution(promise)
}

/**
 * Create a queue.
 * @returns New queue
 */
export function queue<T>(): Queue<T> {
  const buffer: T[] = [], group = new Group(() => buffer.length > 0, () => <T>buffer.shift())
  const dequeue = () => group.member
  return {
    dequeue, autocue: dequeue,
    enqueue(item: T) {
      buffer.push(item)
      group.igniteOldest()
    }
  }
}

// ignite with charging job
class Employment<T> extends AbstractCue<Job<T>> {

  protected begin(job: Job<T>) {
    this.ignite(job)
  }

}

// a spark always ignites upon charging
class Spark<T> extends AbstractCue<T> {

  protected begin(job: Job<any>) {
    this.ignite(this.prompt)
  }

  constructor(private readonly prompt?: T) {
    super()
  }

}

// special symbolic results of anticipations
const pending = Symbol('pending'), obsolete = Symbol('obsolete')

// ignite with revealed result
class Anticipation<T> extends AbstractCue<T> {

  private result: T | symbol = pending

  protected begin(job: Job<any>) {
    const result = this.result
    if (result !== pending) {
      this.ignite(<T>result)
    }
  }

  protected end(discharged: boolean) {
    this.result = obsolete
    super.end(discharged)
  }

  constructor(use: ((reveal: (result: T) => void) => void)) {
    super()
    use(result => {
      if (this.isCharged) {
        this.ignite(result)
      } else if (this.result === pending) {
        this.result = result
      }
    })
  }

}

// a cue with the resolution or rejection of a JavaScript promise
class Settlement<T> extends AbstractCue<T | Error> {

  protected begin(job: Job<any>) {
    const resolved = (result: T) => { this.ignite(result) }
    const rejected = (reason: any) => { this.ignite(reason instanceof Error ? reason : new Error(reason)) }
    this.promise.then(resolved, rejected)
  }

  constructor(private readonly promise: Promise<T>) {
    super()
  }

}

// a cue with the resolution of a JavaScript promise
class Resolution<T> extends AbstractCue<T> {

  protected begin(job: Job<any>) {
    const resolved = (result: T) => { this.ignite(result) }
    const rejected = (reason: any) => { this.ignite(void 0, reason instanceof Error ? reason : new Error(reason)) }
    this.promise.then(resolved, rejected)
  }

  constructor(private readonly promise: Promise<T>) {
    super()
  }

}
