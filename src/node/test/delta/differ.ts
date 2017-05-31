import { Record, Universe, Value } from 'oma/data'
import { Expression } from 'oma/datatype'
import { Area, Link } from 'oma/datatype/standard'
import { Action, Allot, Assign, Erase, Exclude } from 'oma/datatype/delta'

import * as assert from 'assert'
import * as mocha from 'mocha'

import * as data from 'oma/data'
import * as datatype from 'oma/datatype'

const { parseDefinitions, parseType } = datatype

import standardTypes from 'oma/datatype/standard'
import deltaTypes from 'oma/datatype/delta'
import differFactory from 'oma/delta/differ'

import Typespace from 'oma/data/typespace'
import PrimalUniverse from 'oma/data/universe'

import withImmutability from 'oma/data/universe/immutability'
import withRecycling from 'oma/data/universe/recycling'
import withSafety from 'oma/data/universe/safety'

const typespace = new Typespace(parseDefinitions(standardTypes, deltaTypes, {
  NumberList: '[number]',
  NumberDictionary: '<number>',
  NumberLink: 'Link(number)'
}))

const TestUniverse = withRecycling(withSafety(withImmutability(PrimalUniverse)))

describe('simple difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  it('tests whether simple values are identical', function () {
    const values = [null, false, true, 0, 1, -1, 3.14, '', 'foo']
    for (const value of values) {
      for (const otherValue of values) {
        const differences = differ(value, otherValue)
        if (value !== otherValue) {
          assert.equal(differences.length, 1)
          const [difference] = differences as Record<Assign>[]
          assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
          assert.equal([...difference.path.constituents$].length, 0)
          assert.equal(difference.value, otherValue)
        } else {
          assert.equal(differences.length, 0)
        }
      }
    }
  })
})

describe('simple list difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  const NumberList = universe.List('[number]')
  it('finds a distinct element', function () {
    const differences = differ(NumberList([1, 2, 3]), NumberList([1, 2, 2]))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference.path.constituents$], [3])
    assert.equal(difference.value, 2)
  })
  it('finds distinct elements', function () {
    const differences = differ(NumberList([1, 2, 3]), NumberList([42, 2, 2]))
    assert.equal(differences.length, 2)
    const [firstDifference, secondDifference] = differences as Record<Assign>[]
    assert.strictEqual(firstDifference.dynamic$, parseType('Delta.Assign'))
    assert.strictEqual(secondDifference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...firstDifference.path.constituents$], [1])
    assert.deepEqual([...secondDifference.path.constituents$], [3])
    assert.equal(firstDifference.value, 42)
    assert.equal(secondDifference.value, 2)
  })
  it('excludes elements when other list is shorter', function () {
    const differences = differ(NumberList([1, 2, 3]), NumberList([1]))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Exclude>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Exclude'))
    assert.deepEqual([...difference.path.constituents$], [2])
  })
  it('adds element when other list is longer', function () {
    const differences = differ(NumberList([1]), NumberList([1, 42]))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference.path.constituents$], [2])
    assert.equal(difference.value, 42)
  })
  it('adds elements when other list is longer', function () {
    const differences = differ(NumberList([1]), NumberList([1, 42, 53]))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Allot>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Allot'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.deepEqual(universe.marshal(difference.values, '<Any>'), { _: { 2: 42, 3: 53 } })
  })
})

describe('simple dictionary difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  const NumberDictionary = universe.Dictionary('<number>')
  it('finds a distinct element', function () {
    const differences = differ(NumberDictionary({ foo: 1, bar: 2, baz: 3 }), NumberDictionary({ foo: 1, bar: 2, baz: 2 }))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference.path.constituents$], ['baz'])
    assert.equal(difference.value, 2)
  })
  it('finds distinct elements', function () {
    const differences = differ(NumberDictionary({ foo: 1, bar: 2, baz: 3 }), NumberDictionary({ foo: 42, bar: 2, baz: 2 }))
    assert.equal(differences.length, 2)
    const [firstDifference, secondDifference] = differences as Record<Assign>[]
    assert.strictEqual(firstDifference.dynamic$, parseType('Delta.Assign'))
    assert.strictEqual(secondDifference.dynamic$, parseType('Delta.Assign'))
    const firstPath = [...firstDifference.path.constituents$], secondPath = [...secondDifference.path.constituents$]
    assert.equal(firstPath.length, 1)
    assert.equal(secondPath.length, 1)
    const [firstKey] = firstPath, [secondKey] = secondPath
    assert.ok(firstKey === 'baz' || firstKey === 'foo')
    assert.ok(secondKey === 'baz' || secondKey === 'foo')
    assert.ok(firstKey !== secondKey)
    assert.ok(firstDifference.value === 2 || firstDifference.value === 42)
    assert.ok(secondDifference.value === 2 || secondDifference.value === 42)
    assert.ok(firstDifference.value !== secondDifference.value)
  })
  it('erases element when other dictionary is smaller', function () {
    const differences = differ(NumberDictionary({ foo: 1, bar: 2, baz: 3 }), NumberDictionary({ foo: 1, bar: 2 }))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Erase>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Erase'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.deepEqual([...difference.keys.constituents$], ['baz'])
  })
  it('erases elements when other dictionary is smaller', function () {
    const differences = differ(NumberDictionary({ foo: 1, bar: 2, baz: 3 }), NumberDictionary({ foo: 1 }))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Erase>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Erase'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.deepEqual([...difference.keys.constituents$].sort(), ['bar', 'baz'])
  })
  it('adds element when other dictionary is bigger', function () {
    const differences = differ(NumberDictionary({ foo: 1, bar: 42 }), NumberDictionary({ foo: 1, bar: 42, baz: 53 }))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference.path.constituents$], ['baz'])
    assert.equal(difference.value, 53)
  })
  it('adds elements when other dictionary is bigger', function () {
    const differences = differ(NumberDictionary({ foo: 1 }), NumberDictionary({ foo: 1, bar: 42, baz: 53 }))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Allot>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Allot'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.deepEqual(universe.marshal(difference.values, '<Any>'), { _: { bar: 42, baz: 53 } })
  })
})

describe('simple record difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  const Area = universe.Record<Area>('Area')
  it('finds a distinct element', function () {
    const differences = differ(Area({ height: 1, width: 2 }), Area({ height: 1, width: 42 }))
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference.path.constituents$], ['width'])
    assert.equal(difference.value, 42)
  })
  it('finds distinct elements', function () {
    const differences = differ(Area({ height: 1, width: 2 }), Area({ height: 2, width: 42 }))
    assert.equal(differences.length, 2)
    const [firstDifference, secondDifference] = differences as Record<Assign>[]
    assert.strictEqual(firstDifference.dynamic$, parseType('Delta.Assign'))
    assert.strictEqual(secondDifference.dynamic$, parseType('Delta.Assign'))
    const firstPath = [...firstDifference.path.constituents$], secondPath = [...secondDifference.path.constituents$]
    assert.equal(firstPath.length, 1)
    assert.equal(secondPath.length, 1)
    const [firstKey] = firstPath, [secondKey] = secondPath
    assert.ok(firstKey === 'height' || firstKey === 'width')
    assert.ok(secondKey === 'height' || secondKey === 'width')
    assert.ok(firstKey !== secondKey)
    assert.ok(firstDifference.value === 2 || firstDifference.value === 42)
    assert.ok(secondDifference.value === 2 || secondDifference.value === 42)
    assert.ok(firstDifference.value !== secondDifference.value)
  })
})

describe('list difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  it('finds difference in dynamic types', function () {
    const NumberList = universe.List<number>('[number]')
    const indirect = universe.List<number>('NumberList')([])
    const differences = differ(NumberList([]), indirect)
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.strictEqual(difference.value, indirect)
  })
  it('finds nested difference', function () {
    const AnyList = universe.List<Value>('[Any]')
    const left1 = AnyList([AnyList([AnyList([1, 2, 3])]), 4, 5])
    const right1 = AnyList([AnyList([AnyList([1, 42, 3])]), 4, 5])
    const differences1 = differ(left1, right1)
    assert.equal(differences1.length, 1)
    const [difference1] = differences1 as Record<Assign>[]
    assert.strictEqual(difference1.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference1.path.constituents$], [1, 1, 2])
    assert.equal(difference1.value, 42)
    const left2 = AnyList([1, 2, AnyList([3, 4, AnyList([5, 6, 7])]), 8, 9])
    const right2 = AnyList([1, 2, AnyList([3, 4, AnyList([5, 66, 7])]), 8, 9])
    const differences2 = differ(left2, right2)
    assert.equal(differences2.length, 1)
    const [difference2] = differences2 as Record<Assign>[]
    assert.strictEqual(difference2.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference2.path.constituents$], [3, 3, 2])
    assert.equal(difference2.value, 66)
    const sublist = AnyList([5, 6, 7])
    const left3 = AnyList([1, 2, 3, 4, AnyList([]), 8, 9])
    const right3 = AnyList([1, 2, 3, 4, AnyList([sublist]), 8, 9])
    const differences3 = differ(left3, right3)
    assert.equal(differences2.length, 1)
    const [difference3] = differences3 as Record<Assign>[]
    assert.strictEqual(difference3.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference3.path.constituents$], [5, 1])
    assert.strictEqual(difference3.value, sublist)
  })
  it('combines nested difference and exlusion', function () {
    const AnyList = universe.List<Value>('[Any]')
    const left = AnyList([AnyList([AnyList([1, 2, 3]), 6, 7]), 4, 5])
    const right = AnyList([AnyList([AnyList([1, 42, 3])]), 4, 5])
    const differences = differ(left, right)
    assert.equal(differences.length, 2)
    function compareDynamicType(left: Record<Action>, right: Record<Action>) {
      const leftDynamic = left.dynamic$.unparsed, rightDynamic = right.dynamic$.unparsed
      return leftDynamic < rightDynamic ? -1 : leftDynamic === rightDynamic ? 0 : 1
    }
    const [firstDifference, secondDifference] = differences.sort(compareDynamicType)
    assert.strictEqual(firstDifference.dynamic$, parseType('Delta.Assign'))
    assert.strictEqual(secondDifference.dynamic$, parseType('Delta.Exclude'))
    const assign = <Record<Assign>>firstDifference, exclude: Record<Exclude> = secondDifference
    assert.deepEqual([...assign.path.constituents$], [1, 1, 2])
    assert.strictEqual(assign.value, 42)
    assert.deepEqual([...exclude.path.constituents$], [1, 2])
  })
})

describe('dictionary difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  it('finds difference in dynamic types', function () {
    const NumberDictionary = universe.Dictionary<number>('<number>')
    const indirect = universe.Dictionary<number>('NumberDictionary')({})
    const differences = differ(NumberDictionary({}), indirect)
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.strictEqual(difference.value, indirect)
  })
  it('finds nested difference', function () {
    const AnyDictionary = universe.Dictionary<Value>('<Any>')
    const left1 = AnyDictionary({ foo: AnyDictionary({ bar: AnyDictionary({ baz: 2 }) }) })
    const right1 = AnyDictionary({ foo: AnyDictionary({ bar: AnyDictionary({ baz: 42 }) }) })
    const differences1 = differ(left1, right1)
    assert.equal(differences1.length, 1)
    const [difference1] = differences1 as Record<Assign>[]
    assert.strictEqual(difference1.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference1.path.constituents$], ['foo', 'bar', 'baz'])
    assert.equal(difference1.value, 42)
    const left2 = AnyDictionary({ foo: 42, qux: AnyDictionary({ baba: 12, baz: AnyDictionary({ duh: 6, bar: 54 }) }) })
    const right2 = AnyDictionary({ foo: 42, qux: AnyDictionary({ baba: 12, baz: AnyDictionary({ duh: 66, bar: 54 }) }) })
    const differences2 = differ(left2, right2)
    assert.equal(differences2.length, 1)
    const [difference2] = differences2 as Record<Assign>[]
    assert.strictEqual(difference2.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference2.path.constituents$], ['qux', 'baz', 'duh'])
    assert.equal(difference2.value, 66)
    const subdictionary = AnyDictionary({ foo: 5, bar: 6, baz: 7 })
    const left3 = AnyDictionary({ bla: 12, duh: 24, qux: AnyDictionary({}) })
    const right3 = AnyDictionary({ bla: 12, duh: 24, qux: AnyDictionary({ baz: subdictionary }) })
    const differences3 = differ(left3, right3)
    assert.equal(differences2.length, 1)
    const [difference3] = differences3 as Record<Assign>[]
    assert.strictEqual(difference3.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference3.path.constituents$], ['qux', 'baz'])
    assert.strictEqual(difference3.value, subdictionary)
  })
  it('combines nested difference and erasure', function () {
    const AnyDictionary = universe.Dictionary<Value>('<Any>')
    const left = AnyDictionary({ foo: AnyDictionary({ bar: AnyDictionary({ alf: 2 }), baz: 6, qux: 7 }), duh: 4 })
    const right = AnyDictionary({ foo: AnyDictionary({ bar: AnyDictionary({ alf: 42 }) }), duh: 4 })
    const differences = differ(left, right)
    assert.equal(differences.length, 2)
    function compareDynamicType(left: Record<Action>, right: Record<Action>) {
      const leftDynamic = left.dynamic$.unparsed, rightDynamic = right.dynamic$.unparsed
      return leftDynamic < rightDynamic ? -1 : leftDynamic === rightDynamic ? 0 : 1
    }
    const [firstDifference, secondDifference] = differences.sort(compareDynamicType)
    assert.strictEqual(firstDifference.dynamic$, parseType('Delta.Assign'))
    assert.strictEqual(secondDifference.dynamic$, parseType('Delta.Erase'))
    const assign = <Record<Assign>>firstDifference, erase = <Record<Erase>>secondDifference
    assert.deepEqual([...assign.path.constituents$], ['foo', 'bar', 'alf'])
    assert.strictEqual(assign.value, 42)
    assert.deepEqual([...erase.path.constituents$], ['foo'])
    assert.deepEqual([...erase.keys.constituents$].sort(), ['baz', 'qux'])
  })
})

describe('record difference', function () {
  const universe: Universe = new TestUniverse(typespace)
  const differ = differFactory(universe)
  it('finds difference in dynamic types', function () {
    const NumberLink = universe.Record<Link<number>>('Link(number)')
    const indirect = universe.Record<Link<number>>('NumberLink')({ head: 42 })
    const differences = differ(NumberLink({ head: 42 }), indirect)
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.equal([...difference.path.constituents$].length, 0)
    assert.strictEqual(difference.value, indirect)
  })
  it('finds nested difference', function () {
    const NumberLink = universe.Record<Link<number>>('Link(number)')
    const differences = differ(
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      NumberLink({ head: 42, tail: NumberLink({ head: 55, tail: NumberLink({ head: 66 }) }) })
    )
    assert.equal(differences.length, 1)
    const [difference] = differences as Record<Assign>[]
    assert.strictEqual(difference.dynamic$, parseType('Delta.Assign'))
    assert.deepEqual([...difference.path.constituents$], ['tail', 'head'])
    assert.strictEqual(difference.value, 55)
  })
})