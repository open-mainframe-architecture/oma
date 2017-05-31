import { TypeExpression, TypespaceConstructor } from 'oma/data'
import { Definitions, Expression, TypePattern } from 'oma/datatype'

const { assign, create } = Object

import * as always from 'oma/always'
import * as data from 'oma/data'
import * as datatype from 'oma/datatype'
import * as loop from 'oma/loop'

const { returnArg1, returnArg2, returnFalse, returnK, returnTrue, throwError } = always
const { parseEnumerationType, parseOptionalType, parseRecordType, parseType, parseUnionType } = datatype
const { entries, reduce } = loop

/**
 * Default typespace constructor.
 */
export default <TypespaceConstructor>class Typespace implements data.Typespace {
  constructor(private readonly typeDefinitions: Definitions) { }
  // evaluator of type expressions
  private readonly evaluator: TypePattern<Expression> = {
    // wildcard evaluates to wildcard
    wildcard: returnArg1,
    // simple types evaluate to themselves
    none: returnArg1, boolean: returnArg1, number: returnArg1, string: returnArg1,
    // subtypes of simple types evaluate to themselves
    integer: returnArg1, enumeration: returnArg1,
    // dictionary, list and record types evaluate to themselves
    dictionary: returnArg1, list: returnArg1, record: returnArg1,
    // evaluate idempotent optionality and reject optional none type
    optional: (expression, mandatory) => {
      const evaluated = this.reduce(mandatory)
      return evaluated.dispatch(isMandatory) ? expression : evaluated
    },
    // evaluate alternatives of a union
    union: (ignore, alternatives) => {
      // maybe is true if one or more evaluated alternatives is none or optional
      let maybe = false
      // generic is true is one or more evaluated alternatives is a wildcard
      let generic = false
      // a map from evaluated alternative to original type expression
      const evaluatedAlternatives = new Map<Expression, Expression>()
      // collect all evaluated enumeration alternatives
      const enumerations = new Set<Expression>()
      // test whether an evaluated alternative should be included in the union
      const includeAlternative: TypePattern<boolean> = {
        none() {
          maybe = true
          return false
        },
        wildcard() {
          generic = true
          return false
        },
        enumeration(expression) {
          enumerations.add(expression)
          return false
        },
        optional(ignore, mandatory) {
          maybe = true
          processAlternative(mandatory)
          return false
        },
        union(ignore, nested) {
          for (const expression of nested) {
            processAlternative(expression)
          }
          return false
        },
        default: returnTrue
      }
      const processAlternative = (expression: Expression) => {
        const evaluated = this.reduce(expression)
        // include alternative if its evaluation should be included 
        if (evaluated.dispatch(includeAlternative)) {
          // if two distinct alternatives evaluate to the same type, replace the ambiguous duo by the evaluated alternative
          const ambiguous = evaluatedAlternatives.has(evaluated) && evaluatedAlternatives.get(evaluated) !== expression
          evaluatedAlternatives.set(evaluated, ambiguous ? evaluated : expression)
        }
      }
      for (const expression of alternatives) {
        processAlternative(expression)
        // keep processing alternatives unless the final result is already known
        if (maybe && generic) {
          break
        }
      }
      let mandatory: Expression
      if (generic) {
        // a wildcard alternative overrules all other alternatives
        mandatory = wildcardType
      } else {
        // combine and include choices of all enumerations unless the string type is an evaluated alternative
        if (enumerations.size && !evaluatedAlternatives.has(stringType)) {
          const enumeration = parseEnumerationType(reduce(enumerations.values(), mergeChoices, new Set<string>()))
          evaluatedAlternatives.set(enumeration, enumeration)
        }
        // remove integer type if number type is an evaluated alternative
        if (evaluatedAlternatives.has(numberType)) {
          evaluatedAlternatives.delete(integerType)
        }
        switch (evaluatedAlternatives.size) {
          // if all alternatives evaluate to none, the final result is none
          case 0: return noneType
          case 1:
            // intermediate if alternative is optional, otherwise evaluated alternative is the final result
            [mandatory] = maybe ? evaluatedAlternatives.values() : evaluatedAlternatives.keys()
            break
          default:
            // combine multiple alternatives into a union
            mandatory = parseUnionType(new Set(evaluatedAlternatives.values()))
        }
      }
      // final result is optional if an alternative was optional or none
      return maybe ? parseOptionalType(mandatory) : mandatory
    },
    // evaluate cascade of record types and merge their fields in one record type
    addition: (ignore, cascade) => {
      const initially: { [selector: string]: Expression } = create(null)
      const mergeFields = (accu: typeof initially, expression: Expression) =>
        assign(accu, this.reduce(expression).dispatch(recordFields))
      return parseRecordType(cascade.reduce(mergeFields, initially))
    },
    // evaluate by applying referenced macro to given type parameters
    application: (ignore, name, parameters) => this.reduce(this.resolve(name).dispatch(macroPreprocessor)(parameters)),
    // evaluate referenced expression 
    reference: expression => this.reduce(this.resolve(expression.unparsed)),
    // evaluate macro body with default arguments
    macro: (ignore, formals, body) => this.reduce(body.unbound ? body.substitute(formals) : body),
    // all variables should have been substituted before evaluation
    variable(expression): never { throw new Error(`free type variable ${expression.unparsed}`) },
    // should not happen
    default(expression): never { throw new Error(`internal type evaluation error ${expression.unparsed}`) }
  }
  // cache evaluated expressions
  private readonly evaluatorCache: { [unparsed: string]: Expression } = create(null)
  private pendingEvaluations: { [unparsed: string]: boolean } = create(null)
  private evaluatorDepth = 0
  // a referenced name must be defined
  private resolve(name: string): Expression {
    return this.typeDefinitions[name] || throwError(`undefined type ${name}`)
  }
  // reduce to evaluated type expression
  private reduce(expression: Expression): Expression {
    const unparsed = expression.unparsed, cache = this.evaluatorCache, cached = cache[unparsed]
    if (cached) {
      // nothing to do if already cached
      return cached
    }
    const pending = this.pendingEvaluations
    if (pending[unparsed]) {
      // cyclic evaluation when expression is already pending
      throw new Error(`infinite type evaluation ${unparsed}`)
    } else if (++this.evaluatorDepth > 100) {
      // divergent evaluation just keeps on growing
      throw new Error(`divergent type evaluation ${unparsed}`)
    }
    pending[unparsed] = true
    const type = cache[unparsed] = expression.dispatch(this.evaluator)
    // avoid (slow) delete by marking expression as not pending
    pending[unparsed] = false
    if (--this.evaluatorDepth === 0) {
      // reset pending to empty when evaluator is done
      this.pendingEvaluations = create(null)
    }
    return type
  }
  // public interface
  public get definitions() {
    return entries(this.typeDefinitions)
  }
  public evaluate(type: TypeExpression) {
    const expression = typeof type === 'string' ? parseType(type) : type
    return this.reduce(expression.plain)
  }
}

// these types always evaluate to themselves
const wildcardType = parseType('*'), noneType = parseType('none')
const stringType = parseType('string'), numberType = parseType('number'), integerType = parseType('integer')

// extract choices of enumeration type
const enumeratedChoices: TypePattern<Set<string>> = {
  enumeration: returnArg2,
  default(): never { throw new Error('expected enumeration') }
}
// type is mandatory if it's neither none nor an optional type
const isMandatory: TypePattern<boolean> = {
  none: returnFalse, optional: returnFalse,
  default: returnTrue
}
// return function that processes type parameters in a macro application
const macroPreprocessor: TypePattern<(parameters: Expression[]) => Expression> = {
  macro: (ignore, formals, body) => !body.unbound ? returnK(body) : (parameters: Expression[]) => {
    const variables: { [name: string]: Expression } = create(null)
    let i = 0
    for (const name in formals) {
      // use default argument if parameter is not supplied
      variables[name] = parameters[i++] || formals[name]
    }
    return body.substitute(variables)
  },
  // if it's not a macro, just ignore parameters and continue with expression
  default: expression => returnK(expression)
}
// extract fields of record type
const recordFields: TypePattern<{ readonly [selector: string]: Expression }> = {
  record: returnArg2,
  default(): never { throw new Error('expected record') }
}

// hoist closure that merges choices of an enumeration type
function mergeChoices(choices: Set<string>, enumeration: Expression) {
  for (let choice of enumeration.dispatch(enumeratedChoices)) {
    choices.add(choice)
  }
  return choices
}