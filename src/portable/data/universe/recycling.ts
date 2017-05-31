import {
  DictionaryFactory,
  DictionaryUnmarshaller,
  ListFactory,
  ListUnmarshaller,
  MemberTester,
  RecordFactory,
  RecordUnmarshaller,
  UniverseConstructor,
  UniverseMixin,
  Value
} from 'oma/data'
import { Definitions, Expression } from 'oma/datatype'

const { create } = Object

/**
 * A universe with recycling reuses closures for testing, construction and unmarshalling purposes.
 * This functionality is not required, but it is highly advisable.
 * It is relatively cheap and it avoids the creation of many identical closures.
 */
export default withRecycling as UniverseMixin

function withRecycling(BaseUniverse: UniverseConstructor) {
  return class RecyclingUniverse extends BaseUniverse {
    private cachedMemberTesters: { [unparsed: string]: MemberTester<Value> } = create(null)
    private cachedListFactories: { [unparsed: string]: ListFactory<Value> } = create(null)
    private cachedDictionaryFactories: { [unparsed: string]: DictionaryFactory<Value> } = create(null)
    private cachedRecordFactories: { [unparsed: string]: RecordFactory<{}> } = create(null)
    private cachedListUnmarshallers: { [unparsed: string]: ListUnmarshaller } = create(null)
    private cachedDictionaryUnmarshallers: { [unparsed: string]: DictionaryUnmarshaller } = create(null)
    private cachedRecordUnmarshallers: { [unparsed: string]: RecordUnmarshaller } = create(null)
    protected memberTester<T extends Value>(evaluated: Expression) {
      const cache = this.cachedMemberTesters, unparsed = evaluated.unparsed
      return <MemberTester<T>>cache[unparsed] || (cache[unparsed] = super.memberTester<T>(evaluated))
    }
    protected listFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): ListFactory<T> {
      const cache = this.cachedListFactories, unparsed = dynamic.unparsed
      return <ListFactory<T>>cache[unparsed] || (cache[unparsed] = super.listFactory<T>(dynamic, concrete, elementary))
    }
    protected dictionaryFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): DictionaryFactory<T> {
      const cache = this.cachedDictionaryFactories, unparsed = dynamic.unparsed
      return <DictionaryFactory<T>>cache[unparsed] || (cache[unparsed] = super.dictionaryFactory<T>(dynamic, concrete, elementary))
    }
    protected recordFactory<T>(dynamic: Expression, concrete: Expression, fields: Definitions): RecordFactory<T> {
      const cache = this.cachedRecordFactories, unparsed = dynamic.unparsed
      return <RecordFactory<T>>cache[unparsed] || (cache[unparsed] = super.recordFactory<T>(dynamic, concrete, fields))
    }
    protected listUnmarshaller(dynamic: Expression) {
      const cache = this.cachedListUnmarshallers, unparsed = dynamic.unparsed
      return cache[unparsed] || (cache[unparsed] = super.listUnmarshaller(dynamic))
    }
    protected dictionaryUnmarshaller(dynamic: Expression) {
      const cache = this.cachedDictionaryUnmarshallers, unparsed = dynamic.unparsed
      return cache[unparsed] || (cache[unparsed] = super.dictionaryUnmarshaller(dynamic))
    }
    protected recordUnmarshaller(dynamic: Expression) {
      const cache = this.cachedRecordUnmarshallers, unparsed = dynamic.unparsed
      return cache[unparsed] || (cache[unparsed] = super.recordUnmarshaller(dynamic))
    }
  }
}