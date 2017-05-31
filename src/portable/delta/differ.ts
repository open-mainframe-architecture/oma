import { Dictionary, Index, List, Record, Universe, Value } from 'oma/data'
import { TypePattern } from 'oma/datatype'
import { Differ, DifferFactory } from 'oma/delta'
import { Action, Allot, Assign, Erase, Exclude } from 'oma/datatype/delta'

const { min } = Math

import * as always from 'oma/always'
import * as data from 'oma/data'
import * as loop from 'oma/loop'

const { returnK } = always
const { isComposite, meta, seek } = data
const { entries } = loop

export default <DifferFactory>createDiffer

function createDiffer(universe: Universe): Differ {
  const typespace = universe.typespace
  const PathList = universe.List<Index>('[Delta.Index]')
  const Assign = universe.Record<Assign>('Delta.Assign')
  const Allot = universe.Record<Allot>('Delta.Allot')
  const Exclude = universe.Record<Exclude>('Delta.Exclude')
  const Erase = universe.Record<Erase>('Delta.Erase')
  const Dictionary = universe.Dictionary<Value>('<Any>')
  const KeyList = universe.List<string>('[string]')
  const withoutDifferences: Record<Action>[] = [], rootPath = PathList([])
  const compositeDifference: TypePattern<Differ> = {
    list: returnK<Differ>((left: List<Value>, right: List<Value>) => {
      const leftWidth = left.width$, rightWidth = right.width$, minimum = min(leftWidth, rightWidth)
      const actions: Record<Action>[] = []
      let index = 1
      for (; index <= minimum; ++index) {
        const nestedActions = differ(seek(left, index), seek(right, index))
        if (nestedActions.length) {
          actions.push(...nestedActions.map(action => universe.change(action, {
            path: PathList([index, ...action.path.constituents$])
          })))
        }
      }
      if (index <= leftWidth) {
        actions.push(Exclude({ path: PathList([index]) }))
      } else if (index === rightWidth) {
        actions.push(Assign({ path: PathList([index]), value: seek(right, index) }))
      } else if (index < rightWidth) {
        const additionalElements: { [index: string]: Value } = {}
        do {
          additionalElements[index] = seek(right, index)
        } while (++index <= rightWidth)
        actions.push(Allot({ path: rootPath, values: Dictionary(additionalElements) }))
      }
      return actions
    }),
    dictionary: returnK<Differ>((left: Dictionary<Value>, right: Dictionary<Value>) => {
      const actions: Record<Action>[] = []
      const leftKeys = [...left.indices$].sort(), rightKeys = [...right.indices$].sort()
      const leftWidth = left.width$, rightWidth = right.width$
      const additionalElements: { [key: string]: Value } = {}, removedKeys: string[] = []
      let leftOffset = 0, rightOffset = 0, elementsAdded = 0
      while (leftOffset < leftWidth && rightOffset < rightWidth) {
        const leftKey = leftKeys[leftOffset], rightKey = rightKeys[rightOffset]
        if (leftKey === rightKey) {
          const nestedActions = differ(seek(left, leftKey), seek(right, leftKey))
          if (nestedActions.length) {
            actions.push(...nestedActions.map(action => universe.change(action, {
              path: PathList([leftKey, ...action.path.constituents$])
            })))
          }
          ++leftOffset
          ++rightOffset
        } else if (leftKey < rightKey) {
          removedKeys.push(leftKey)
          ++leftOffset
        } else {
          additionalElements[rightKey] = seek(right, rightKey)
          ++elementsAdded
          ++rightOffset
        }
      }
      for (; rightOffset < rightWidth; ++rightOffset, ++elementsAdded) {
        const rightKey = rightKeys[rightOffset]
        additionalElements[rightKey] = seek(right, rightKey)
      }
      if (elementsAdded === 1) {
        const [[singleKey, singleElement]] = [...entries(additionalElements)]
        actions.push(Assign({ path: PathList([singleKey]), value: singleElement }))
      } else if (elementsAdded > 1) {
        actions.push(Allot({ path: rootPath, values: Dictionary(additionalElements) }))
      }
      for (; leftOffset < leftWidth; ++leftOffset) {
        removedKeys.push(leftKeys[leftOffset])
      }
      if (removedKeys.length) {
        actions.push(Erase({ path: rootPath, keys: KeyList(removedKeys) }))
      }
      return actions
    }),
    record: returnK<Differ>((left: Record<{}>, right: Record<{}>) => {
      const actions: Record<Action>[] = []
      for (const [selector, fieldValue, annotations] of left.fields$) {
        const nestedActions = differ(fieldValue, seek(right, selector))
        if (nestedActions.length) {
          actions.push(...nestedActions.map(action => universe.change(action, {
            path: PathList([selector, ...action.path.constituents$])
          })))
        }
        const nestedAnnotationsActions = differ(annotations, right.annotations$(selector))
        if (nestedAnnotationsActions.length) {
          actions.push(...nestedAnnotationsActions.map(action => universe.change(action, {
            path: PathList([meta(selector), ...action.path.constituents$])
          })))
        }
      }
      return actions
    }),
    default(): never { throw new Error('internal error in data differ') }
  }
  function differ(left: Value, right: Value) {
    if (left === right) {
      return withoutDifferences
    } else if (isComposite(left) && isComposite(right)) {
      if (left.typespace$ !== typespace || right.typespace$ !== typespace) {
        throw new Error('typespace conflict in data differ')
      }
      const concrete = left.concrete$
      if (concrete === right.concrete$ && left.dynamic$ === right.dynamic$) {
        return concrete.dispatch(compositeDifference)(left, right)
      }
    }
    return [Assign({ path: rootPath, value: right })]
  }
  return differ
}
