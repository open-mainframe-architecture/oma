import * as assert from 'assert'
import * as mocha from 'mocha'

import * as datatype from 'oma/datatype'

const { parseDefinitions, parseType } = datatype

import Typespace from 'oma/data/typespace'

describe('typespace with definitions', function () {
  const typespace = new Typespace(parseDefinitions({
    Any: '?*',
    List: '(T=Any)[T]',
    Dictionary: '(T=Any)<T>',
    Maybe: '(T=Any)?T',
    OptionalString: '?string',
    'Foo.Bar': '{foo:string,bar:number}',
    'Other.Name': 'Foo.Bar',
    'Optional.Foo.Bar': '?Foo.Bar',
    'Dictionary.Or.List': 'Dictionary|List'
  }))
  it('evaluates simple type', function () {
    assert.strictEqual(typespace.evaluate('none'), parseType('none'))
    assert.strictEqual(typespace.evaluate('boolean'), parseType('boolean'))
    assert.strictEqual(typespace.evaluate('number'), parseType('number'))
    assert.strictEqual(typespace.evaluate('string'), parseType('string'))
    assert.strictEqual(typespace.evaluate('integer'), parseType('integer'))
    assert.strictEqual(typespace.evaluate('"foo"_"bar"'), parseType('"foo"_"bar"'))
  })
  it('evaluates idempotent optional type', function () {
    assert.strictEqual(typespace.evaluate('Any'), parseType('?*'))
    assert.strictEqual(typespace.evaluate('Maybe(integer)'), parseType('?integer'))
    assert.strictEqual(typespace.evaluate('Maybe(Foo.Bar)'), parseType('?Foo.Bar'))
    assert.strictEqual(typespace.evaluate('Maybe(OptionalString)'), parseType('?string'))
    assert.strictEqual(typespace.evaluate('Maybe(Maybe(integer))'), parseType('?integer'))
  })
  it('evaluates optional none type as none', function () {
    assert.strictEqual(typespace.evaluate('Maybe(none)'), parseType('none'))
  })
  it('evaluates list type', function () {
    assert.strictEqual(typespace.evaluate('[number]'), parseType('[number]'))
    assert.strictEqual(typespace.evaluate('List'), parseType('[Any]'))
    assert.strictEqual(typespace.evaluate('List(string)'), parseType('[string]'))
    assert.strictEqual(typespace.evaluate('List(Foo.Bar)'), parseType('[Foo.Bar]'))
    assert.strictEqual(typespace.evaluate('List(List(string))'), parseType('[List(string)]'))
  })
  it('evaluates dictionary type', function () {
    assert.strictEqual(typespace.evaluate('<number>'), parseType('<number>'))
    assert.strictEqual(typespace.evaluate('Dictionary'), parseType('<Any>'))
    assert.strictEqual(typespace.evaluate('Dictionary(number)'), parseType('<number>'))
    assert.strictEqual(typespace.evaluate('Dictionary(Foo.Bar)'), parseType('<Foo.Bar>'))
    assert.strictEqual(typespace.evaluate('Dictionary(Dictionary(number))'), parseType('<Dictionary(number)>'))
  })
  it('evaluates record type', function () {
    assert.strictEqual(typespace.evaluate('{foo:string,bar:number}'), parseType('{foo:string,bar:number}'))
    assert.strictEqual(typespace.evaluate('Foo.Bar'), parseType('{foo:string,bar:number}'))
  })
  it('evaluates record addition', function () {
    assert.strictEqual(typespace.evaluate('Foo.Bar+{baz:boolean}'), parseType('{foo:string,bar:number,baz:boolean}'))
    assert.strictEqual(typespace.evaluate('{baz:string}+{baz:number}+{baz:boolean}'), parseType('{baz:boolean}'))
  })
  it('evaluates union type', function () {
    assert.strictEqual(typespace.evaluate('Foo.Bar|[number]'), parseType('Foo.Bar|[number]'))
  })
  it('removes duplicates from evaluated union', function () {
    assert.strictEqual(typespace.evaluate('Foo.Bar|Foo.Bar|[number]'), parseType('Foo.Bar|[number]'))
    assert.strictEqual(typespace.evaluate('Foo.Bar|Foo.Bar'), parseType('{foo:string,bar:number}'))
    assert.strictEqual(typespace.evaluate('?Foo.Bar|Foo.Bar'), parseType('?Foo.Bar'))
    assert.strictEqual(typespace.evaluate('Foo.Bar|{foo:string,bar:number}'), parseType('{foo:string,bar:number}'))
    assert.strictEqual(typespace.evaluate('Optional.Foo.Bar|Optional.Foo.Bar'), parseType('?Foo.Bar'))
    assert.strictEqual(typespace.evaluate('Optional.Foo.Bar|Foo.Bar'), parseType('?Foo.Bar'))
    assert.strictEqual(typespace.evaluate('number|number'), parseType('number'))
  })
  it('combines enumerated choices of evaluated union', function () {
    assert.strictEqual(typespace.evaluate('"a"|"a"|"a"|"a"'), parseType('"a"'))
    assert.strictEqual(typespace.evaluate('"a"|"b"|number|"c"_"d"'), parseType('"a"_"b"_"c"_"d"|number'))
  })
  it('removes superfluous alternatives from evaluated union', function () {
    assert.strictEqual(typespace.evaluate('string|number|*'), parseType('*'))
    assert.strictEqual(typespace.evaluate('string|number|integer'), parseType('string|number'))
    assert.strictEqual(typespace.evaluate('string|number|"a"_"b"'), parseType('string|number'))
  })
  it('evaluates union with optional alternative as optional type', function () {
    assert.strictEqual(typespace.evaluate('OptionalString|[number]'), parseType('?string|[number]'))
  })
  it('evaluates union with none alternative as optional type', function () {
    assert.strictEqual(typespace.evaluate('string|[number]|none'), parseType('?string|[number]'))
  })
  it('flattens nested union alternatives of an evaluated union', function() {
    assert.strictEqual(typespace.evaluate('string|Dictionary.Or.List|number'), parseType('number|string|Dictionary|List'))
  })
  it('evaluates type reference', function () {
    assert.throws(() => typespace.evaluate('Nonexisting.Name'))
    assert.strictEqual(typespace.evaluate('Other.Name'), typespace.evaluate('Foo.Bar'))
  })
  it('evaluates macro with default arguments', function () {
    assert.strictEqual(typespace.evaluate('(T=number,U=string)T|List(U)'), parseType('number|List(string)'))
  })
  it('cannot evaluate free variable', function () {
    assert.throws(() => typespace.evaluate('T'))
  })
})