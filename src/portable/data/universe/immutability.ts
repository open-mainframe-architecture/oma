import {
  DictionaryFactory,
  ListFactory,
  RecordFactory,
  UniverseConstructor,
  UniverseMixin,
  Value
} from 'oma/data'
import { Definitions, Expression } from 'oma/datatype'

const { freeze } = Object

/**
 * A universe with immutability freezes composite values.
 * This functionality is not required.
 * Use it when you hand over composite values to others, which may attempt to alter the composite values.
 * Immutability is not foolproof! An immutable composite value may still have private mutable parts.
 */
export default withImmutability as UniverseMixin

function withImmutability(BaseUniverse: UniverseConstructor) {
  return class ImmutableUniverse extends BaseUniverse {
    protected listFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): ListFactory<T> {
      const mutableList = super.listFactory<T>(dynamic, concrete, elementary)
      return elements => freeze(mutableList(elements))
    }
    protected dictionaryFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): DictionaryFactory<T> {
      const mutableDictionary = super.dictionaryFactory<T>(dynamic, concrete, elementary)
      return elements => freeze(mutableDictionary(elements))
    }
    protected recordFactory<T>(dynamic: Expression, concrete: Expression, fields: Definitions): RecordFactory<T> {
      const mutableRecord = super.recordFactory<T>(dynamic, concrete, fields)
      return fieldValues => <any>freeze(mutableRecord(fieldValues))
    }
  }
}