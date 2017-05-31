import {
  ArrayShape,
  Composite,
  Dictionary,
  DictionaryFactory,
  DictionaryShape,
  DictionaryUnmarshaller,
  Index,
  List,
  ListFactory,
  ListShape,
  ListUnmarshaller,
  MemberTester,
  ObjectShape,
  Record,
  RecordFactory,
  RecordShape,
  RecordUnmarshaller,
  Shape,
  TypeExpression,
  UniverseConstructor,
  Value
} from 'oma/data'
import { Definitions, Expression, TypePattern } from 'oma/datatype'

const { isArray } = Array
const { abs } = Math
const { create } = Object

import * as always from 'oma/always'
import * as data from 'oma/data'
import * as datatype from 'oma/datatype'
import * as loop from 'oma/loop'

const { returnArg1, returnArg2, returnK, throwError } = always
const {
  equivalent,
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
  meta,
  parseTypeExpression,
  probe,
  seek,
  umbilical,
  weight
} = data
const { isDictionaryType, isListType, isRecordType, parseType } = datatype
const { count, entries, every, iterate, keys, values, zip } = loop

/**
 * A primal universe implements a data universe, albeit naively.
 * A primal universe should be extended with mixins to improve functionality, e.g. with recycling.
 */
export default <UniverseConstructor>class PrimalUniverse extends data.AbstractUniverse {
  // type pattern that creates a member tester for an evaluated type
  private readonly deriveMemberTester: TypePattern<(it: any) => boolean> = {
    // verify typespace of composite value when testing a wildcard
    wildcard: returnK((it: any) => isComposite(it) ? it.typespace$ === this.typespace : it !== null && isSimple(it)),
    // test simple types
    none: noneTester, boolean: booleanTester, number: numberTester, string: stringTester, integer: integerTester,
    // check presence of enumerated choice
    enumeration: (ignore, choices) => it => choices.has(it),
    // either null or mandatory value
    optional: (ignore, mandatory) => it => it === null || this.tester(mandatory)(it),
    // verify type of elements if necessary
    list: (listType, elementary) => it => isList(it) && it.typespace$ === this.typespace && (
      it.concrete$ === listType || every(it.constituents$, this.tester(elementary))
    ),
    // verify type of elements if necessary
    dictionary: (dictionaryType, elementary) => it => isDictionary(it) && it.typespace$ === this.typespace && (
      it.concrete$ === dictionaryType || every(it.constituents$, this.tester(elementary))
    ),
    // verify type of field values if necessary
    record: (recordType, fields) => it => {
      if (isRecord(it) && it.typespace$ === this.typespace) {
        if (it.concrete$ !== recordType) {
          for (const [selector, field] of entries(fields)) {
            if (!this.tester(field)(probe(it, selector))) {
              return false
            }
          }
        }
        return true
      }
      return false
    },
    // test membership of alternatives until match is found
    union: (ignore, alternatives) => it => {
      for (const alternative of alternatives) {
        if (this.tester(alternative)(it)) {
          return true
        }
      }
      return false
    },
    // should not happen
    default(expression): never {
      throw new Error(`error testing membership of ${expression.unparsed}`)
    }
  }
  // recursive pattern to extract list type
  private readonly extractListType: TypePattern<Expression> = {
    list: returnArg1,
    // a wildcard includes any list
    wildcard: returnK(anyListType),
    // verify there is only one list alternative
    union: (union, alternatives) => {
      const typespace = this.typespace
      let listType: Expression | null = null
      for (const alternative of alternatives) {
        const concrete = typespace.evaluate(alternative)
        if (isListType(concrete)) {
          listType = listType ? throwError(`multiple list alternatives in ${union.unparsed}`) : concrete
        }
      }
      return listType || throwError(`list alternative not found in ${union.unparsed}`)
    },
    optional: (ignore, mandatory) => this.typespace.evaluate(mandatory).dispatch(this.extractListType),
    default(expression): never { throw new Error(`unable to extract concrete list type from ${expression.unparsed}`) }
  }
  private readonly extractDictionaryType: TypePattern<Expression> = {
    dictionary: returnArg1,
    // a wildcard includes any dictionary
    wildcard: returnK(anyDictionaryType),
    // verify there is only one dictionary alternative
    union: (union, alternatives) => {
      const typespace = this.typespace
      let dictionaryType: Expression | null = null
      for (const alternative of alternatives) {
        const concrete = typespace.evaluate(alternative)
        if (isDictionaryType(concrete)) {
          dictionaryType = dictionaryType ? throwError(`multiple dictionary alternatives in ${union.unparsed}`) : concrete
        }
      }
      return dictionaryType || throwError(`dictionary alternative not found in ${union.unparsed}`)
    },
    optional: (ignore, mandatory) => this.typespace.evaluate(mandatory).dispatch(this.extractDictionaryType),
    default(expression): never { throw new Error(`unable to extract concrete dictionary type from ${expression.unparsed}`) }
  }
  private readonly extractRecordType: TypePattern<Expression> = {
    record: returnArg1,
    // verify there is only one record alternative
    union: (union, alternatives) => {
      const typespace = this.typespace
      let recordType: Expression | null = null
      for (const alternative of alternatives) {
        const concrete = typespace.evaluate(alternative)
        if (isRecordType(concrete)) {
          recordType = recordType ? throwError(`multiple record alternatives in ${union.unparsed}`) : concrete
        }
      }
      return recordType || throwError(`record alternative not found in ${union.unparsed}`)
    },
    optional: (ignore, mandatory) => this.typespace.evaluate(mandatory).dispatch(this.extractRecordType),
    default(expression): never { throw new Error(`unable to extract concrete record type from ${expression.unparsed}`) }
  }
  // derive a marshaller for a list, dictionary and record types
  private readonly deriveCompositionMarshaller: TypePattern<(value: Value, inferred: Expression) => Shape> = {
    list: returnK((value: List<Value>, inferred: Expression) => {
      const dynamic = value.dynamic$, elementary = value.elementary$, array: ArrayShape = new Array(value.width$)
      let i = 0
      for (const element of value.constituents$) {
        array[i++] = this.marshal(element, elementary)
      }
      return dynamic === inferred ? array : <ListShape>{ $: dynamic.unparsed, _: array }
    }),
    dictionary: returnK((value: Dictionary<Value>, inferred: Expression) => {
      const dynamic = value.dynamic$, elementary = value.elementary$, nested: { [key: string]: Shape } = {}
      for (const [key, element] of value.associations$) {
        nested[key] = this.marshal(element, elementary)
      }
      return <DictionaryShape>(dynamic === inferred ? { _: nested } : { $: dynamic.unparsed, _: nested })
    }),
    record: returnK((value: Record<{}>, inferred: Expression) => {
      const dynamic = value.dynamic$
      const shapes: { [selector: string]: Shape } = dynamic === inferred ? {} : { $: dynamic.unparsed }
      for (const [selector, fieldValue] of value.associations$) {
        if (fieldValue !== null) {
          shapes[selector] = this.marshal(fieldValue, value.selective$(selector).plain)
        }
        const metaSelector = meta(selector), annotations = probe(value, metaSelector)
        if (annotations) {
          shapes[metaSelector] = this.marshal(annotations, annotationsType)
        }
      }
      return shapes as RecordShape
    }),
    default(expression): never { throw new Error(`unable to derive marshaller of composite type ${expression.unparsed}`) }
  }
  // derive a changer for a list, dictionary and record types
  private readonly deriveCompositionChanger: TypePattern<(value: Value, revisions: { readonly [index: string]: Value }) => Value> = {
    list: returnK(<T extends Value>(value: List<T>, revisions: { readonly [index: string]: T | undefined }) => {
      const elements: T[] = [], factory = this.listFactory<T>(value.dynamic$, value.concrete$, value.elementary$)
      let index = 1
      for (const element of value.constituents$) {
        if (index in revisions) {
          const revisedElement = revisions[index]
          if (revisedElement === void 0) {
            return factory(elements)
          }
          elements.push(revisedElement)
        } else {
          elements.push(element)
        }
        ++index
      }
      while (index in revisions) {
        elements.push(<T>revisions[index++])
      }
      return factory(elements)
    }),
    dictionary: returnK(<T extends Value>(value: Dictionary<T>, revisions: { readonly [index: string]: T | undefined }) => {
      const elements: { [key: string]: T } = {}
      for (const [key, element] of value.associations$) {
        if (key in revisions) {
          const revisedElement = revisions[key]
          if (revisedElement !== void 0) {
            elements[key] = revisedElement
          }
        } else {
          elements[key] = element
        }
      }
      for (const key in revisions) {
        if (value.at$(key) === void 0) {
          elements[key] = <T>revisions[key]
        }
      }
      return this.dictionaryFactory<T>(value.dynamic$, value.concrete$, value.elementary$)(elements)
    }),
    record: returnK(<T>(value: Record<T>, revisions: { readonly [index: string]: Value }) => {
      const fields: { [selector: string]: Value } = {}
      for (const [selector, fieldValue] of value.associations$) {
        fields[selector] = selector in revisions ? revisions[selector] : fieldValue
        const metaSelector = meta(selector)
        if (metaSelector in revisions) {
          fields[metaSelector] = revisions[metaSelector]
        } else {
          const fieldAnnotations = value.at$(metaSelector)
          if (fieldAnnotations !== void 0) {
            fields[metaSelector] = fieldAnnotations
          }
        }
      }
      return this.recordFactory<T>(value.dynamic$, value.concrete$, (<any>value)[recordDefinitions])(<any>fields)
    }),
    default(expression): never { throw new Error(`unable to derive changer of composite type ${expression.unparsed}`) }
  }
  // list construction
  protected listFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): ListFactory<T> {
    const prototype = create(listPrototype, {
      [umbilical]: { value: this.typespace },
      typespace$: { value: this.typespace },
      dynamic$: { value: dynamic },
      concrete$: { value: concrete },
      elementary$: { value: elementary }
    })
    return elements => {
      let measuredWeight = 1
      for (const element of elements) {
        measuredWeight += weight(element)
      }
      return create(prototype, {
        [listElements]: { value: elements.slice() },
        weight$: { value: measuredWeight }
      })
    }
  }
  protected dictionaryFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): DictionaryFactory<T> {
    const prototype = create(dictionaryPrototype, {
      [umbilical]: { value: this.typespace },
      typespace$: { value: this.typespace },
      dynamic$: { value: dynamic },
      concrete$: { value: concrete },
      elementary$: { value: elementary }
    })
    return elements => {
      let measuredWidth = 0, measuredWeight = 1
      const privateElements = create(null)
      for (const key in elements) {
        ++measuredWidth
        measuredWeight += weight(privateElements[key] = elements[key])
      }
      return create(prototype, {
        [dictionaryElements]: { value: privateElements },
        width$: { value: measuredWidth },
        weight$: { value: measuredWeight }
      })
    }
  }
  protected recordFactory<T>(dynamic: Expression, concrete: Expression, fields: Definitions): RecordFactory<T> {
    const descriptors: PropertyDescriptorMap = {
      [umbilical]: { value: this.typespace },
      [recordDefinitions]: { value: fields },
      typespace$: { value: this.typespace },
      dynamic$: { value: dynamic },
      concrete$: { value: concrete },
    }
    const Annotations = this.Dictionary<string>(annotationsType), emptyAnnotations = Annotations({})
    const fieldAnnotations: { [selector: string]: Dictionary<string> } = create(null)
    let measuredWidth = 0
    for (const selector in fields) {
      descriptors[selector] = descriptorCache[selector] || (descriptorCache[selector] = {
        get() { return (<any>this)[recordFields][selector] }
      })
      const metaSelector = meta(selector)
      descriptors[metaSelector] = descriptorCache[metaSelector] || (descriptorCache[metaSelector] = {
        get() { return (<any>this)[recordFields][metaSelector] || (<any>this)[recordAnnotations][selector] }
      })
      const metadata = fields[selector].metadata
      fieldAnnotations[selector] = metadata ? Annotations(metadata) : emptyAnnotations
      ++measuredWidth
    }
    descriptors[recordAnnotations] = { value: fieldAnnotations }
    descriptors.width$ = { value: measuredWidth }
    const prototype = create(recordPrototype, descriptors)
    return (fieldValues: any) => {
      let measuredWeight = 1
      const privateFields = create(null)
      for (const [selector, defaultAnnotations] of entries(fieldAnnotations)) {
        measuredWeight += weight(privateFields[selector] = selector in fieldValues ? fieldValues[selector] : null)
        const metaSelector = meta(selector), annotations = fieldValues[metaSelector]
        if (annotations && !equivalent(annotations, defaultAnnotations)) {
          measuredWeight += weight(privateFields[metaSelector] = annotations)
        } else {
          measuredWeight += weight(defaultAnnotations)
        }
      }
      return create(prototype, {
        [recordFields]: { value: privateFields },
        weight$: { value: measuredWeight }
      })
    }
  }
  protected memberTester<T extends Value>(evaluated: Expression): MemberTester<T> {
    return evaluated.dispatch(this.deriveMemberTester) as MemberTester<T>
  }
  protected listUnmarshaller(dynamic: Expression): ListUnmarshaller {
    const concrete = this.typespace.evaluate(dynamic).dispatch(this.extractListType)
    const elementary = concrete.dispatch(listElementaryType)
    const factory = this.listFactory<Value>(dynamic, concrete, elementary)
    const elementUnmarshaller = (elementShape: Shape) => this.unmarshal(elementShape, elementary)
    return elementShapes => factory(elementShapes.map(elementUnmarshaller))
  }
  protected dictionaryUnmarshaller(dynamic: Expression): DictionaryUnmarshaller {
    const concrete = this.typespace.evaluate(dynamic).dispatch(this.extractDictionaryType)
    const elementary = concrete.dispatch(dictionaryElementaryType)
    const factory = this.dictionaryFactory<Value>(dynamic, concrete, elementary)
    return elementShapes => {
      const elements: { [key: string]: Value } = {}
      for (const [key, elementShape] of entries(elementShapes)) {
        elements[key] = this.unmarshal(elementShape, elementary)
      }
      return factory(elements)
    }
  }
  protected recordUnmarshaller(dynamic: Expression): RecordUnmarshaller {
    const concrete = this.typespace.evaluate(dynamic).dispatch(this.extractRecordType)
    const fields = concrete.dispatch(recordFieldDefinitions)
    const factory = this.recordFactory<{}>(dynamic, concrete, fields)
    return fieldShapes => {
      const fieldValues: { [selector: string]: Value } = {}
      for (const [selector, field] of entries(fields)) {
        if (selector in fieldShapes) {
          fieldValues[selector] = this.unmarshal(fieldShapes[selector], field.plain)
        }
        const metaSelector = meta(selector)
        if (metaSelector in fieldShapes) {
          fieldValues[metaSelector] = this.unmarshal(fieldShapes[metaSelector], annotationsType)
        }
      }
      return factory(fieldValues)
    }
  }
  public tester<T extends Value>(type: TypeExpression) {
    return this.memberTester<T>(this.typespace.evaluate(parseTypeExpression(type)))
  }
  public List<T extends Value>(type: TypeExpression) {
    const dynamic = parseTypeExpression(type)
    const concrete = this.typespace.evaluate(dynamic).dispatch(this.extractListType)
    return this.listFactory<T>(dynamic, concrete, concrete.dispatch(listElementaryType))
  }
  public Dictionary<T extends Value>(type: TypeExpression) {
    const dynamic = parseTypeExpression(type)
    const concrete = this.typespace.evaluate(dynamic).dispatch(this.extractDictionaryType)
    return this.dictionaryFactory<T>(dynamic, concrete, concrete.dispatch(dictionaryElementaryType))
  }
  public Record<T>(type: TypeExpression): RecordFactory<T> {
    const dynamic = parseTypeExpression(type)
    const concrete = this.typespace.evaluate(dynamic).dispatch(this.extractRecordType)
    return this.recordFactory<T>(dynamic, concrete, concrete.dispatch(recordFieldDefinitions))
  }
  public marshal(value: Value, inferredType?: TypeExpression): Shape {
    if (isComposite(value)) {
      const inferred = inferredType ? parseTypeExpression(inferredType) : anyType
      return value.concrete$.dispatch(this.deriveCompositionMarshaller)(value, inferred)
    } else {
      return value
    }
  }
  public unmarshal(shape: Shape, inferredType?: TypeExpression): Value {
    if (isSimple(shape)) {
      return shape
    } else if (isArray(shape)) {
      const inferred = typeof inferredType === 'string' ? parseType(inferredType) : inferredType || anyListType
      return this.listUnmarshaller(inferred)(shape, inferred)
    } else {
      const explicitType = (<ObjectShape>shape).$, nested: Shape[] | { readonly [key: string]: Shape } | undefined = (<any>shape)._
      if (isArray(nested)) {
        const dynamicType = explicitType || inferredType
        const dynamic = typeof dynamicType === 'string' ? parseType(dynamicType) : dynamicType || anyListType
        const inferred = typeof inferredType === 'string' ? parseType(inferredType) : inferredType || anyListType
        return this.listUnmarshaller(dynamic)(nested, inferred)
      } else if (nested) {
        const dynamicType = explicitType || inferredType
        const dynamic = typeof dynamicType === 'string' ? parseType(dynamicType) : dynamicType || anyDictionaryType
        const inferred = typeof inferredType === 'string' ? parseType(inferredType) : inferredType || anyDictionaryType
        return this.dictionaryUnmarshaller(dynamic)(nested, inferred)
      } else {
        const dynamicType = explicitType || inferredType || throwError('missing type information to unmarshal record shape')
        const dynamic = typeof dynamicType === 'string' ? parseType(dynamicType) : dynamicType
        const inferred = typeof inferredType === 'string' ? parseType(inferredType) : inferredType || anyRecordType
        return this.recordUnmarshaller(dynamic)(<RecordShape>shape, inferred)
      }
    }
  }
  public change(value: Composite<Index, Value>, revisions: { readonly [index: string]: Value }) {
    return value.concrete$.dispatch(this.deriveCompositionChanger)(value, revisions)
  }
}

const listElements = Symbol('list elements')
const listPrototype = create(null, {
  indices$: { get() { return count(1, this[listElements].length) } },
  constituents$: { get() { return iterate(this[listElements]) } },
  associations$: { get() { return zip(this.indices$, this.constituents$) } },
  width$: { get() { return this[listElements].length } },
  at$: {
    value(index: number) {
      if (index && isInteger(abs(index))) {
        const array = this[listElements], n = array.length, offset = index < 0 ? index + n : index - 1
        if (offset >= 0 && offset < n) {
          return array[offset]
        }
      }
    }
  }
})

const dictionaryElements = Symbol('dictionary elements')
const dictionaryPrototype = create(null, {
  indices$: { get() { return keys(this[dictionaryElements]) } },
  constituents$: { get() { return values(this[dictionaryElements]) } },
  associations$: { get() { return entries(this[dictionaryElements]) } },
  at$: {
    value(key: string) {
      if (typeof key === 'string') {
        return this[dictionaryElements][key]
      }
    }
  }
})

const descriptorCache: { [selector: string]: PropertyDescriptor } = create(null)
const recordFields = Symbol('record fields')
const recordDefinitions = Symbol('field definitions'), recordAnnotations = Symbol('field annotations')
const recordPrototype = create(null, {
  indices$: {
    get() {
      return keys(this[recordDefinitions])
    }
  },
  constituents$: {
    *get() {
      const privateFields = this[recordFields]
      for (const selector in this[recordDefinitions]) {
        yield privateFields[selector]
      }
    }
  },
  associations$: {
    *get() {
      const privateFields = this[recordFields]
      for (const selector in this[recordDefinitions]) {
        yield [selector, privateFields[selector]]
      }
    }
  },
  at$: {
    value(selector: string) {
      if (typeof selector === 'string') {
        return this[recordFields][selector]
      }
    }
  },
  fields$: {
    *get() {
      const privateFields = this[recordFields], fieldAnnotations = this[recordAnnotations]
      for (const selector in this[recordDefinitions]) {
        yield [selector, privateFields[selector], privateFields[meta(selector)] || fieldAnnotations[selector]]
      }
    }
  },
  selective$: {
    value(selector: string) {
      return this[recordDefinitions][selector] || throwError(`${selector} is not a field selector`)
    }
  },
  annotations$: {
    value(selector: string) {
      return this[recordFields][meta(selector)] || this[recordAnnotations][selector] ||
        throwError(`${selector} is not a field selector`)
    }
  }
})

const noneTester = returnK(isNone)
const booleanTester = returnK(isBoolean)
const numberTester = returnK(isNumber)
const stringTester = returnK(isString)
const integerTester = returnK(isInteger)

const annotationsType = parseType('<string>')
const anyType = parseType('?*')
const anyListType = parseType('[?*]')
const anyDictionaryType = parseType('<?*>')
const anyRecordType = parseType('{}')

const listElementaryType: TypePattern<Expression> = {
  list: returnArg2,
  default(): never { throw new Error('expected list with elementary type') }
}
const dictionaryElementaryType: TypePattern<Expression> = {
  dictionary: returnArg2,
  default(): never { throw new Error('expected dictionary with elementary type') }
}
const recordFieldDefinitions: TypePattern<Definitions> = {
  record: returnArg2,
  default(): never { throw new Error('expected record with field definitions') }
}
