import {
  DictionaryUnmarshaller,
  List,
  ListUnmarshaller,
  RecordUnmarshaller,
  Universe,
  UniverseConstructor,
  UniverseMixin
} from 'oma/data'
import { Expression } from 'oma/datatype'
import { Link } from 'oma/datatype/standard'

import * as assert from 'assert'
import * as mocha from 'mocha'

import * as data from 'oma/data'
import * as datatype from 'oma/datatype'

const { equivalent } = data
const { parseDefinitions, parseType } = datatype

import standardTypes from 'oma/datatype/standard'

import Typespace from 'oma/data/typespace'
import PrimalUniverse from 'oma/data/universe'

import withImmutability from 'oma/data/universe/immutability'
import withRecycling from 'oma/data/universe/recycling'
import withSafety from 'oma/data/universe/safety'

const typespace = new Typespace(parseDefinitions(standardTypes))

describe('primal data universe', function () {
  const universe: Universe = new PrimalUniverse(typespace)
  const NumberList = universe.List<number>('[number]')
  const NumberDictionary = universe.Dictionary<number>('<number>')
  const NumberLink = universe.Record<Link<number>>('Link(number)')
  it('constructs list factories', function () {
    assert.deepEqual([...NumberList([]).constituents$], [])
    assert.deepEqual([...NumberList([]).indices$], [])
    assert.deepEqual([...NumberList([]).associations$], [])
    assert.deepEqual([...NumberList([42, 54, 66]).constituents$], [42, 54, 66])
    assert.deepEqual([...NumberList([42, 54, 66]).indices$], [1, 2, 3])
    assert.deepEqual([...NumberList([42, 54, 66]).associations$], [[1, 42], [2, 54], [3, 66]])
  })
  it('constructs dictionary factories', function () {
    assert.deepEqual([...NumberDictionary({}).constituents$], [])
    assert.deepEqual([...NumberDictionary({}).indices$], [])
    assert.deepEqual([...NumberDictionary({}).associations$], [])
    assert.deepEqual(new Set(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).constituents$), new Set([42, 54, 66]))
    assert.deepEqual(new Set(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).indices$), new Set(['foo', 'bar', 'baz']))
    assert.deepEqual(
      new Set(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).associations$),
      new Set([['foo', 42], ['bar', 54], ['baz', 66]]))
  })
  it('constructs record factories', function () {
    assert.deepEqual(new Set(NumberLink({ head: 42 }).constituents$), new Set([42, null]))
    assert.deepEqual(new Set(NumberLink({ head: 42 }).indices$), new Set(['head', 'tail']))
    assert.deepEqual(new Set(NumberLink({ head: 42 }).associations$), new Set([['head', 42], ['tail', null]]))
  })
  it('constructs membership testers', function () {
    assert.ok(universe.tester('[number]')(NumberList([])))
    assert.ok(universe.tester('[Any]')(NumberList([])))
    assert.ok(universe.tester('[string]')(NumberList([])))
    assert.ok(universe.tester('[number]')(NumberList([42, 54, 66])))
    assert.ok(universe.tester('[Any]')(NumberList([42, 54, 66])))
    assert.ok(!universe.tester('[string]')(NumberList([42, 54, 66])))
    assert.ok(universe.tester('<number>')(NumberDictionary({})))
    assert.ok(universe.tester('<Any>')(NumberDictionary({})))
    assert.ok(universe.tester('<string>')(NumberDictionary({})))
    assert.ok(universe.tester('<number>')(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(universe.tester('<Any>')(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!universe.tester('<string>')(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(universe.tester('Link(number)')(NumberLink({ head: 42 })))
    assert.ok(universe.tester('Link(Any)')(NumberLink({ head: 42 })))
    assert.ok(!universe.tester('Link(string)')(NumberLink({ head: 42 })))
  })
  it('marshals simple values as simple shapes', function () {
    assert.strictEqual(universe.marshal(null), null)
    assert.strictEqual(universe.marshal(false), false)
    assert.strictEqual(universe.marshal(true), true)
    assert.strictEqual(universe.marshal(0), 0)
    assert.strictEqual(universe.marshal(1), 1)
    assert.strictEqual(universe.marshal(42), 42)
    assert.strictEqual(universe.marshal(''), '')
    assert.strictEqual(universe.marshal('abc'), 'abc')
    assert.strictEqual(universe.marshal('\n'), '\n')
  })
  it('unmarshals simple shapes as simple values', function () {
    assert.strictEqual(universe.unmarshal(null), null)
    assert.strictEqual(universe.unmarshal(false), false)
    assert.strictEqual(universe.unmarshal(true), true)
    assert.strictEqual(universe.unmarshal(0), 0)
    assert.strictEqual(universe.unmarshal(1), 1)
    assert.strictEqual(universe.unmarshal(42), 42)
    assert.strictEqual(universe.unmarshal(''), '')
    assert.strictEqual(universe.unmarshal('abc'), 'abc')
    assert.strictEqual(universe.unmarshal('\n'), '\n')
  })
  it('marshals composite values as shapes with dynamic type if inferred type is missing', function () {
    assert.deepEqual(universe.marshal(NumberList([])), { $: '[number]', _: [] })
    assert.deepEqual(universe.marshal(NumberList([42, 54, 66])), { $: '[number]', _: [42, 54, 66] })
    assert.deepEqual(universe.marshal(NumberDictionary({})), { $: '<number>', _: {} })
    assert.deepEqual(universe.marshal(NumberDictionary({ foo: 42, bar: 54, baz: 66 })),
      { $: '<number>', _: { foo: 42, bar: 54, baz: 66 } })
    assert.deepEqual(universe.marshal(NumberLink({ head: 42 })), { $: 'Link(number)', head: 42 })
    assert.deepEqual(universe.marshal(
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })),
      { $: 'Link(number)', head: 42, tail: { head: 54, tail: { head: 66 } } })
  })
  it('marshals composite values as shapes without a dynamic type if it has been inferred', function () {
    assert.deepEqual(universe.marshal(NumberList([]), '[number]'), [])
    assert.deepEqual(universe.marshal(NumberList([42, 54, 66]), '[number]'), [42, 54, 66])
    assert.deepEqual(universe.marshal(NumberDictionary({}), '<number>'), { _: {} })
    assert.deepEqual(universe.marshal(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), '<number>'),
      { _: { foo: 42, bar: 54, baz: 66 } })
    assert.deepEqual(universe.marshal(NumberLink({ head: 42 }), 'Link(number)'), { head: 42 })
    assert.deepEqual(universe.marshal(
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 'Link(number)'),
      { head: 42, tail: { head: 54, tail: { head: 66 } } })
  })
  it('marshals composite values as shapes with a dynamic type if it differs from the inferred type', function () {
    assert.deepEqual(universe.marshal(NumberList([]), '[Any]'), { $: '[number]', _: [] })
    assert.deepEqual(universe.marshal(NumberList([42, 54, 66]), '[Any]'), { $: '[number]', _: [42, 54, 66] })
    assert.deepEqual(universe.marshal(NumberDictionary({}), '<Any>'), { $: '<number>', _: {} })
    assert.deepEqual(universe.marshal(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), '<Any>'),
      { $: '<number>', _: { foo: 42, bar: 54, baz: 66 } })
    assert.deepEqual(universe.marshal(NumberLink({ head: 42 }), 'Link(Any)'), { $: 'Link(number)', head: 42 })
    assert.deepEqual(universe.marshal(
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 'Link(Any)'),
      { $: 'Link(number)', head: 42, tail: { head: 54, tail: { head: 66 } } })
  })
  it('unmarshals composite values from object shapes with dynamic type', function () {
    assert.ok(equivalent(universe.unmarshal({ $: '[number]', _: [] }), NumberList([])))
    assert.ok(equivalent(universe.unmarshal({ $: '[number]', _: [42, 54, 66] }), NumberList([42, 54, 66])))
    assert.ok(equivalent(universe.unmarshal({ $: '<number>', _: {} }), NumberDictionary({})))
    assert.ok(equivalent(universe.unmarshal({ $: '<number>', _: { foo: 42, bar: 54, baz: 66 } }),
      NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(equivalent(universe.unmarshal({ $: 'Link(number)', head: 42 }), NumberLink({ head: 42 })))
    assert.ok(equivalent(universe.unmarshal(
      { $: 'Link(number)', head: 42, tail: { head: 54, tail: { head: 66 } } }),
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
  })
  it('unmarshals composite values with inferred type from object shapes without dynamic type', function () {
    assert.ok(equivalent(universe.unmarshal([], '[number]'), NumberList([])))
    assert.ok(equivalent(universe.unmarshal([42, 54, 66], '[number]'), NumberList([42, 54, 66])))
    assert.ok(equivalent(universe.unmarshal({ _: {} }, '<number>'), NumberDictionary({})))
    assert.ok(equivalent(universe.unmarshal({ _: { foo: 42, bar: 54, baz: 66 } }, '<number>'),
      NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(equivalent(universe.unmarshal({ head: 42 }, 'Link(number)'), NumberLink({ head: 42 })))
    assert.ok(equivalent(universe.unmarshal(
      { head: 42, tail: { head: 54, tail: { head: 66 } } }, 'Link(number)'),
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
  })
  it('unmarshals composite values from object shapes with dynamic type, ignoring the inferred type', function () {
    assert.ok(equivalent(universe.unmarshal({ $: '[number]', _: [] }, '[Any]'), NumberList([])))
    assert.ok(equivalent(universe.unmarshal({ $: '[number]', _: [42, 54, 66] }, '[Any]'), NumberList([42, 54, 66])))
    assert.ok(equivalent(universe.unmarshal({ $: '<number>', _: {} }, '<Any>'), NumberDictionary({})))
    assert.ok(equivalent(universe.unmarshal({ $: '<number>', _: { foo: 42, bar: 54, baz: 66 } }, '<Any>'),
      NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(equivalent(universe.unmarshal({ $: 'Link(number)', head: 42 }, 'Link(Any)'), NumberLink({ head: 42 })))
    assert.ok(equivalent(universe.unmarshal(
      { $: 'Link(number)', head: 42, tail: { head: 54, tail: { head: 66 } } }, 'Link(Any)'),
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
  })
  it('changes constituents of composite values', function () {
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 1: 42, 2: 54, 3: 66 }), NumberList([42, 54, 66])))
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 1: 42, 3: 66 }), NumberList([42, 2, 66])))
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 4: 42, 5: 54, 6: 66 }), NumberList([1, 2, 3, 42, 54, 66])))
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 1: 42, 2: 54, 3: 66, 4: 78, 5: 89 }), NumberList([42, 54, 66, 78, 89])))
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 1: 42, 2: 54, 3: void 0 }), NumberList([42, 54])))
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 1: 42, 2: void 0 }), NumberList([42])))
    assert.ok(equivalent(universe.change(NumberList([1, 2, 3]), { 1: void 0 }), NumberList([])))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { foo: 1, bar: 2, baz: 3 }),
      NumberDictionary({ foo: 1, bar: 2, baz: 3 })))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { foo: 1, baz: 3 }),
      NumberDictionary({ foo: 1, bar: 54, baz: 3 })))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { qux: 78, alf: 89 }),
      NumberDictionary({ foo: 42, bar: 54, baz: 66, qux: 78, alf: 89 })))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { foo: 1, bar: 2, baz: 3, qux: 78, alf: 89 }),
      NumberDictionary({ foo: 1, bar: 2, baz: 3, qux: 78, alf: 89 })))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { baz: void 0 }),
      NumberDictionary({ foo: 42, bar: 54 })))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { bar: void 0, baz: void 0 }),
      NumberDictionary({ foo: 42 })))
    assert.ok(equivalent(universe.change(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), { foo: void 0, bar: void 0, baz: void 0 }),
      NumberDictionary({})))
    assert.ok(equivalent(universe.change(NumberLink({ head: 42 }), { head: 54 }), NumberLink({ head: 54 })))
    assert.ok(equivalent(universe.change(NumberLink({ head: 42, tail: NumberLink({ head: 54 }) }),
      { tail: NumberLink({ head: 66 }) }),
      NumberLink({ head: 42, tail: NumberLink({ head: 66 }) })))
    assert.ok(equivalent(universe.change(NumberLink({ head: 42, tail: NumberLink({ head: 54 }) }),
      { head: 54, tail: NumberLink({ head: 66 }) }),
      NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })))
  })
})

describe('recycling data universe', function () {
  let listUnmarshaller: ListUnmarshaller, unmarshalledList = 0
  let dictionaryUnmarshaller: DictionaryUnmarshaller, unmarshalledDictionary = 0
  let recordUnmarshaller: RecordUnmarshaller, unmarshalledRecord = 0
  function testingPurposes(BaseUniverse: UniverseConstructor) {
    return class TestedUniverse extends BaseUniverse {
      protected listUnmarshaller(dynamic: Expression) {
        ++unmarshalledList
        return listUnmarshaller = super.listUnmarshaller(dynamic)
      }
      protected dictionaryUnmarshaller(dynamic: Expression) {
        ++unmarshalledDictionary
        return dictionaryUnmarshaller = super.dictionaryUnmarshaller(dynamic)
      }
      protected recordUnmarshaller(dynamic: Expression) {
        ++unmarshalledRecord
        return recordUnmarshaller = super.recordUnmarshaller(dynamic)
      }
    }
  }
  const RecyclingUniverse = testingPurposes(withRecycling(PrimalUniverse))
  const universe: Universe = new RecyclingUniverse(typespace)
  it('reuses existing factories', function () {
    assert.strictEqual(universe.List('[number]'), universe.List('[number]'))
    assert.strictEqual(universe.Dictionary('<number>'), universe.Dictionary('<number>'))
    assert.strictEqual(universe.Record('Link(number)'), universe.Record('Link(number)'))
  })
  it('reuses existing membership testers', function () {
    assert.strictEqual(universe.tester('[number]'), universe.tester('[number]'))
    assert.strictEqual(universe.tester('<number>'), universe.tester('<number>'))
    assert.strictEqual(universe.tester('Link(number)'), universe.tester('Link(number)'))
  })
  it('reuses existing unmarshallers', function () {
    universe.unmarshal([], '[number]')
    assert.equal(unmarshalledList, 1)
    universe.unmarshal({ _: {} }, '<number>')
    assert.equal(unmarshalledDictionary, 1)
    universe.unmarshal({ head: 42 }, 'Link(number)')
    assert.equal(unmarshalledRecord, 1)
    const firstListUnmarshaller = listUnmarshaller
    const firstDictionaryUnmarshaller = dictionaryUnmarshaller
    const firstRecordUnmarshaller = recordUnmarshaller
    universe.unmarshal([42, 54, 66], '[number]')
    assert.equal(unmarshalledList, 2)
    assert.strictEqual(firstListUnmarshaller, listUnmarshaller)
    universe.unmarshal({ _: { foo: 42, bar: 54, baz: 66 } }, '<number>')
    assert.equal(unmarshalledDictionary, 2)
    assert.strictEqual(firstDictionaryUnmarshaller, dictionaryUnmarshaller)
    universe.unmarshal({ head: 42, tail: { head: 54, tail: { head: 66 } } }, 'Link(number)')
    assert.equal(unmarshalledRecord, 4)
    assert.strictEqual(firstRecordUnmarshaller, recordUnmarshaller)
  })
})

describe('safe data universe', function () {
  const SafeUniverse = withRecycling(withSafety(PrimalUniverse))
  const universe: Universe = new SafeUniverse(typespace)
  const NumberList = universe.List('[number]')
  const NumberDictionary = universe.Dictionary('<number>')
  const NumberLink = universe.Record<Link<any>>('Link(number)')
  it('verifies type of list elements', function () {
    assert.throws(() => NumberList([42, 54, 'c']))
    assert.throws(() => NumberList([42, 54, false]))
    assert.throws(() => NumberList([42, 54, null]))
    assert.throws(() => NumberList([42, 54, NumberList([1, 2, 3])]))
    assert.throws(() => NumberList([42, 54, <any>void 0]))
  })
  it('verifies type of dictionary elements', function () {
    assert.throws(() => NumberDictionary({ foo: 42, bar: 54, baz: 'c' }))
    assert.throws(() => NumberDictionary({ foo: 42, bar: 54, baz: false }))
    assert.throws(() => NumberDictionary({ foo: 42, bar: 54, baz: null }))
    assert.throws(() => NumberDictionary({ foo: 42, bar: 54, baz: NumberList([1, 2, 3]) }))
    assert.throws(() => NumberDictionary({ foo: 42, bar: 54, baz: <any>void 0 }))
  })
  it('verifies type record fields', function () {
    assert.throws(() => NumberLink({ head: 'c' }))
    assert.throws(() => NumberLink({ head: 42, tail: <any>'c' }))
    assert.throws(() => NumberLink({ head: false }))
    assert.throws(() => NumberLink({ head: 42, tail: <any>false }))
    assert.throws(() => NumberLink({ head: null }))
    assert.throws(() => NumberLink({ head: NumberList([1, 2, 3]) }))
    assert.throws(() => NumberLink({ head: 42, tail: <any>NumberList([1, 2, 3]) }))
    assert.throws(() => NumberLink({ head: <any>void 0 }))
    assert.throws(() => NumberLink({ head: 42, tail: <any>void 0 }))
  })
  it('verifies inferred type when marshalling', function () {
    assert.throws(() => universe.marshal(null, 'string'))
    assert.throws(() => universe.marshal(false, 'string'))
    assert.throws(() => universe.marshal(42, 'string'))
    assert.throws(() => universe.marshal('foo', 'number'))
    assert.throws(() => universe.marshal('foo', '"bar"'))
    assert.throws(() => universe.marshal(NumberList([1, 2, 3]), 'string'))
    assert.throws(() => universe.marshal(NumberList([1, 2, 3]), '[string]'))
    assert.throws(() => universe.marshal(NumberList([1, 2, 3.14]), '[integer]'))
    assert.throws(() => universe.marshal(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), 'string'))
    assert.throws(() => universe.marshal(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), '<string>'))
    assert.throws(() => universe.marshal(NumberDictionary({ foo: 42, bar: 54, baz: 66.6 }), '<integer>'))
    assert.throws(() => universe.marshal(NumberLink({ head: 42 }), 'string'))
    assert.throws(() => universe.marshal(NumberLink({ head: 42 }), 'Link(string)'))
    assert.throws(() => universe.marshal(NumberLink({ head: 42.4 }), 'Link(integer)'))
  })
  it('verifies inferred type when unmarshalling', function () {
    assert.throws(() => universe.unmarshal(null, 'string'))
    assert.throws(() => universe.unmarshal(false, 'string'))
    assert.throws(() => universe.unmarshal(42, 'string'))
    assert.throws(() => universe.unmarshal('foo', 'number'))
    assert.throws(() => universe.unmarshal('foo', '"bar"'))
    assert.throws(() => universe.unmarshal([1, 2, 3], 'string'))
    assert.throws(() => universe.unmarshal([1, 2, 3], '[string]'))
    assert.throws(() => universe.unmarshal([1, 2, 3.14], '[integer]'))
    assert.throws(() => universe.unmarshal({ _: { foo: 42, bar: 54, baz: 66 } }, 'string'))
    assert.throws(() => universe.unmarshal({ _: { foo: 42, bar: 54, baz: 66 } }, '<string>'))
    assert.throws(() => universe.unmarshal({ _: { foo: 42, bar: 54, baz: 66.6 } }, '<integer>'))
    assert.throws(() => universe.unmarshal({ $: 'Link(number)', head: 42 }, 'string'))
    assert.throws(() => universe.unmarshal({ $: 'Link(number)', head: 42 }, 'Link(string)'))
    assert.throws(() => universe.unmarshal({ $: 'Link(number)', head: 42.4 }, 'Link(integer)'))
  })
})

describe('immutable data universe', function () {
  const ImmutableUniverse = withRecycling(withSafety(withImmutability(PrimalUniverse)))
  const universe: Universe = new ImmutableUniverse(typespace)
  const NumberList = universe.List('[number]')
  const NumberDictionary = universe.Dictionary('<number>')
  const NumberLink = universe.Record<Link<any>>('Link(number)')
  it('prevents accidental modification of list values', function () {
    assert.throws(() => (<any>NumberList([])).foo = 12)
    assert.throws(() => (<any>NumberList([])).width$ = 12)
    assert.throws(() => (<any>NumberList([]))[1] = 12)
  })
  it('prevents accidental modification of dictionary values', function () {
    assert.throws(() => (<any>NumberDictionary({})).foo = 12)
    assert.throws(() => (<any>NumberDictionary({})).width$ = 12)
    assert.throws(() => (<any>NumberDictionary({}))[1] = 12)
  })
  it('prevents accidental modification of record values', function () {
    assert.throws(() => (<any>NumberLink({ head: 42 })).foo = 12)
    assert.throws(() => (<any>NumberLink({ head: 42 })).width$ = 12)
    assert.throws(() => (<any>NumberLink({ head: 42 }))[1] = 12)
  })
})