import { Record, Universe, Value } from 'oma/data'
import { Agent, Job } from 'oma/theater'
import { Action, Message } from 'oma/datatype/delta'

export type Differ = (left: Value, right: Value) => Record<Action>[]
export type DifferFactory = (universe: Universe) => Differ

export interface Model extends Agent {
  update(message: Record<Message>): Job<Record<Message>>

  ready(): Job<number>
  greedy(): Job<number>
}
