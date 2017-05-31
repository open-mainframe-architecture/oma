import { Dictionary, Index, List, Record, Value} from 'oma/data'
import { Sources } from 'oma/datatype'

export default {
  'Delta.Message': {
    sequence: 'integer',
    actions: '[Delta.Action]',
    lease: 'number',
    retried: 'Flag'
  },
  'Delta.Index': 'string|number',
  'Delta.Action': {
    path: '[Delta.Index]'
  },
  'Delta.Assign': {
    super$: 'Delta.Action',
    value: 'Any'
  },
  'Delta.Signal': {
    super$: 'Delta.Action',
    event: 'Any'
  },
  'Delta.Allot': {
    super$: 'Delta.Action',
    values: '<Any>'    
  },
  'Delta.Exclude': {
    super$: 'Delta.Action'
  },
  'Delta.Erase': {
    super$: 'Delta.Action',
    keys: '[string]'
  }
} as Sources


export interface Message {
  readonly sequence: number
  readonly actions: List<Record<Action>>
  readonly lease: number
  readonly retried?: 'y'
}

export interface Action {
  readonly path: List<Index>
}

export interface Assign extends Action {
  readonly value: Value
}
export interface Signal extends Action {
  readonly event: Value
}
export interface Allot extends Action {
  readonly values: Dictionary<Value>
}
export interface Exclude extends Action { }
export interface Erase extends Action {
  readonly keys: List<string>
}
