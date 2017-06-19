import { Universe } from 'oma/data'
import { Link } from 'oma/datatype/standard'

import * as assert from 'assert'
import * as mocha from 'mocha'

import * as data from 'oma/data'
import * as datatype from 'oma/datatype'
import * as loop from 'oma/loop'

const {
  associations,
  concreteTypeOf,
  constituents,
  dynamicTypeOf,
  equivalent,
  indices,
  isBoolean,
  isComposite,
  isDictionary,
  isInteger,
  isList,
  isNone,
  isNumber,
  isRecord,
  isSimple,
  isString,
  isValuable,
  owns,
  probe,
  seek,
  umbilical,
  weight,
  width
} = data
const { parseDefinitions, parseType } = datatype
const { map } = loop

import standardTypes from 'oma/datatype/standard'

import Typespace from 'oma/data/typespace'
import PrimalUniverse from 'oma/data/universe'

import withImmutability from 'oma/data/universe/immutability'
import withRecycling from 'oma/data/universe/recycling'
import withSafety from 'oma/data/universe/safety'

const typespace = new Typespace(parseDefinitions(standardTypes, {
  NumberList: '[number]',
  NumberDictionary: '<number>',
  NumberLink: 'Link(number)',
  Foo: {
    bar: 'number @foo=bar @qux="Annotated.Value"',
    baz: 'string'
  }
}))
type Foo = { readonly bar: number, readonly baz: string }

const LocalUniverse = withRecycling(withSafety(withImmutability(PrimalUniverse)))
const universe: Universe = new LocalUniverse(typespace)
const NumberList = universe.List<number>('[number]')
const NumberDictionary = universe.Dictionary<number>('<number>')
const NumberLink = universe.Record<Link<number>>('Link(number)')

describe('data value', function () {
  it('is valuable', function () {
    assert.ok(isValuable(null))
    assert.ok(isValuable(false))
    assert.ok(isValuable(true))
    assert.ok(isValuable(0))
    assert.ok(isValuable(1))
    assert.ok(isValuable(42))
    assert.ok(isValuable(3.14))
    assert.ok(isValuable(-0))
    assert.ok(isValuable(-345.34e34))
    assert.ok(isValuable(''))
    assert.ok(isValuable('foo'))
    assert.ok(isValuable('\n'))
    assert.ok(isValuable(NumberList([])))
    assert.ok(isValuable(NumberList([42, 54, 66])))
    assert.ok(isValuable(NumberDictionary({})))
    assert.ok(isValuable(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(isValuable(NumberLink({ head: 42 })))
    assert.ok(isValuable(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isValuable(void 0))
    assert.ok(!isValuable(NaN))
    assert.ok(!isValuable(Infinity))
    assert.ok(!isValuable({}))
    assert.ok(!isValuable([]))
    assert.ok(!isValuable(typespace))
    assert.ok(!isValuable(LocalUniverse))
    assert.ok(!isValuable(universe))
  })
})

describe('simple value', function () {
  it('is null, a boolean, a number or a string', function () {
    assert.ok(isSimple(null))
    assert.ok(isSimple(false))
    assert.ok(isSimple(true))
    assert.ok(isSimple(0))
    assert.ok(isSimple(1))
    assert.ok(isSimple(42))
    assert.ok(isSimple(3.14))
    assert.ok(isSimple(-0))
    assert.ok(isSimple(-345.34e34))
    assert.ok(isSimple(''))
    assert.ok(isSimple('foo'))
    assert.ok(isSimple('\n'))
    assert.ok(!isSimple(NumberList([])))
    assert.ok(!isSimple(NumberList([42, 54, 66])))
    assert.ok(!isSimple(NumberDictionary({})))
    assert.ok(!isSimple(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isSimple(NumberLink({ head: 42 })))
    assert.ok(!isSimple(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isSimple(void 0))
    assert.ok(!isSimple(NaN))
    assert.ok(!isSimple(Infinity))
    assert.ok(!isSimple({}))
    assert.ok(!isSimple([]))
    assert.ok(!isSimple(typespace))
    assert.ok(!isSimple(LocalUniverse))
    assert.ok(!isSimple(universe))
  })
})

describe('none value', function () {
  it('is null', function () {
    assert.ok(isNone(null))
    assert.ok(!isNone(false))
    assert.ok(!isNone(true))
    assert.ok(!isNone(0))
    assert.ok(!isNone(1))
    assert.ok(!isNone(42))
    assert.ok(!isNone(3.14))
    assert.ok(!isNone(-0))
    assert.ok(!isNone(-345.34e34))
    assert.ok(!isNone(''))
    assert.ok(!isNone('foo'))
    assert.ok(!isNone('\n'))
    assert.ok(!isNone(NumberList([])))
    assert.ok(!isNone(NumberList([42, 54, 66])))
    assert.ok(!isNone(NumberDictionary({})))
    assert.ok(!isNone(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isNone(NumberLink({ head: 42 })))
    assert.ok(!isNone(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isNone(void 0))
    assert.ok(!isNone(NaN))
    assert.ok(!isNone(Infinity))
    assert.ok(!isNone({}))
    assert.ok(!isNone([]))
    assert.ok(!isNone(typespace))
    assert.ok(!isNone(LocalUniverse))
    assert.ok(!isNone(universe))
  })
})

describe('boolean value', function () {
  it('is false or true', function () {
    assert.ok(isBoolean(false))
    assert.ok(isBoolean(true))
    assert.ok(!isBoolean(null))
    assert.ok(!isBoolean(0))
    assert.ok(!isBoolean(1))
    assert.ok(!isBoolean(42))
    assert.ok(!isBoolean(3.14))
    assert.ok(!isBoolean(-0))
    assert.ok(!isBoolean(-345.34e34))
    assert.ok(!isBoolean(''))
    assert.ok(!isBoolean('foo'))
    assert.ok(!isBoolean('\n'))
    assert.ok(!isBoolean(NumberList([])))
    assert.ok(!isBoolean(NumberList([42, 54, 66])))
    assert.ok(!isBoolean(NumberDictionary({})))
    assert.ok(!isBoolean(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isBoolean(NumberLink({ head: 42 })))
    assert.ok(!isBoolean(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isBoolean(void 0))
    assert.ok(!isBoolean(NaN))
    assert.ok(!isBoolean(Infinity))
    assert.ok(!isBoolean({}))
    assert.ok(!isBoolean([]))
    assert.ok(!isBoolean(typespace))
    assert.ok(!isBoolean(LocalUniverse))
    assert.ok(!isBoolean(universe))
  })
})

describe('number value', function () {
  it('is a finite JavaScript number', function () {
    assert.ok(isNumber(0))
    assert.ok(isNumber(1))
    assert.ok(isNumber(42))
    assert.ok(isNumber(3.14))
    assert.ok(isNumber(-0))
    assert.ok(isNumber(-345.34e34))
    assert.ok(!isNumber(null))
    assert.ok(!isNumber(false))
    assert.ok(!isNumber(true))
    assert.ok(!isNumber(''))
    assert.ok(!isNumber('foo'))
    assert.ok(!isNumber('\n'))
    assert.ok(!isNumber(NumberList([])))
    assert.ok(!isNumber(NumberList([42, 54, 66])))
    assert.ok(!isNumber(NumberDictionary({})))
    assert.ok(!isNumber(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isNumber(NumberLink({ head: 42 })))
    assert.ok(!isNumber(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isNumber(void 0))
    assert.ok(!isNumber(NaN))
    assert.ok(!isNumber(Infinity))
    assert.ok(!isNumber({}))
    assert.ok(!isNumber([]))
    assert.ok(!isNumber(typespace))
    assert.ok(!isNumber(LocalUniverse))
    assert.ok(!isNumber(universe))
  })
})

describe('integer value', function () {
  it('is an unsigned 32-bit pattern', function () {
    assert.ok(isInteger(0))
    assert.ok(isInteger(1))
    assert.ok(isInteger(42))
    assert.ok(isInteger(2 ** 32 - 1))
    assert.ok(!isInteger(-0))
    assert.ok(!isInteger(-1))
    assert.ok(!isInteger(2 ** 32))
    assert.ok(!isInteger(2 ** 32 + 1))
    assert.ok(!isInteger(-(2 ** 32)))
    assert.ok(!isInteger(-(2 ** 32) - 1))
    assert.ok(!isInteger(-(2 ** 32) + 1))
    assert.ok(!isInteger(3.14))
    assert.ok(!isInteger(-345.34e34))
    assert.ok(!isInteger(null))
    assert.ok(!isInteger(false))
    assert.ok(!isInteger(true))
    assert.ok(!isInteger(''))
    assert.ok(!isInteger('foo'))
    assert.ok(!isInteger('\n'))
    assert.ok(!isInteger(NumberList([])))
    assert.ok(!isInteger(NumberList([42, 54, 66])))
    assert.ok(!isInteger(NumberDictionary({})))
    assert.ok(!isInteger(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isInteger(NumberLink({ head: 42 })))
    assert.ok(!isInteger(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isInteger(void 0))
    assert.ok(!isInteger(NaN))
    assert.ok(!isInteger(Infinity))
    assert.ok(!isInteger({}))
    assert.ok(!isInteger([]))
    assert.ok(!isInteger(typespace))
    assert.ok(!isInteger(LocalUniverse))
    assert.ok(!isInteger(universe))
  })
})

describe('string value', function () {
  it('is a JavaScript string', function () {
    assert.ok(isString(''))
    assert.ok(isString('foo'))
    assert.ok(isString('\n'))
    assert.ok(!isString(null))
    assert.ok(!isString(false))
    assert.ok(!isString(true))
    assert.ok(!isString(0))
    assert.ok(!isString(1))
    assert.ok(!isString(42))
    assert.ok(!isString(3.14))
    assert.ok(!isString(-0))
    assert.ok(!isString(-345.34e34))
    assert.ok(!isString(NumberList([])))
    assert.ok(!isString(NumberList([42, 54, 66])))
    assert.ok(!isString(NumberDictionary({})))
    assert.ok(!isString(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isString(NumberLink({ head: 42 })))
    assert.ok(!isString(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isString(void 0))
    assert.ok(!isString(NaN))
    assert.ok(!isString(Infinity))
    assert.ok(!isString({}))
    assert.ok(!isString([]))
    assert.ok(!isString(typespace))
    assert.ok(!isString(LocalUniverse))
    assert.ok(!isString(universe))
  })
})

describe('composite value', function () {
  it('is list, dictionary or record value', function () {
    assert.ok(isComposite(NumberList([])))
    assert.ok(isComposite(NumberList([42, 54, 66])))
    assert.ok(isComposite(NumberDictionary({})))
    assert.ok(isComposite(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(isComposite(NumberLink({ head: 42 })))
    assert.ok(isComposite(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isComposite(null))
    assert.ok(!isComposite(false))
    assert.ok(!isComposite(true))
    assert.ok(!isComposite(0))
    assert.ok(!isComposite(1))
    assert.ok(!isComposite(42))
    assert.ok(!isComposite(3.14))
    assert.ok(!isComposite(-0))
    assert.ok(!isComposite(-345.34e34))
    assert.ok(!isComposite(''))
    assert.ok(!isComposite('foo'))
    assert.ok(!isComposite('\n'))
    assert.ok(!isComposite(void 0))
    assert.ok(!isComposite(NaN))
    assert.ok(!isComposite(Infinity))
    assert.ok(!isComposite({}))
    assert.ok(!isComposite([]))
    assert.ok(!isComposite(typespace))
    assert.ok(!isComposite(LocalUniverse))
    assert.ok(!isComposite(universe))
  })
  it('links back to typespace with umbilical cord', function () {
    assert.strictEqual((<any>NumberList([]))[umbilical], typespace)
    assert.strictEqual((<any>NumberList([42, 54, 66]))[umbilical], typespace)
    assert.strictEqual((<any>NumberDictionary({}))[umbilical], typespace)
    assert.strictEqual((<any>NumberDictionary({ foo: 42, bar: 54, baz: 66 }))[umbilical], typespace)
    assert.strictEqual((<any>NumberLink({ head: 42 }))[umbilical], typespace)
    assert.strictEqual(
      (<any>NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }))[umbilical],
      typespace)
  })
  it('links back to typespace', function () {
    assert.strictEqual(NumberList([]).typespace$, typespace)
    assert.strictEqual(NumberList([42, 54, 66]).typespace$, typespace)
    assert.strictEqual(NumberDictionary({}).typespace$, typespace)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).typespace$, typespace)
    assert.strictEqual(NumberLink({ head: 42 }).typespace$, typespace)
    assert.strictEqual(
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }).typespace$,
      typespace)
  })
  it('retains dynamic type', function () {
    assert.strictEqual(universe.List('NumberList')([]).dynamic$, parseType('NumberList'))
    assert.strictEqual(universe.List('NumberList')([42, 54, 66]).dynamic$, parseType('NumberList'))
    assert.strictEqual(universe.Dictionary('NumberDictionary')({}).dynamic$, parseType('NumberDictionary'))
    assert.strictEqual(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 }).dynamic$, parseType('NumberDictionary'))
    assert.strictEqual(universe.Record<Link<number>>('NumberLink')({ head: 42 }).dynamic$, parseType('NumberLink'))
    assert.strictEqual(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }).dynamic$,
      parseType('NumberLink'))
  })
  it('has evaluated concrete type', function () {
    assert.strictEqual(universe.List('NumberList')([]).concrete$, parseType('[number]'))
    assert.strictEqual(universe.List('NumberList')([42, 54, 66]).concrete$, parseType('[number]'))
    assert.strictEqual(universe.Dictionary('NumberDictionary')({}).concrete$, parseType('<number>'))
    assert.strictEqual(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 }).concrete$, parseType('<number>'))
    assert.strictEqual(universe.Record<Link<number>>('NumberLink')({ head: 42 }).concrete$, parseType('{head:number,tail:Link(number)}'))
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.strictEqual(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail }).concrete$,
      parseType('{head:number,tail:Link(number)}'))
  })
  it('iterates over indices', function () {
    assert.equal([...NumberList([]).indices$].length, 0)
    assert.deepEqual([...NumberList([42, 54, 66]).indices$], [1, 2, 3])
    assert.equal([...NumberDictionary({}).indices$].length, 0)
    assert.deepEqual(new Set(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).indices$), new Set(['foo', 'bar', 'baz']))
    assert.deepEqual(new Set(NumberLink({ head: 42 }).indices$), new Set(['head', 'tail']))
    assert.deepEqual(
      new Set(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }).indices$),
      new Set(['head', 'tail']))
  })
  it('iterates over constituents', function () {
    assert.equal([...NumberList([]).constituents$].length, 0)
    assert.deepEqual([...NumberList([42, 54, 66]).constituents$], [42, 54, 66])
    assert.equal([...NumberDictionary({}).constituents$].length, 0)
    assert.deepEqual(new Set(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).constituents$), new Set([42, 54, 66]))
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.deepEqual(new Set(NumberLink({ head: 42, tail }).constituents$), new Set([42, tail]))
  })
  it('iterates over associations', function () {
    assert.equal([...NumberList([]).associations$].length, 0)
    assert.deepEqual([...NumberList([42, 54, 66]).associations$], [[1, 42], [2, 54], [3, 66]])
    assert.equal([...NumberDictionary({}).associations$].length, 0)
    assert.deepEqual(
      new Set(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).associations$),
      new Set([['foo', 42], ['bar', 54], ['baz', 66]]))
    assert.deepEqual(new Set(NumberLink({ head: 42 }).associations$), new Set([['head', 42], ['tail', null]]))
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.deepEqual(new Set(NumberLink({ head: 42, tail }).associations$), new Set([['head', 42], ['tail', tail]]))
  })
  it('has a width', function () {
    assert.equal(NumberList([]).width$, 0)
    assert.equal(NumberList([42, 54, 66]).width$, 3)
    assert.equal(NumberDictionary({}).width$, 0)
    assert.equal(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).width$, 3)
    assert.equal(NumberLink({ head: 42 }).width$, 2)
    assert.equal(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }).width$, 2)
  })
  it('has a weight', function () {
    assert.equal(NumberList([]).weight$, 1)
    assert.equal(NumberList([42, 54, 66]).weight$, 4)
    assert.equal(NumberDictionary({}).weight$, 1)
    assert.equal(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).weight$, 4)
    assert.equal(NumberLink({ head: 42 }).weight$, 5)
    assert.equal(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }).weight$, 13)
  })
  it('provides indexed access to constituents', function () {
    assert.strictEqual(NumberList([]).at$(0), void 0)
    assert.strictEqual(NumberList([]).at$(1), void 0)
    assert.strictEqual(NumberList([]).at$(3), void 0)
    assert.strictEqual(NumberList([]).at$(5), void 0)
    assert.strictEqual(NumberList([]).at$(<any>'baz'), void 0)
    assert.strictEqual(NumberList([]).at$(<any>'tail'), void 0)
    assert.strictEqual(NumberList([]).at$(<any>''), void 0)
    assert.strictEqual(NumberList([42, 54, 66]).at$(0), void 0)
    assert.strictEqual(NumberList([42, 54, 66]).at$(1), 42)
    assert.strictEqual(NumberList([42, 54, 66]).at$(3), 66)
    assert.strictEqual(NumberList([42, 54, 66]).at$(5), void 0)
    assert.strictEqual(NumberList([42, 54, 66]).at$(<any>'baz'), void 0)
    assert.strictEqual(NumberList([42, 54, 66]).at$(<any>'tail'), void 0)
    assert.strictEqual(NumberList([42, 54, 66]).at$(<any>''), void 0)
    assert.strictEqual(NumberDictionary({}).at$(<any>0), void 0)
    assert.strictEqual(NumberDictionary({}).at$(<any>1), void 0)
    assert.strictEqual(NumberDictionary({}).at$(<any>3), void 0)
    assert.strictEqual(NumberDictionary({}).at$(<any>5), void 0)
    assert.strictEqual(NumberDictionary({}).at$('baz'), void 0)
    assert.strictEqual(NumberDictionary({}).at$('tail'), void 0)
    assert.strictEqual(NumberDictionary({}).at$(''), void 0)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$(<any>0), void 0)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$(<any>1), void 0)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$(<any>3), void 0)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$(<any>5), void 0)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$('baz'), 66)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$('tail'), void 0)
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).at$(''), void 0)
    assert.strictEqual(NumberLink({ head: 42 }).at$(<any>0), void 0)
    assert.strictEqual(NumberLink({ head: 42 }).at$(<any>1), void 0)
    assert.strictEqual(NumberLink({ head: 42 }).at$(<any>3), void 0)
    assert.strictEqual(NumberLink({ head: 42 }).at$(<any>5), void 0)
    assert.strictEqual(NumberLink({ head: 42 }).at$('baz'), void 0)
    assert.strictEqual(NumberLink({ head: 42 }).at$('tail'), null)
    assert.strictEqual(NumberLink({ head: 42 }).at$(''), void 0)
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.strictEqual(NumberLink({ head: 42, tail }).at$(<any>0), void 0)
    assert.strictEqual(NumberLink({ head: 42, tail }).at$(<any>1), void 0)
    assert.strictEqual(NumberLink({ head: 42, tail }).at$(<any>3), void 0)
    assert.strictEqual(NumberLink({ head: 42, tail }).at$(<any>5), void 0)
    assert.strictEqual(NumberLink({ head: 42, tail }).at$('baz'), void 0)
    assert.strictEqual(NumberLink({ head: 42, tail }).at$('tail'), tail)
    assert.strictEqual(NumberLink({ head: 42, tail }).at$(''), void 0)
  })
})

describe('list value', function () {
  it('is a list', function () {
    assert.ok(isList(NumberList([])))
    assert.ok(isList(NumberList([42, 54, 66])))
    assert.ok(!isList(null))
    assert.ok(!isList(false))
    assert.ok(!isList(true))
    assert.ok(!isList(0))
    assert.ok(!isList(1))
    assert.ok(!isList(42))
    assert.ok(!isList(3.14))
    assert.ok(!isList(-0))
    assert.ok(!isList(-345.34e34))
    assert.ok(!isList(''))
    assert.ok(!isList('foo'))
    assert.ok(!isList('\n'))
    assert.ok(!isList(NumberDictionary({})))
    assert.ok(!isList(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isList(NumberLink({ head: 42 })))
    assert.ok(!isList(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isList(void 0))
    assert.ok(!isList(NaN))
    assert.ok(!isList(Infinity))
    assert.ok(!isList({}))
    assert.ok(!isList([]))
    assert.ok(!isList(typespace))
    assert.ok(!isList(LocalUniverse))
    assert.ok(!isList(universe))
  })
  it('has elementary type', function () {
    assert.strictEqual(NumberList([]).elementary$, parseType('number'))
    assert.strictEqual(NumberList([42, 54, 66]).elementary$, parseType('number'))
  })
})

describe('dictionary value', function () {
  it('is a dictionary', function () {
    assert.ok(isDictionary(NumberDictionary({})))
    assert.ok(isDictionary(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isDictionary(null))
    assert.ok(!isDictionary(false))
    assert.ok(!isDictionary(true))
    assert.ok(!isDictionary(0))
    assert.ok(!isDictionary(1))
    assert.ok(!isDictionary(42))
    assert.ok(!isDictionary(3.14))
    assert.ok(!isDictionary(-0))
    assert.ok(!isDictionary(-345.34e34))
    assert.ok(!isDictionary(''))
    assert.ok(!isDictionary('foo'))
    assert.ok(!isDictionary('\n'))
    assert.ok(!isDictionary(NumberList([])))
    assert.ok(!isDictionary(NumberList([42, 54, 66])))
    assert.ok(!isDictionary(NumberLink({ head: 42 })))
    assert.ok(!isDictionary(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isDictionary(void 0))
    assert.ok(!isDictionary(NaN))
    assert.ok(!isDictionary(Infinity))
    assert.ok(!isDictionary({}))
    assert.ok(!isDictionary([]))
    assert.ok(!isDictionary(typespace))
    assert.ok(!isDictionary(LocalUniverse))
    assert.ok(!isDictionary(universe))
  })
  it('has elementary type', function () {
    assert.strictEqual(NumberDictionary({}).elementary$, parseType('number'))
    assert.strictEqual(NumberDictionary({ foo: 42, bar: 54, baz: 66 }).elementary$, parseType('number'))
  })
})

describe('record value', function () {
  it('is a record', function () {
    assert.ok(isRecord(NumberLink({ head: 42 })))
    assert.ok(isRecord(NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!isRecord(null))
    assert.ok(!isRecord(false))
    assert.ok(!isRecord(true))
    assert.ok(!isRecord(0))
    assert.ok(!isRecord(1))
    assert.ok(!isRecord(42))
    assert.ok(!isRecord(3.14))
    assert.ok(!isRecord(-0))
    assert.ok(!isRecord(-345.34e34))
    assert.ok(!isRecord(''))
    assert.ok(!isRecord('foo'))
    assert.ok(!isRecord('\n'))
    assert.ok(!isRecord(NumberList([])))
    assert.ok(!isRecord(NumberList([42, 54, 66])))
    assert.ok(!isRecord(NumberDictionary({})))
    assert.ok(!isRecord(NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!isRecord(void 0))
    assert.ok(!isRecord(NaN))
    assert.ok(!isRecord(Infinity))
    assert.ok(!isRecord({}))
    assert.ok(!isRecord([]))
    assert.ok(!isRecord(typespace))
    assert.ok(!isRecord(LocalUniverse))
    assert.ok(!isRecord(universe))
  })
  it('has selective field type', function () {
    assert.strictEqual(NumberLink({ head: 42 }).selective$('head'), parseType('number'))
    assert.strictEqual(
      NumberLink({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }).selective$('tail'),
      parseType('Link(number)'))
  })
  it('has annotations', function () {
    const Foo = universe.Record<Foo>('Foo'), foo1 = Foo({ bar: 42, baz: 'a string' })
    assert.equal(foo1.annotations$('bar').width$, 2)
    assert.equal(foo1.annotations$('bar').at$('foo'), 'bar')
    assert.equal(foo1.annotations$('bar').at$('qux'), '"Annotated.Value"')
    assert.equal(foo1.annotations$('baz').width$, 0)
  })
})

describe('dynamic type', function () {
  it('is defined for simple value', function () {
    assert.strictEqual(dynamicTypeOf(null), parseType('none'))
    assert.strictEqual(dynamicTypeOf(false), parseType('boolean'))
    assert.strictEqual(dynamicTypeOf(true), parseType('boolean'))
    assert.strictEqual(dynamicTypeOf(0), parseType('number'))
    assert.strictEqual(dynamicTypeOf(1), parseType('number'))
    assert.strictEqual(dynamicTypeOf(42), parseType('number'))
    assert.strictEqual(dynamicTypeOf(3.14), parseType('number'))
    assert.strictEqual(dynamicTypeOf(-0), parseType('number'))
    assert.strictEqual(dynamicTypeOf(-345.34e34), parseType('number'))
    assert.strictEqual(dynamicTypeOf(''), parseType('string'))
    assert.strictEqual(dynamicTypeOf('foo'), parseType('string'))
    assert.strictEqual(dynamicTypeOf('\n'), parseType('string'))
  })
  it('is defined for composite value', function () {
    assert.strictEqual(dynamicTypeOf(universe.List('NumberList')([])), parseType('NumberList'))
    assert.strictEqual(dynamicTypeOf(universe.List('NumberList')([42, 54, 66])), parseType('NumberList'))
    assert.strictEqual(dynamicTypeOf(universe.Dictionary('NumberDictionary')({})), parseType('NumberDictionary'))
    assert.strictEqual(dynamicTypeOf(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 })),
      parseType('NumberDictionary'))
    assert.strictEqual(dynamicTypeOf(universe.Record<Link<number>>('NumberLink')({ head: 42 })), parseType('NumberLink'))
    assert.strictEqual(dynamicTypeOf(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })),
      parseType('NumberLink'))
  })
})

describe('concrete type', function () {
  it('is defined for simple value', function () {
    assert.strictEqual(concreteTypeOf(null), parseType('none'))
    assert.strictEqual(concreteTypeOf(false), parseType('boolean'))
    assert.strictEqual(concreteTypeOf(true), parseType('boolean'))
    assert.strictEqual(concreteTypeOf(0), parseType('number'))
    assert.strictEqual(concreteTypeOf(1), parseType('number'))
    assert.strictEqual(concreteTypeOf(42), parseType('number'))
    assert.strictEqual(concreteTypeOf(3.14), parseType('number'))
    assert.strictEqual(concreteTypeOf(-0), parseType('number'))
    assert.strictEqual(concreteTypeOf(-345.34e34), parseType('number'))
    assert.strictEqual(concreteTypeOf(''), parseType('string'))
    assert.strictEqual(concreteTypeOf('foo'), parseType('string'))
    assert.strictEqual(concreteTypeOf('\n'), parseType('string'))
  })
  it('is defined for composite value', function () {
    assert.strictEqual(concreteTypeOf(universe.List('NumberList')([])), parseType('[number]'))
    assert.strictEqual(concreteTypeOf(universe.List('NumberList')([42, 54, 66])), parseType('[number]'))
    assert.strictEqual(concreteTypeOf(universe.Dictionary('NumberDictionary')({})), parseType('<number>'))
    assert.strictEqual(concreteTypeOf(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 })),
      parseType('<number>'))
    assert.strictEqual(concreteTypeOf(universe.Record<Link<number>>('NumberLink')({ head: 42 })),
      parseType('{head:number,tail:Link(number)}'))
    assert.strictEqual(concreteTypeOf(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })),
      parseType('{head:number,tail:Link(number)}'))
  })
})

describe('indices of constituents', function () {
  it('are missing from simple value', function () {
    assert.equal([...indices(null)].length, 0)
    assert.equal([...indices(false)].length, 0)
    assert.equal([...indices(true)].length, 0)
    assert.equal([...indices(0)].length, 0)
    assert.equal([...indices(1)].length, 0)
    assert.equal([...indices(42)].length, 0)
    assert.equal([...indices(3.14)].length, 0)
    assert.equal([...indices(-0)].length, 0)
    assert.equal([...indices(-345.34e34)].length, 0)
    assert.equal([...indices('')].length, 0)
    assert.equal([...indices('foo')].length, 0)
    assert.equal([...indices('\n')].length, 0)
  })
  it('are present in composite value', function () {
    assert.equal([...indices(universe.List('NumberList')([]))].length, 0)
    assert.deepEqual([...indices(universe.List('NumberList')([42, 54, 66]))], [1, 2, 3])
    assert.equal([...indices(universe.Dictionary('NumberDictionary')({}))].length, 0)
    assert.deepEqual(
      new Set(indices(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 }))),
      new Set(['foo', 'bar', 'baz']))
    assert.deepEqual(new Set(indices(universe.Record<Link<number>>('NumberLink')({ head: 42 }))), new Set(['head', 'tail']))
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.deepEqual(
      new Set(indices(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }))),
      new Set(['head', 'tail']))
  })
})

describe('constituent values', function () {
  it('are missing from simple value', function () {
    assert.equal([...constituents(null)].length, 0)
    assert.equal([...constituents(false)].length, 0)
    assert.equal([...constituents(true)].length, 0)
    assert.equal([...constituents(0)].length, 0)
    assert.equal([...constituents(1)].length, 0)
    assert.equal([...constituents(42)].length, 0)
    assert.equal([...constituents(3.14)].length, 0)
    assert.equal([...constituents(-0)].length, 0)
    assert.equal([...constituents(-345.34e34)].length, 0)
    assert.equal([...constituents('')].length, 0)
    assert.equal([...constituents('foo')].length, 0)
    assert.equal([...constituents('\n')].length, 0)
  })
  it('are present in composite value', function () {
    assert.equal([...constituents(universe.List('NumberList')([]))].length, 0)
    assert.deepEqual([...constituents(universe.List('NumberList')([42, 54, 66]))], [42, 54, 66])
    assert.equal([...constituents(universe.Dictionary('NumberDictionary')({}))].length, 0)
    assert.deepEqual(
      new Set(constituents(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 }))),
      new Set([42, 54, 66]))
    assert.deepEqual(
      new Set(constituents(universe.Record<Link<number>>('NumberLink')({ head: 42 }))),
      new Set([42, null]))
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.deepEqual(
      new Set(constituents(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }))),
      new Set([42, tail]))
  })
})

describe('association pairs', function () {
  it('are missing from simple value', function () {
    assert.equal([...associations(null)].length, 0)
    assert.equal([...associations(false)].length, 0)
    assert.equal([...associations(true)].length, 0)
    assert.equal([...associations(0)].length, 0)
    assert.equal([...associations(1)].length, 0)
    assert.equal([...associations(42)].length, 0)
    assert.equal([...associations(3.14)].length, 0)
    assert.equal([...associations(-0)].length, 0)
    assert.equal([...associations(-345.34e34)].length, 0)
    assert.equal([...associations('')].length, 0)
    assert.equal([...associations('foo')].length, 0)
    assert.equal([...associations('\n')].length, 0)
  })
  it('are present in composite value', function () {
    assert.equal([...associations(universe.List('NumberList')([]))].length, 0)
    assert.deepEqual(new Set(associations(universe.List('NumberList')([42, 54, 66]))), new Set([[1, 42], [2, 54], [3, 66]]))
    assert.equal([...associations(universe.Dictionary('NumberDictionary')({}))].length, 0)
    assert.deepEqual(
      new Set(associations(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 }))),
      new Set([['foo', 42], ['bar', 54], ['baz', 66]]))
    assert.deepEqual(
      new Set(associations(universe.Record<Link<number>>('NumberLink')({ head: 42 }))),
      new Set([['head', 42], ['tail', null]]))
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.deepEqual(
      new Set(associations(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }))),
      new Set([['head', 42], ['tail', tail]]))
  })
})

describe('width of value', function () {
  it('is zero for simple value', function () {
    assert.equal(width(null), 0)
    assert.equal(width(false), 0)
    assert.equal(width(true), 0)
    assert.equal(width(0), 0)
    assert.equal(width(1), 0)
    assert.equal(width(42), 0)
    assert.equal(width(3.14), 0)
    assert.equal(width(-0), 0)
    assert.equal(width(-345.34e34), 0)
    assert.equal(width(''), 0)
    assert.equal(width('foo'), 0)
    assert.equal(width('\n'), 0)
  })
  it('counts the number of constituents in composite value', function () {
    assert.equal(width(universe.List('NumberList')([])), 0)
    assert.equal(width(universe.List('NumberList')([42, 54, 66])), 3)
    assert.equal(width(universe.Dictionary('NumberDictionary')({})), 0)
    assert.equal(width(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 })), 3)
    assert.equal(width(universe.Record<Link<number>>('NumberLink')({ head: 42 })), 2)
    assert.equal(width(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })), 2)
  })
})

describe('weight of value', function () {
  it('is one for simple value', function () {
    assert.equal(weight(null), 1)
    assert.equal(weight(false), 1)
    assert.equal(weight(true), 1)
    assert.equal(weight(0), 1)
    assert.equal(weight(1), 1)
    assert.equal(weight(42), 1)
    assert.equal(weight(3.14), 1)
    assert.equal(weight(-0), 1)
    assert.equal(weight(-345.34e34), 1)
    assert.equal(weight(''), 1)
    assert.equal(weight('foo'), 1)
    assert.equal(weight('\n'), 1)
  })
  it('sums weights of constituents in composite value plus one', function () {
    assert.equal(weight(universe.List('NumberList')([])), 1)
    assert.equal(weight(universe.List('NumberList')([42, 54, 66])), 4)
    assert.equal(weight(universe.Dictionary('NumberDictionary')({})), 1)
    assert.equal(weight(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54, baz: 66 })), 4)
    assert.equal(weight(universe.Record<Link<number>>('NumberLink')({ head: 42 })), 5)
    assert.equal(weight(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })), 13)
  })
})

describe('index ownership', function () {
  it('is not possible with simple value', function () {
    assert.ok(!owns(null, 1))
    assert.ok(!owns(null, 'foo'))
    assert.ok(!owns(false, 1))
    assert.ok(!owns(false, 'foo'))
    assert.ok(!owns(3.14, 1))
    assert.ok(!owns(3.14, 'foo'))
    assert.ok(!owns('foo', 1))
    assert.ok(!owns('foo', 'foo'))
  })
  it('tests integer indices of list value', function () {
    assert.ok(!owns(universe.List('NumberList')([]), 1))
    assert.ok(!owns(universe.List('NumberList')([]), 'foo'))
    assert.ok(!owns(universe.List('NumberList')([42, 54, 66]), 0))
    assert.ok(!owns(universe.List('NumberList')([42, 54, 66]), 'foo'))
    assert.ok(owns(universe.List('NumberList')([42, 54, 66]), 1))
    assert.ok(owns(universe.List('NumberList')([42, 54, 66]), 3))
    assert.ok(!owns(universe.List('NumberList')([42, 54, 66]), 4))
  })
  it('tests string keys of dictionary value', function () {
    assert.ok(!owns(universe.Dictionary('NumberDictionary')({}), 0))
    assert.ok(!owns(universe.Dictionary('NumberDictionary')({}), 1))
    assert.ok(!owns(universe.Dictionary('NumberDictionary')({}), 'foo'))
    assert.ok(!owns(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 0))
    assert.ok(!owns(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 1))
    assert.ok(owns(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'foo'))
    assert.ok(owns(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'bar'))
    assert.ok(!owns(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'baz'))
  })
  it('tests string selectors of record value', function () {
    assert.ok(!owns(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 0))
    assert.ok(!owns(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 1))
    assert.ok(!owns(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'foo'))
    assert.ok(owns(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'head'))
    assert.ok(owns(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'tail'))
    assert.ok(!owns(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 0))
    assert.ok(!owns(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 1))
    assert.ok(!owns(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 'foo'))
    assert.ok(owns(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 'head'))
    assert.ok(owns(universe.Record<Link<number>>('NumberLink')
      ({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }), 'tail'))
  })
})

describe('constituent probing', function () {
  it('is undefined on simple value', function () {
    assert.strictEqual(probe(null, 1), void 0)
    assert.strictEqual(probe(null, 'foo'), void 0)
    assert.strictEqual(probe(false, 1), void 0)
    assert.strictEqual(probe(false, 'foo'), void 0)
    assert.strictEqual(probe(3.14, 1), void 0)
    assert.strictEqual(probe(3.14, 'foo'), void 0)
    assert.strictEqual(probe('foo', 1), void 0)
    assert.strictEqual(probe('foo', 'foo'), void 0)
  })
  it('finds element of list value', function () {
    assert.strictEqual(probe(universe.List('NumberList')([]), 1), void 0)
    assert.strictEqual(probe(universe.List('NumberList')([]), 'foo'), void 0)
    assert.strictEqual(probe(universe.List('NumberList')([42, 54, 66]), 0), void 0)
    assert.strictEqual(probe(universe.List('NumberList')([42, 54, 66]), 'foo'), void 0)
    assert.strictEqual(probe(universe.List('NumberList')([42, 54, 66]), 1), 42)
    assert.strictEqual(probe(universe.List('NumberList')([42, 54, 66]), 3), 66)
    assert.strictEqual(probe(universe.List('NumberList')([42, 54, 66]), 4), void 0)
  })
  it('finds element of dictionary value', function () {
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({}), 0), void 0)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({}), 1), void 0)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({}), 'foo'), void 0)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 0), void 0)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 1), void 0)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'foo'), 42)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'bar'), 54)
    assert.strictEqual(probe(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'baz'), void 0)
  })
  it('finds field of record value', function () {
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 0), void 0)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 1), void 0)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'foo'), void 0)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'head'), 42)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'tail'), null)
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 0), void 0)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 1), void 0)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 'foo'), void 0)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 'head'), 42)
    assert.strictEqual(probe(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 'tail'), tail)
  })
})

describe('constituent seeking', function () {
  it('fails on simple value', function () {
    assert.throws(() => seek(null, 1))
    assert.throws(() => seek(null, 'foo'))
    assert.throws(() => seek(false, 1))
    assert.throws(() => seek(false, 'foo'))
    assert.throws(() => seek(3.14, 1))
    assert.throws(() => seek(3.14, 'foo'))
    assert.throws(() => seek('foo', 1))
    assert.throws(() => seek('foo', 'foo'))
  })
  it('either finds element of list value or fails', function () {
    assert.throws(() => seek(universe.List('NumberList')([]), 1))
    assert.throws(() => seek(universe.List('NumberList')([]), 'foo'))
    assert.throws(() => seek(universe.List('NumberList')([42, 54, 66]), 0))
    assert.throws(() => seek(universe.List('NumberList')([42, 54, 66]), 'foo'))
    assert.strictEqual(seek(universe.List('NumberList')([42, 54, 66]), 1), 42)
    assert.strictEqual(seek(universe.List('NumberList')([42, 54, 66]), 3), 66)
    assert.throws(() => seek(universe.List('NumberList')([42, 54, 66]), 4))
  })
  it('either finds element of dictionary value or fails', function () {
    assert.throws(() => seek(universe.Dictionary('NumberDictionary')({}), 0))
    assert.throws(() => seek(universe.Dictionary('NumberDictionary')({}), 1))
    assert.throws(() => seek(universe.Dictionary('NumberDictionary')({}), 'foo'))
    assert.throws(() => seek(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 0))
    assert.throws(() => seek(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 1))
    assert.strictEqual(seek(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'foo'), 42)
    assert.strictEqual(seek(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'bar'), 54)
    assert.throws(() => seek(universe.Dictionary('NumberDictionary')({ foo: 42, bar: 54 }), 'baz'))
  })
  it('either finds field of record value or fails', function () {
    assert.throws(() => seek(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 0))
    assert.throws(() => seek(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 1))
    assert.throws(() => seek(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'foo'))
    assert.strictEqual(seek(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'head'), 42)
    assert.strictEqual(seek(universe.Record<Link<number>>('NumberLink')({ head: 42 }), 'tail'), null)
    const tail = NumberLink({ head: 54, tail: NumberLink({ head: 66 }) })
    assert.throws(() => seek(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 0))
    assert.throws(() => seek(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 1))
    assert.throws(() => seek(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 'foo'))
    assert.strictEqual(seek(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 'head'), 42)
    assert.strictEqual(seek(universe.Record<Link<number>>('NumberLink')({ head: 42, tail }), 'tail'), tail)
  })
})

describe('value equivalence testing', function () {
  it('compares identity of simple values', function () {
    const values = [null, false, true, 0, 1, -1, 3.14, '', 'foo']
    for (const value of values) {
      for (const otherValue of values) {
        assert.ok(equivalent(value, otherValue) === (value === otherValue))
      }
    }
  })
  it('compares structure of list values', function () {
    const IndirectList = universe.List<number>('NumberList')
    assert.ok(equivalent(NumberList([]), NumberList([])))
    assert.ok(equivalent(NumberList([]), IndirectList([])))
    assert.ok(equivalent(NumberList([42]), NumberList([42])))
    assert.ok(equivalent(NumberList([42]), IndirectList([42])))
    assert.ok(equivalent(NumberList([42, 54]), NumberList([42, 54])))
    assert.ok(equivalent(NumberList([42, 54]), IndirectList([42, 54])))
    assert.ok(equivalent(NumberList([42, 54, 66]), NumberList([42, 54, 66])))
    assert.ok(equivalent(NumberList([42, 54, 66]), IndirectList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([]), NumberList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([]), IndirectList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([42]), NumberList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([42]), IndirectList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([42, 54]), NumberList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([42, 54]), IndirectList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([42, 54, 68]), NumberList([42, 54, 66])))
    assert.ok(!equivalent(NumberList([42, 54, 68]), IndirectList([42, 54, 66])))
  })
  it('compares structure of dictionary values', function () {
    const IndirectDictionary = universe.Dictionary<number>('NumberDictionary')
    assert.ok(equivalent(NumberDictionary({}), NumberDictionary({})))
    assert.ok(equivalent(NumberDictionary({}), IndirectDictionary({})))
    assert.ok(equivalent(NumberDictionary({ foo: 42 }), NumberDictionary({ foo: 42 })))
    assert.ok(equivalent(NumberDictionary({ foo: 42 }), IndirectDictionary({ foo: 42 })))
    assert.ok(equivalent(NumberDictionary({ foo: 42, bar: 54 }), NumberDictionary({ foo: 42, bar: 54 })))
    assert.ok(equivalent(NumberDictionary({ foo: 42, bar: 54 }), IndirectDictionary({ foo: 42, bar: 54 })))
    assert.ok(equivalent(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(equivalent(NumberDictionary({ foo: 42, bar: 54, baz: 66 }), IndirectDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({}), NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({}), IndirectDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({ foo: 42 }), NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({ foo: 42 }), IndirectDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({ foo: 42, bar: 54 }), NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({ foo: 42, bar: 54 }), IndirectDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({ foo: 42, bar: 54, baz: 68 }), NumberDictionary({ foo: 42, bar: 54, baz: 66 })))
    assert.ok(!equivalent(NumberDictionary({ foo: 42, bar: 54, baz: 68 }), IndirectDictionary({ foo: 42, bar: 54, baz: 66 })))
  })
  it('compares structure of record values', function () {
    assert.ok(equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42 }),
      universe.Record<Link<number>>('NumberLink')({ head: 42 })))
    assert.ok(equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42 }),
      universe.Record<Link<number>>('Link(number)')({ head: 42 })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42 }),
      universe.Record<Link<number>>('NumberLink')({ head: 54 })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42 }),
      universe.Record<Link<number>>('Link(number)')({ head: 54 })))
    assert.ok(equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('Link(number)')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('NumberLink')({ head: 2, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('Link(number)')({ head: 2, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 4, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('Link(number)')({ head: 42, tail: NumberLink({ head: 4, tail: NumberLink({ head: 66 }) }) })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 6 }) }) })))
    assert.ok(!equivalent(
      universe.Record<Link<number>>('NumberLink')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 66 }) }) }),
      universe.Record<Link<number>>('Link(number)')({ head: 42, tail: NumberLink({ head: 54, tail: NumberLink({ head: 6 }) }) })))
  })
})