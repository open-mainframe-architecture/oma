import { Definitions, Expression, TypePattern } from 'oma/datatype'

const { isArray } = Array
const { min } = Math
const { isFinite } = Number
const { create, is } = Object

import * as always from 'oma/always'
import * as datatype from 'oma/datatype'
import * as loop from 'oma/loop'

const { returnFalse, returnK, returnTrue } = always
const { isDictionaryType, isListType, isRecordType, parseType } = datatype
const { empty, keys } = loop

/**
 * Specify the source of a datatype expression or pass an existing datatype expression.
 */
export type TypeExpression = string | Expression

/**
 * A typespace evaluates datatype expressions.
 */
export interface Typespace {

  /**
   * Iterate over datatype names and expressions that are defined in this space.
   */
  readonly definitions: IterableIterator<[string, Expression]>

  /**
   * Evaluate a datatype expression in this space.
   * @param type Textual source of type expression or an existing type expression
   * @returns Expression of evaluated datatype
   */
  evaluate(type: TypeExpression): Expression

}

/**
 * Default implementation of a typespace constructor is provided by module oma/data/typespace.
 */
export type TypespaceConstructor = new (definitions: Definitions) => Typespace

/**
 * A data value is either simple or composite.
 */
export type Value = Simple | Composition

/**
 * A simple value is null, false, true, a finite number or a string.
 */
export type Simple = null | boolean | number | string

/**
 * The constituents of a composite value are indexed by a string or a number.
 */
export type Index = string | number

/**
 * A generic composition lacks type information about indices and constituents.
 */
export interface Composition extends Composite<Index, Value> { }

/**
 * A composite value is made from constituents, which are located at a unique index.
 */
export interface Composite<Ix extends Index, T extends Value> {

  /**
   * The typespace of this composite defines all types.
   */
  readonly typespace$: Typespace

  /**
   * The dynamic type specifies the 'user-friendly' type of this composite.
   */
  readonly dynamic$: Expression

  /**
   * The concrete type has constructed this composite.
   * The concrete list, dictionary or record type is derived from the dynamic type. 
   */
  readonly concrete$: Expression

  /**
   * Iterate over the indices of this composite.
   */
  readonly indices$: IterableIterator<Ix>

  /**
   * Iterate over the constituent values of this composite.
   */
  readonly constituents$: IterableIterator<T>

  /**
   * Iterate over the associations of this composite.
   * An association is an array that pairs an index with a constituent.
   */
  readonly associations$: IterableIterator<[Ix, T]>

  /**
   * The width counts the number of constituents from which this composite is made.
   */
  readonly width$: number

  /**
   * The weight counts the number of internal nodes in this composite.
   */
  readonly weight$: number

  /**
   * Obtain a constituent.
   * @param ix Index of constituent
   * @returns Constituent value or undefined if this composite does not own the index
   */
  at$(index: Ix): T | undefined

}

/**
 * A list is a sequence of values.
 * List indices start at 1. Negative indices select from the end of the list.
 */
export interface List<T extends Value> extends Composite<number, T> {

  /**
   * The type of elements in this list.
   */
  readonly elementary$: Expression

}

/**
 * A dictionary maps string keys to constituents.
 */
export interface Dictionary<T extends Value> extends Composite<string, T> {

  /**
   * The type of elements in this dictionary.
   */
  readonly elementary$: Expression

}

/**
 * A record skeleton maps string selectors to constituents.
 */
export interface RecordSkeleton extends Composite<string, Value> {

  /**
   * Iterate over fields.
   * An iterated field is an array with a selector name, a constituent value and an annotations dictionary.
   */
  readonly fields$: IterableIterator<[string, Value, Dictionary<string>]>

  /**
   * Obtain the type of a field.
   * @param selector Field name
   * @returns A type expression
   * @throws When the selector is invalid
   */
  selective$(selector: string): Expression

  /**
   * Obtain the annotations dictionary of a field.
   * @param selector Field name
   * @returns A string dictionary
   * @throws When the selector is invalid
   */
  annotations$(selector: string): Dictionary<string>

}

/**
 * A record adds field type information to its skeleton.
 */
export type Record<T> = RecordSkeleton & T

/**
 * A data shape is the JSON representation of a data value.
 */
export type Shape = Simple | ArrayShape | ListShape | DictionaryShape | RecordShape

/**
 * An array is the untyped JSON representation of a list value.
 */
export interface ArrayShape extends Array<Shape> { }

/**
 * An object shape optionally defines a type for the value to reconstruct.
 */
export interface ObjectShape {

  /**
   * If defined, the dynamic type of the value to reconstruct from this shape.
   */
  readonly $?: string

}

/**
 * A list shape is the typed JSON representation of a list value.
 */
export interface ListShape extends ObjectShape {

  /**
   * Dynamic type of list value. It must be defined, because untyped list values are shaped with arrays.
   */
  readonly $: string

  /**
   * Shape elements to reconstruct.
   */
  readonly _: Array<Shape>

}

/**
 * A dictionary shape is the JSON representation of a dictionary value.
 */
export interface DictionaryShape extends ObjectShape {

  /**
   * Map dictionary keys to shape elements.
   */
  readonly _: { readonly [key: string]: Shape }

}

/**
 * A record shape is the JSON representation of a record value.
 */
export interface RecordShape {

  /**
   * Map field selectors to field shapes. This includes $ property with dynamic type.
   */
  readonly [selector: string]: Shape

}

/**
 * A closure tests whether something is a member of a type.
 */
export type MemberTester<T extends Value> = (it: any) => it is T

/**
 * A list factory constructs list values.
 */
export type ListFactory<T extends Value> = (elements: T[]) => List<T>

/**
 * A dictionary factory constructs dictionary values.
 */
export type DictionaryFactory<T extends Value> = (elements: { readonly [key: string]: T }) => Dictionary<T>

/**
 * A record factory constructs record values.
 */
export type RecordFactory<T> = (fields: T) => Record<T>

/**
 * A list unmarshaller restores a list from an array of shapes.
 */
export type ListUnmarshaller = (shapes: Shape[], inferred: Expression) => List<Value>

/**
 * A dictionary unmarshaller restores a dictionary from an object with keyed shapes.
 */
export type DictionaryUnmarshaller = (shapes: { readonly [key: string]: Shape }, inferred: Expression) => Dictionary<Value>

/**
 * A record unmarshaller restores a record from an object with 'selective' shapes.
 */
export type RecordUnmarshaller = (shapes: { readonly [selector: string]: Shape }, inferred: Expression) => Record<{}>

/**
 * A universe provides primitives to manipulate data values, e.g. creation of composite values.
 */
export interface Universe {

  /**
   * Type definitions. 
   */
  readonly typespace: Typespace

  /**
   * Obtain a tester.
   * @param type Type whose membership is tested
   * @returns A closure that tests whether something is a member of the type
   */
  tester<T extends Value>(type: TypeExpression): MemberTester<T>

  /**
   * Obtain a list factory.
   * @param type Dynamic type of list values
   * @returns A closure that creates a list value from an array of values
   */
  List<T extends Value>(type: TypeExpression): ListFactory<T>

  /**
   * Obtain a dictionary factory.
   * @param type Dynamic type of dictionary values
   * @returns A closure that creates a dictionary value from a JavaScript object
   */
  Dictionary<T extends Value>(type: TypeExpression): DictionaryFactory<T>

  /**
   * Obtain a dictionary factory.
   * @param type Dynamic type of dictionary values
   * @returns A closure that creates a record value from a JavaScript object
   */
  Record<T>(type: TypeExpression): RecordFactory<T>

  /**
   * Marshal value to a JSON shape.
   * @param value Value to marshal
   * @param inferredType If defined, dynamic type inferred from context
   * @returns A JSON shape
   */
  marshal(value: Value, inferredType?: TypeExpression): Shape

  /**
   * Unmarshal value from a JSON shape.
   * @param shape JSON shape to unmarshal
   * @param inferredType If defined, dynamic type inferred from context
   * @returns A value
   */
  unmarshal(shape: Shape, inferredType?: TypeExpression): Value

  /**
   * Change parts of a composite value.
   * @param value Original composite value
   * @param revisions Map index to modified constituent
   * @returns Changed value
   */
  change<T extends Value>(value: List<T>, revisions: { readonly [index: string]: T | undefined }): List<T>
  change<T extends Value>(value: Dictionary<T>, revisions: { readonly [index: string]: T | undefined }): Dictionary<T>
  change<T>(value: Record<T>, revisions: { readonly [K in keyof T]?: T[K]}): Record<T>

}

/**
 * A universe is constructed with the definitions of a typespace.
 * The default implementation, the primal universe, is provided by module oma/data/universe.
 */
export type UniverseConstructor = new (typespace: Typespace) => AbstractUniverse

/**
 * Mixins add functionality to a universe.
 * Several mixin implementations are provided in oma/data/universe/.
 */
export type UniverseMixin = (BaseUniverse: UniverseConstructor) => UniverseConstructor

/**
 * An abstract universe adds protected methods that mixins can improve.
 */
export abstract class AbstractUniverse implements Universe {

  /**
   * Construct universe.
   * @param typespace Type definitions for universe
   */
  constructor(public readonly typespace: Typespace) { }

  /**
   * Obtain factory for composite list values.
   * @param dynamic Dynamic type expression
   * @param concrete Concrete list type, derived from dynamic type
   * @param elementary Type of list elements
   * @returns A list factory
   */
  protected listFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): ListFactory<T> {
    throw new Error('not implemented')
  }

  /**
   * Obtain factory for composite dictionary values.
   * @param dynamic Dynamic type expression
   * @param concrete Concrete dictionary type, derived from dynamic type
   * @param elementary Type of dictionary elements
   * @returns A dictionary factory
   */
  protected dictionaryFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): DictionaryFactory<T> {
    throw new Error('not implemented')
  }

  /**
   * Obtain factory for composite record values.
   * @param dynamic Dynamic type expression
   * @param concrete Concrete record type, derived from dynamic type
   * @param fields Mapping from string selector to field definition
   * @returns A record factory
   */
  protected recordFactory<T>(dynamic: Expression, concrete: Expression, fields: Definitions): RecordFactory<T> {
    throw new Error('not implemented')
  }

  /**
   * Obtain a closure that tests membership of values.
   * @param evaluated Expression to test is either a simple, list, dictionary, record, optional or union type
   * @returns A member tester
   */
  protected memberTester<T extends Value>(evaluated: Expression): MemberTester<T> {
    throw new Error('not implemented')
  }

  /**
   * Obtain closure to unmarshal list values.
   * @param dynamic Dynamic type expression of list value
   * @returns A list unmarshaller
   */
  protected listUnmarshaller(dynamic: Expression): ListUnmarshaller {
    throw new Error('not implemented')
  }

  /**
   * Obtain closure to unmarshal dictionary values.
   * @param dynamic Dynamic type expression of dictionary value
   * @returns A dictionary unmarshaller
   */
  protected dictionaryUnmarshaller(dynamic: Expression): DictionaryUnmarshaller {
    throw new Error('not implemented')
  }

  /**
   * Obtain closure to unmarshal record values.
   * @param dynamic Dynamic type expression of record value
   * @returns A record unmarshaller
   */
  protected recordUnmarshaller(dynamic: Expression): RecordUnmarshaller {
    throw new Error('not implemented')
  }

  public tester<T extends Value>(type: TypeExpression): MemberTester<T> {
    throw new Error('not implemented')
  }
  public List<T extends Value>(type: TypeExpression): ListFactory<T> {
    throw new Error('not implemented')
  }
  public Dictionary<T extends Value>(type: TypeExpression): DictionaryFactory<T> {
    throw new Error('not implemented')
  }
  public Record<T>(type: TypeExpression): RecordFactory<T> {
    throw new Error('not implemented')
  }
  public marshal(value: Value, inferredType?: TypeExpression): Shape {
    throw new Error('not implemented')
  }
  public unmarshal(shape: Shape, inferredType?: TypeExpression): Value {
    throw new Error('not implemented')
  }
  public change<T extends Composite<Index, Value>>(value: T, revisions: { readonly [index: string]: Value }): T {
    throw new Error('not implemented')
  }
}

/**
 * The umbilical symbol links composite values to a typespace.
 * This symbol is only relevant if you're implementing a data universe.
 */
export const umbilical = Symbol('typespace of composite data')

/**
 * Obtain parsed type expression.
 * @param type Source of expression or existing type expression
 * @returns An expression
 */
export function parseTypeExpression(type: TypeExpression): Expression {
  return typeof type === 'string' ? parseType(type) : type
}

/**
 * Test whether it is a data value.
 * @param it Potential value
 * @returns True if it is a data value, otherwise false
 */
export function isValuable(it: any): it is Value {
  return isComposite(it) || isSimple(it)
}

/**
 * Test whether it is a simple data value. A simple value is null, true, false, a finite number or a string.
 * @param it Potential simple value
 * @returns True if it is a simple data value, otherwise false
 */
export function isSimple(it: any): it is Simple {
  switch (typeof it) {
    case 'boolean': case 'string': return true
    case 'number': return isFinite(it)
    case 'object': return it === null
  }
  return false
}

/**
 * Test whether it is a simple null value, the only member of type none.
 * @param it Potential null value
 * @returns True if it is null, otherwise false
 */
export function isNone(it: any): it is null {
  return it === null
}

/**
 * Test whether it is a simple boolean.
 * @param it Potential boolean value
 * @returns True if it is a boolean, otherwise false
 */
export function isBoolean(it: any): it is boolean {
  return it === true || it === false
}

/**
 * Test whether it is a simple number. NaN and Infinity are not numbers, because they are not part of JSON.
 * @param it Potential number value
 * @returns True if it is a finite number, otherwise false
 */
export function isNumber(it: any): it is number {
  return typeof it === 'number' && isFinite(it)
}

/**
 * Test whether it is an unsigned 32-bit integer number.
 * @param it Potential integer value
 * @returns True if it is an integer, otherwise false
 */
export function isInteger(it: any): it is number {
  return typeof it === 'number' && is(it >>> 0, it)
}

/**
 * Test whether it is a simple string.
 * @param it Potential string value
 * @returns True if it is a string, otherwise false
 */
export function isString(it: any): it is string {
  return typeof it === 'string'
}

/**
 * Test whether it is a composite value, i.e. a list, dictionary or record value.
 * @param it Potential composite value
 * @returns True if it is a composite value, otherwise false
 */
export function isComposite(it: any): it is Composite<Index, Value> {
  return !!it && typeof it === 'object' && umbilical in it
}

/**
 * Test whether it is a composite list value.
 * @param it Potential list value
 * @returns True if it is a list value, otherwise false
 */
export function isList(it: any): it is List<Value> {
  return isComposite(it) && isListType(it.concrete$)
}

/**
 * Test whether it is a composite dictionary value.
 * @param it Potential dictionary value
 * @returns True if it is a dictionary value, otherwise false
 */
export function isDictionary(it: any): it is Dictionary<Value> {
  return isComposite(it) && isDictionaryType(it.concrete$)
}

/**
 * Test whether it is a composite record value.
 * @param it Potential record value
 * @returns True if it is a record value, otherwise false
 */
export function isRecord(it: any): it is Record<object> {
  return isComposite(it) && isRecordType(it.concrete$)
}

/**
 * Obtain name of a meta field.
 * @param selector Field selector
 * @returns The selector of the corresponding meta field
 */
export function meta(selector: string) {
  return '$' + selector
}

/**
 * Obtain dynamic type of value.
 * @param value Data value
 * @returns Expression of dynamic type
 */
export function dynamicTypeOf(value: Value): Expression {
  return isComposite(value) ? value.dynamic$ : mandatorySimpleTypes[typeof value] || noneType
}

/**
 * Obtain concrete type of value. It is either none, boolean, number, string, list, dictionary or record type.
 * @param value Data value
 * @returns Expression of dynamic type
 */
export function concreteTypeOf(value: Value): Expression {
  return isComposite(value) ? value.concrete$ : mandatorySimpleTypes[typeof value] || noneType
}

/**
 * Iterate over indices of a composite value.
 * Simple values return an empty iterator, because they cannot own indices.
 * @param value Data value
 * @returns Iterator over indices
 */
export function indices(value: Value) {
  return isComposite(value) ? value.indices$ : empty<Index>()
}

/**
 * Iterate over constituents of a composite value.
 * Simple values return an empty iterator, because they are not made from constituents.
 * @param value Data value
 * @returns Iterator over values
 */
export function constituents(value: Value) {
  return isComposite(value) ? value.constituents$ : empty<Value>()
}

/**
 * Iterate over associations of a composite value.
 * An association is an array that pairs an index and constituent.
 * Simple values return an empty iterator.
 * @param value Data value
 * @returns Iterator over arrays with index/constituent pair
 */
export function associations(value: Value) {
  return isComposite(value) ? value.associations$ : empty<[Index, Value]>()
}

/**
 * Count the number of constituents in a composite value.
 * Simple values return zero.
 * @param value Data value
 * @returns Number of constituents
 */
export function width(value: Value): number {
  return isComposite(value) ? value.width$ : 0
}

/**
 * Determine the weight of a value. The weight is the number of internal nodes in a value.
 * A composite value returns the accumulative weight of its constituents plus one.
 * A simple value returns one.
 * @param value Data value
 * @returns Number of internal nodes
 */
export function weight(value: Value): number {
  return isComposite(value) ? value.weight$ : 1
}

/**
 * Test whether a value owns a particular index.
 * Simple values always return false.
 * @param value Data value
 * @param index Index to test
 * @returns True if the value is a composite that owns the index, otherwise false
 */
export function owns(value: Value, index: Index) {
  return isComposite(value) && value.at$(index) !== void 0
}

/**
 * Probe value for a constituent at a particular index.
 * @param value Data value
 * @param index Index to probe
 * @returns A constituent if the value is a composite that owns the index, otherwise undefined
 */
export function probe(value: Value, index: Index) {
  if (isComposite(value)) {
    return value.at$(index)
  }
}

/**
 * Obtain constituent from a composite at a particular index.
 * @param value Data value
 * @param index Index to probe
 * @returns A constituent
 * @throws When the data value does not own the index, e.g. a simple value
 */
export function seek(value: Value, index: Index) {
  if (isComposite(value)) {
    const constituent = value.at$(index)
    if (constituent !== void 0) {
      return constituent
    }
  }
  throw new Error(`index ${index} not found`)
}

/**
 * Test whether left and right value are structurally equivalent. Differences in dynamic types are ignored.
 * Only the concrete types of left and right are relevant.
 * @param left Left value to test
 * @param right Right value to test
 * @returns True if left and right are structurally equivalent, otherwise false
 */
export function equivalent(left: Value, right: Value) {
  return left === right || isComposite(left) && isComposite(right) && left.typespace$ === right.typespace$ &&
    left.concrete$ === right.concrete$ && left.width$ === right.width$ && left.weight$ === right.weight$ &&
    left.concrete$.dispatch(compositeEquivalence)(left, right)
}

// simple types
const noneType = parseType('none')
const mandatorySimpleTypes: { readonly [type: string]: Expression } = {
  boolean: parseType('boolean'),
  number: parseType('number'),
  string: parseType('string')
}

// compare composite list, dictionary and record values
// concrete type, width and weight of left and right are already verified to be equal
type CompositeEquivalence<T extends Composite<Index, Value>> = (left: T, right: T) => boolean
const compositeEquivalence: TypePattern<CompositeEquivalence<Composite<Index, Value>>> = {
  list: returnK<CompositeEquivalence<List<Value>>>((left, right) => {
    for (const [index, value] of left.associations$) {
      if (!equivalent(value, seek(right, index))) {
        return false
      }
    }
    return true
  }),
  dictionary: returnK<CompositeEquivalence<Dictionary<Value>>>((left, right) => {
    for (const key of left.indices$) {
      if (!owns(right, key)) {
        return false
      }
    }
    for (const [key, value] of left.associations$) {
      if (!equivalent(value, seek(right, key))) {
        return false
      }
    }
    return true
  }),
  record: returnK<CompositeEquivalence<Record<object>>>((left, right) => {
    for (const [selector, value, dictionary] of left.fields$) {
      if (!equivalent(value, seek(right, selector)) || !equivalent(dictionary, right.annotations$(selector))) {
        return false
      }
    }
    return true
  }),
  default(): never { throw new Error('internal equivalence error') }
}
