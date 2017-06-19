import { Record } from 'oma/data'
import { Sources } from 'oma/datatype'

export default {
  // any data value
  Any: 'Maybe(*)',
  // boolean alternative (false=null, true="y")
  Flag: 'Maybe("y")',
  // one line of text or several lines of text
  Text: 'string|[string]',
  // either a T or none
  Maybe: '(T=*)?T',
  // list value (backed by array)
  List: '(T=Any)[T]',
  // dictionary value
  Dictionary: '(T=Any)<T>',
  // empty record (all record values are members of this type)
  Record: '{}',
  // a linked list (null is empty list)
  Link: {
    arguments$: 'T=Any',
    constructors$: 'Maybe',
    head: 'T',
    tail: 'Link(T)'
  },
  // dimensions of a 2D area (effectively a rectangle)
  Area: {
    height: 'number',
    width: 'number'
  }
} as Sources

export interface Link<T> {
  readonly head: T
  readonly tail?: Record<Link<T>>
}

export interface Area {
  height: number
  width: number
}
