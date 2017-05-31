import {
  Dictionary,
  DictionaryFactory,
  ListFactory,
  RecordFactory,
  Shape,
  TypeExpression,
  UniverseConstructor,
  UniverseMixin,
  Value
} from 'oma/data'
import { Definitions, Expression } from 'oma/datatype'

import * as always from 'oma/always'
import * as data from 'oma/data'
import * as loop from 'oma/loop'

const { throwError } = always
const { concreteTypeOf, meta, parseTypeExpression } = data
const { entries, every, values } = loop

/**
 * A universe with safety ensures arguments and results are properly typed.
 * This functionality is not required.
 * It is expensive to verify the types of arguments and results.
 * Very useful in a development/testing context, but not suitable in a production context.
 */
export default withSafety as UniverseMixin

function withSafety(BaseUniverse: UniverseConstructor) {
  return class SafeUniverse extends BaseUniverse {
    protected listFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): ListFactory<T> {
      const safeFactory = super.listFactory<T>(dynamic, concrete, elementary), elementTester = this.tester<T>(elementary)
      return elements => elements.every(elementTester) ? safeFactory(elements) : throwError(`list element is not a ${elementary.unparsed}`)
    }
    protected dictionaryFactory<T extends Value>(dynamic: Expression, concrete: Expression, elementary: Expression): DictionaryFactory<T> {
      const safeFactory = super.dictionaryFactory<T>(dynamic, concrete, elementary), elementTester = this.tester<T>(elementary)
      return elements => every(values(elements), elementTester) ? safeFactory(elements) : throwError(`dictionary element is not a ${elementary.unparsed}`)
    }
    protected recordFactory<T>(dynamic: Expression, concrete: Expression, fields: Definitions): RecordFactory<T> {
      const safeFactory = super.recordFactory<T>(dynamic, concrete, fields), isAnnotations = this.tester<Dictionary<string>>('<string>')
      return (fieldValues: any) => {
        for (const [selector, field] of entries(fields)) {
          if (!this.tester(field)(selector in fieldValues ? fieldValues[selector] : null)) {
            throw new Error(`field ${selector} is not a ${field.plain.unparsed} in ${dynamic.unparsed} construction`)
          }
          const metaSelector = meta(selector)
          if (metaSelector in fieldValues && !isAnnotations(fieldValues[metaSelector])) {
            throw new Error(`meta field ${selector} is not a string dictionary in ${dynamic.unparsed} construction`)
          }
        }
        return safeFactory(fieldValues)
      }
    }
    public marshal(value: Value, inferredType?: TypeExpression) {
      if (inferredType && !this.tester(inferredType)(value)) {
        const inferred = parseTypeExpression(inferredType)
        throw new Error(`cannot marshal ${concreteTypeOf(value).unparsed} as inferred ${inferred.unparsed}`)
      }
      return super.marshal(value, inferredType)
    }
    public unmarshal(shape: Shape, inferredType?: TypeExpression) {
      const value = super.unmarshal(shape, inferredType)
      if (inferredType && !this.tester(inferredType)(value)) {
        const inferred = parseTypeExpression(inferredType)
        throw new Error(`cannot unmarshal ${concreteTypeOf(value).unparsed} as inferred ${inferred.unparsed}`)
      }
      return value
    }
  }
}