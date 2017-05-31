import * as assert from 'assert'
import * as mocha from 'mocha'

import * as loop from 'oma/loop'
import * as datatype from 'oma/datatype'

const { keys, values } = loop
const {
  isDictionaryType,
  isListType,
  isRecordType,
  parseDefinitions,
  parseEnumerationType,
  parseOptionalType,
  parseRecordType,
  parseType,
  parseUnionType
} = datatype

describe('datatype definition language', function () {
  it('never creates identical expression twice', function () {
    assert.strictEqual(parseType('*'), parseType('*'))
    assert.strictEqual(parseType('none'), parseType('none'))
    assert.strictEqual(parseType('boolean'), parseType('boolean'))
    assert.strictEqual(parseType('number'), parseType('number'))
    assert.strictEqual(parseType('string'), parseType('string'))
    assert.strictEqual(parseType('integer'), parseType('integer'))
    assert.strictEqual(parseType('"foo"_"bar"'), parseType('"foo"_"bar"'))
    assert.strictEqual(parseType('?string'), parseType('?string'))
    assert.strictEqual(parseType('[string]'), parseType('[string]'))
    assert.strictEqual(parseType('<number>'), parseType('<number>'))
    assert.strictEqual(parseType('{}'), parseType('{}'))
    assert.strictEqual(parseType('{foo:number,bar:string}'), parseType('{foo:number,bar:string}'))
    assert.strictEqual(parseType('string|number'), parseType('string|number'))
    assert.strictEqual(parseType('Foo+Bar'), parseType('Foo+Bar'))
    assert.strictEqual(parseType('Foo(Bar,Baz)'), parseType('Foo(Bar,Baz)'))
    assert.strictEqual(parseType('Foo.Bar'), parseType('Foo.Bar'))
    assert.strictEqual(parseType('(T=string)T'), parseType('(T=string)T'))
    assert.strictEqual(parseType('T'), parseType('T'))
  })
  it('ignores order in enumerations', function () {
    assert.strictEqual(parseType('"foo"_"bar"'), parseType('"bar"_"foo"'))
    assert.strictEqual(parseType('"foo"_"bar"_"baz"'), parseType('"bar"_"baz"_"foo"'))
  })
  it('ignores order of record fields', function () {
    assert.strictEqual(parseType('{foo:number,bar:string}'), parseType('{bar:string,foo:number}'))
    assert.strictEqual(parseType('{foo:number,bar:string,baz:boolean}'), parseType('{bar:string,baz:boolean,foo:number}'))
  })
  it('ignores order in unions', function () {
    assert.strictEqual(parseType('string|number'), parseType('number|string'))
    assert.strictEqual(parseType('string|number|boolean'), parseType('number|boolean|string'))
  })
  it('ignores superfluous whitespaces', function () {
    assert.strictEqual(parseType(' *'), parseType('*'))
    assert.strictEqual(parseType(' string  '), parseType('  string '))
    assert.strictEqual(parseType(' ?string  '), parseType('?  string '))
    assert.strictEqual(parseType('[ string]  '), parseType('  [string ]'))
    assert.strictEqual(parseType('< string>  '), parseType('  <string >'))
    assert.strictEqual(parseType('{\nfoo\t: number,\n bar\t: string\n}'), parseType('{foo:number,bar:string}'))
    assert.strictEqual(parseType('Foo  +Bar '), parseType(' Foo+ Bar'))
    assert.strictEqual(parseType(' Foo (\t Bar,\n  Baz )'), parseType('Foo(Bar,Baz)'))
    assert.strictEqual(parseType(' Foo.Bar  '), parseType('  Foo.Bar '))
    assert.strictEqual(parseType('(\t T = string )\nT'), parseType('(T=string)T'))
    assert.strictEqual(parseType(' T'), parseType('T'))
  })
  it('rejects malformed sources', function () {
    assert.throws(() => parseType(''))
    assert.throws(() => parseType('?'))
    assert.throws(() => parseType('[]'))
    assert.throws(() => parseType('string[]'))
    assert.throws(() => parseType('<string'))
    assert.throws(() => parseType('Foo.Bar+'))
    assert.throws(() => parseType('"foo"_'))
  })
  it('constructs definitions from source objects', function () {
    assert.deepEqual(parseDefinitions({ Foo: { bar: 'number' } }), {
      Foo: parseType('{bar:number}')
    })
    assert.deepEqual(parseDefinitions({ Foo: { bar: 'number @foo=bla' } }), {
      Foo: parseType('{bar:number @foo=bla}')
    })
    assert.deepEqual(parseDefinitions({ Foo: { bar: { baz: 'number' } } }), {
      Foo: parseType('{bar:{baz:number}}')
    })
    assert.deepEqual(parseDefinitions({ Foo: { bar: { baz: 'number @bla=foo' } } }), {
      Foo: parseType('{bar:{baz:number @bla=foo}}')
    })
    assert.deepEqual(parseDefinitions({ Foo: { constructors$: 'Bla', bar: 'number' } }), {
      Foo: parseType('Bla({bar:number})')
    })
    assert.deepEqual(parseDefinitions({ Foo: { constructors$: 'Bla Baz', bar: 'number' } }), {
      Foo: parseType('Bla(Baz({bar:number}))')
    })
    assert.deepEqual(parseDefinitions({ Foo: { arguments$: 'T=number, U=Baz', bar: 'T', baz: 'U' } }), {
      Foo: parseType('(T=number,U=Baz){bar:T,baz:U}')
    })
    const sources1 = {
      Foo: '[string]',
      Bar: 'number'
    }
    assert.deepEqual(parseDefinitions(sources1), { Foo: parseType('[string]'), Bar: parseType('number') })
    const sources2 = {
      Foo: { super$: 'Baz', bar: 'number' },
      Baz: { foo: '[string]' }
    }
    assert.deepEqual(parseDefinitions(sources1, sources2), {
      Foo: parseType('Baz+{bar:number}'),
      Bar: parseType('number'),
      Baz: parseType('{foo:[string]}')
    })
  })
  it('constructs enumeration from a nonempty set of choices', function () {
    assert.throws(() => parseEnumerationType(new Set()))
    assert.strictEqual(parseEnumerationType(new Set(['y'])), parseType('"y"'))
    assert.strictEqual(parseEnumerationType(new Set(['a', 'b', 'c'])), parseType('"a"_"b"_"c"'))
  })
  it('constructs optional from mandatory type', function () {
    assert.throws(() => parseOptionalType(parseType('?string')))
    assert.strictEqual(parseOptionalType(parseType('none')), parseType('?none'))
    assert.strictEqual(parseOptionalType(parseType('number')), parseType('?number'))
    assert.strictEqual(parseOptionalType(parseType('Foo.Bar')), parseType('?Foo.Bar'))
  })
  it('constructs record type from field definitions', function () {
    assert.strictEqual(parseRecordType({}), parseType('{}'))
    assert.strictEqual(parseRecordType({ foo: parseType('number'), bar: parseType('string') }),
      parseType('{foo:number,bar:string}'))
  })
  it('constructs union from a nonempty set of alternatives', function () {
    assert.throws(() => parseUnionType(new Set()))
    assert.strictEqual(parseUnionType(new Set([parseType('string'), parseType('number'), parseType('Foo.Bar')])),
      parseType('string|number|Foo.Bar'))
  })
  it('tests whether expression is a list, dictionary or record type', function() {
    assert.ok(!isListType(parseType('string')))
    assert.ok(isListType(parseType('[string]')))
    assert.ok(!isListType(parseType('<string>')))
    assert.ok(!isListType(parseType('{foo:string}')))
    assert.ok(!isDictionaryType(parseType('string')))
    assert.ok(!isDictionaryType(parseType('[string]')))
    assert.ok(isDictionaryType(parseType('<string>')))
    assert.ok(!isDictionaryType(parseType('{foo:string}')))
    assert.ok(!isRecordType(parseType('string')))
    assert.ok(!isRecordType(parseType('[string]')))
    assert.ok(!isRecordType(parseType('<string>')))
    assert.ok(isRecordType(parseType('{foo:string}')))
  })
})

describe('datatype function pattern', function () {
  const wildcard = parseType('*')
  it('dispatches wildcard', function () {
    assert.ok(wildcard.dispatch<boolean>({ wildcard: expression => expression === wildcard, default: () => false }))
  })
  const none = parseType('none')
  it('dispatches none', function () {
    assert.ok(none.dispatch<boolean>({ none: expression => expression === none, default: () => false }))
  })
  const boolean = parseType('boolean')
  it('dispatches boolean', function () {
    assert.ok(boolean.dispatch<boolean>({ boolean: expression => expression === boolean, default: () => false }))
  })
  const number = parseType('number')
  it('dispatches number', function () {
    assert.ok(number.dispatch<boolean>({ number: expression => expression === number, default: () => false }))
  })
  const string = parseType('string')
  it('dispatches string', function () {
    assert.ok(string.dispatch<boolean>({ string: expression => expression === string, default: () => false }))
  })
  const integer = parseType('integer')
  it('dispatches integer', function () {
    assert.ok(integer.dispatch<boolean>({ integer: expression => expression === integer, default: () => false }))
  })
  const enumeration = parseType('"foo"_"bar"')
  it('dispatches choices of enumeration', function () {
    assert.ok(enumeration.dispatch<boolean>({
      enumeration: (expression, choices) => expression === enumeration &&
        choices.size === 2 && ['foo', 'bar'].every(choice => choices.has(choice)),
      default: () => false
    }))
  })
  const optional = parseType('?string')
  it('dispatches mandatory type of optional', function () {
    assert.ok(optional.dispatch<boolean>({
      optional: (expression, mandatory) => expression === optional && mandatory === string,
      default: () => false
    }))
  })
  const list = parseType('[integer]')
  it('dispatches elementary type of list', function () {
    assert.ok(list.dispatch<boolean>({
      list: (expression, elementary) => expression === list && elementary === integer,
      default: () => false
    }))
  })
  const dictionary = parseType('<boolean>')
  it('dispatches elementary type of dictionary', function () {
    assert.ok(dictionary.dispatch<boolean>({
      dictionary: (expression, elementary) => expression === dictionary && elementary === boolean,
      default: () => false
    }))
  })
  const record = parseType('{foo:number,bar:string}')
  it('dispatches field types of record', function () {
    assert.ok(record.dispatch<boolean>({
      record: (expression, fields) => expression === record && fields.foo === number && fields.bar === string,
      default: () => false
    }))
  })
  const union = parseType('string|number')
  it('dispatches alternatives of union', function () {
    assert.ok(union.dispatch<boolean>({
      union: (expression, alternatives) => expression === union &&
        alternatives.size === 2 && [string, number].every(alternative => alternatives.has(alternative)),
      default: () => false
    }))
  })
  const addition = parseType('Foo+Bar'), Foo = parseType('Foo'), Bar = parseType('Bar')
  it('dispatches cascade of addition', function () {
    assert.ok(addition.dispatch<boolean>({
      addition: (expression, cascade) => expression === addition &&
        cascade.map(term => term.unparsed).join() === 'Foo,Bar',
      default: () => false
    }))
  })
  const application = parseType('Foo(Bar,Baz)'), Baz = parseType('Baz')
  it('dispatches name and parameters of application', function () {
    assert.ok(application.dispatch<boolean>({
      application: (expression, name, parameters) => expression === application && name === 'Foo' &&
        parameters.map(parameter => parameter.unparsed).join() === 'Bar,Baz',
      default: () => false
    }))
  })
  const reference = parseType('Foo.Bar')
  it('dispatches reference', function () {
    assert.ok(reference.dispatch<boolean>({
      reference: expression => expression === reference && expression.unparsed === 'Foo.Bar',
      default: () => false
    }))
  })
  const macro = parseType('(T=Foo,U=Bar)T'), variable = parseType('T')
  it('dispatches formal arguments and body of macro', function () {
    assert.ok(macro.dispatch<boolean>({
      macro: (expression, formals, body) => expression === macro &&
        [...keys(formals)].join() === 'T,U' &&
        [...values(formals)].map(expression => expression.unparsed).join() === 'Foo,Bar' &&
        body === variable,
      default: () => false
    }))
  })
  it('dispatches variable', function () {
    assert.ok(variable.dispatch<boolean>({
      variable: expression => expression === variable && expression.unparsed === 'T',
      default: () => false
    }))
  })
})