import { Cue, Hint, Job } from 'oma/theater'

import * as loop from 'oma/loop'

const { empty, flatten, map } = loop

import * as play from 'oma/theater/play'
import * as wait from 'oma/theater/wait'

const { report } = play
const { AbstractCue, signal, spark } = wait

/**
 * A burnout error combines multiple errors.
 * Individual errors are not the problem, but the combination of errors prevents further progress.
 */
export class Burnout extends Error {

  /**
   * Error objects.
   */
  public readonly errors: Error[]

  /**
   * Construct burnout error.
   * @param errors Array with errors
   */
  constructor(errors: Error[]) {
    super('multiple errors')
    this.errors = errors
  }

}

/**
 * Create theater parent cue that prompts when all child cues prompt a result.
 * When a child fails with a blooper, the parent propagates the blooper, discharging children that are still charged.
 * @param hints Hints of child cues
 * @returns New parent cue
 */
export function all(...hints: Hint<any>[]): Cue<IterableIterator<any>> {
  return hints.length ? new ConjunctParent(hints) : spark(empty<void>())
}

/**
 * Create theater parent cue that propagates a result.
 * When a child prompts a result, other children are discharged unless they already failed.
 * When a child fails with a blooper, the parent ignores the blooper unless all children have failed.
 * When all children have failed, the parent fails with a burnout blooper.
 * @param hints Hints of child cues
 * @returns New parent cue
 */
export function one(...hints: Hint<any>[]): Cue<any> {
  return hints.length > 1 ? new DisjunctParent(hints) : hints.length === 1 ? signal(hints[0]) : spark<undefined>()
}

/**
 * Create theater parent cue that propagates when any child cue prompts a result or fails with a blooper.
 * Other children are discharged.
 * @param hints Hints of child cues
 * @returns New parent cue
 */
export function any(...hints: Hint<any>[]): Cue<any> {
  return hints.length > 1 ? new IndiscriminateParent(hints) : hints.length === 1 ? signal(hints[0]) : spark<undefined>()
}

// a parent cue precharges its children
abstract class ParentCue<T> extends AbstractCue<T> {

  protected readonly children: Set<Cue<any>>

  protected begin(job: Job<any>) {
  }

  protected end(discharged: boolean) {
    for (const child of this.children) {
      if (child.isCharged) {
        child.discharge()
      }
    }
    super.end(discharged)
  }

  constructor(hints: Hint<any>[]) {
    super()
    if (!hints.length) {
      throw new Error('parent cue needs at least one child to propagate from')
    }
    this.children = new Set(hints.map(signal))
  }

  public precharge(parent: Cue<any>, job: Job<any>): IterableIterator<[Cue<any>, Cue<any>]> {
    this.charge(parent, job)
    return flatten(map(this.children.values(), child => child.precharge(this, job)))
  }

}

// prompt all results when all children prompt a result (any blooper from the offspring is propagated)
class ConjunctParent extends ParentCue<IterableIterator<any>> {

  private readonly prompts = new Map<Cue<any>, any>()

  public propagate<T>(child: Cue<any>, prompt?: T, blooper?: Error) {
    const children = this.children
    if (!children.has(child)) {
      throw new Error('bad child in propagation at conjunct parent')
    }
    if (blooper) {
      super.propagate(child, prompt, blooper)
    } else {
      const prompts = this.prompts
      prompts.set(child, prompt)
      if (prompts.size === children.size) {
        this.ignite(map(this.children.values(), child => prompts.get(child)))
      }
    }
  }

}

// propagate when a child prompts a result (child bloopers are ignored unless all children fail with a blooper)
class DisjunctParent extends ParentCue<any> {

  private readonly bloopers: Error[] = []

  public propagate<T>(child: Cue<any>, prompt?: T, blooper?: Error) {
    const children = this.children
    if (!children.has(child)) {
      throw new Error('bad child in propagation at disjunct parent')
    }
    if (blooper) {
      const bloopers = this.bloopers
      bloopers.push(blooper)
      if (bloopers.length === children.size) {
        this.ignite(void 0, new Burnout(bloopers))
      } else {
        report(this.witness(blooper))
      }
    } else {
      super.propagate(child, prompt)
    }
  }

}

// propagate when a child child prompts a result or fail with blooper
class IndiscriminateParent extends ParentCue<any> {

  public propagate<T>(child: Cue<any>, prompt?: T, blooper?: Error) {
    if (!this.children.has(child)) {
      throw new Error('bad child in propagation at indiscriminate parent')
    }
    super.propagate(child, prompt, blooper)
  }

}
