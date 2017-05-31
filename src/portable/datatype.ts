import { Scanner } from 'oma/ast'

const { assign, create, keys } = Object

import * as always from 'oma/always'
import * as ast from 'oma/ast'
import * as loop from 'oma/loop'

const { returnFalse, returnTrue, throwError } = always
const { prepareSource, scan } = ast
const { map, some, values } = loop

/**
 * A type expression results from parsing the source of a datatype.
 */
export interface Expression {

  /**
   * The plain expression itself, without decorative annotations.
   */
  readonly plain: Expression

  /**
   * The unparsed source is normalized.
   */
  readonly unparsed: string

  /**
   * An expression is unbound if it is variable or if it contains variable parts.
   */
  readonly unbound: boolean

  /**
   * Metadata captures optional annotations from the datatype source.
   */
  readonly metadata?: { readonly [key: string]: string }

  /**
   * Dispatch datatype function.
   * @param fn Function that computes result
   * @returns The function result
   */
  dispatch<T>(fn: TypePattern<T>): T

  /**
   * Substitute variables to produce an expression without variable parts.
   * @param variables Content of type variables
   * @returns A bound type expression
   */
  substitute(variables: Definitions): Expression

}

/**
 * A type pattern computes a result from an input expression.
 */
export interface TypePattern<T> {

  /**
   * Optionally compute result from wildcard type.
   * @param wildcard Wildcard type
   * @returns Computed result
   */
  wildcard?(wildcard: Expression): T

  /**
   * Optionally compute result from none type.
   * @param none None type
   * @returns Computed result
   */
  none?(none: Expression): T

  /**
   * Optionally compute result from boolean type.
   * @param boolean Boolean type
   * @returns Computed result
   */
  boolean?(boolean: Expression): T

  /**
   * Optionally compute result from number type.
   * @param number Number type
   * @returns Computed result
   */
  number?(number: Expression): T

  /**
   * Optionally compute result from string type.
   * @param string String type
   * @returns Computed result
   */
  string?(string: Expression): T

  /**
   * Optionally compute result from integer type.
   * @param integer Integer type
   * @returns Computed result
   */
  integer?(integer: Expression): T

  /**
   * Optionally compute result from an enumeration type.
   * @param enumeration Enumeration type
   * @param choices Distinct enumerated choices
   * @returns Computed result
   */
  enumeration?(enumeration: Expression, choices: Set<string>): T

  /**
   * Optionally compute result from an optional type.
   * @param optional Optional type
   * @param mandatory Expression of mandatory type
   * @returns Computed result
   */
  optional?(optional: Expression, mandatory: Expression): T

  /**
   * Optionally compute result from a list type.
   * @param list List type
   * @param elementary Expression of element type
   * @returns Computed result
   */
  list?(list: Expression, elementary: Expression): T

  /**
   * Optionally compute result from a dictionary type.
   * @param dictionary Dictionary type
   * @param elementary Expression of element type
   * @returns Computed result
   */
  dictionary?(dictionary: Expression, elementary: Expression): T

  /**
   * Optionally compute result from a record type.
   * @param record Record type
   * @param fields Expressions of record fields
   * @returns Computed result
   */
  record?(record: Expression, fields: Definitions): T

  /**
   * Optionally compute result from a union type.
   * @param union Union type
   * @param alternatives Expressions of union alternatives
   * @returns Computed result
   */
  union?(union: Expression, alternatives: Set<Expression>): T

  /**
   * Optionally compute result from an addition of record types.
   * @param addition Record addition
   * @param cascade Expressions of added record types, from left to right
   * @returns Computed result
   */
  addition?(addition: Expression, cascade: Expression[]): T

  /**
   * Optionally compute result from a macro application.
   * @param application Macro application
   * @param name Macro name
   * @param parameters Expressions of type parameters, from left to right
   * @returns Computed result
   */
  application?(application: Expression, name: string, parameters: Expression[]): T

  /**
   * Optionally compute result from a type reference.
   * @param reference Type reference
   * @returns Computed result
   */
  reference?(reference: Expression): T

  /**
   * Optionally compute result from a macro definition.
   * @param macro Macro definition
   * @param formals Formal argument names and expressions, from first to last
   * @param body Macro body
   * @returns Computed result
   */
  macro?(macro: Expression, formals: Definitions, body: Expression): T

  /**
   * Optionally compute result from a type variable.
   * @param variable Type variable
   * @returns Computed result
   */
  variable?(variable: Expression): T

  /**
   * Compute default result if expression does not match a specified pattern.
   * @param expression Type expression
   * @returns Computed result
   */
  default(expression: Expression): T

}

/**
 * Definitions map names to expressions.
 */
export type Definitions = { readonly [name: string]: Expression }

/**
 * Sources map type names to expression sources.
 */
export type Sources = { readonly [name: string]: Source }

/**
 * A type source is either a string or a source object.
 */
export type Source = string | SourceObject

/**
 * A source object specifies a type that relies on record fields.
 */
export interface SourceObject {

  /**
   * Optionally specify formal arguments of a macro.
   */
  readonly arguments$?: string

  /**
   * Optionally specify a space-delimited sequence of names to apply to inner record type.
   */
  readonly constructors$?: string

  /**
   * Optionally specify expression of record where fields will be added.
   */
  readonly super$?: string

  /**
   * Specify record fields.
   */
  readonly [selector: string]: Source | undefined
}

/**
 * Parse source of a type expression.
 * @param text Source text of a type expression
 * @param location Optional location of source
 * @returns A type expression
 * @throws When the source syntax is invalid
 */
export function parseType(text: string, location = 'a type expression'): Expression {
  const cached = expressionCache[text]
  if (cached) {
    return cached
  } else {
    const source = prepareSource(text, location), scanner = scan(tokenizer(source), source)
    const expression = parseTypeExpression(scanner)
    if (!scanner.atEnd) {
      throw scanner.error('nothing more expected')
    }
    return expressionCache[text] = expression
  }
}

/**
 * Parse named types.
 * @param sources Mappings from type name to source of type expression, from least to most specific
 * @returns A mapping from type name to type expression
 * @throws When a syntax error is encountered
 * @throws When a type name is invalid
 */
export function parseDefinitions(...sources: Sources[]): Definitions {
  const mergedSources: { readonly [name: string]: Source } = assign({}, ...sources)
  const definitions: { [name: string]: Expression } = create(null)
  for (const name in mergedSources) {
    if (!validTypeName.test(name)) {
      throw new Error(`invalid type name ${name}`)
    }
    definitions[name] = parseType(sourceText(mergedSources[name]), name)
  }
  return definitions
}

/**
 * Parse enumeration from given set of choices.
 * @param choices Distinct choices of enumeration type
 * @returns An enumeration type
 */
export function parseEnumerationType(choices: Set<string>): Expression {
  return choices.size ? createEnumerationExpression(choices) : throwError('missing enumerated choices')
}

/**
 * Parse optional type from given mandatory type.
 * @param mandatory Expression of mandatory type
 * @returns An optional type
 */
export function parseOptionalType(mandatory: Expression): Expression {
  return mandatory.dispatch(testOptionalType) ? throwError('mandatory type cannot be optional') :
    createOptionalExpression(<AbstractExpression>mandatory)
}

/**
 * Parse record type from given field definitions.
 * @param fields Field definitions
 * @returns A record type
 */
export function parseRecordType(fields: { readonly [selector: string]: Expression }): Expression {
  return createRecordExpression(<{ readonly [selector: string]: AbstractExpression }>fields)
}

/**
 * Parse union type from given alternatives.
 * @param alternatives Distinct alternatives of union type
 * @returns A union type
 */
export function parseUnionType(alternatives: Set<Expression>): Expression {
  return alternatives.size ? createUnionExpression(<Set<AbstractExpression>>alternatives) :
    throwError('missing union alternatives')
}

/**
 * Test whether a type expression represents a list type.
 * @param expression Potential list type expression
 * @returns True if expression is a concrete list type, otherwise false
 */
export function isListType(expression: Expression) {
  return expression.dispatch(testListType)
}

/**
 * Test whether a type expression represents a dictionary type.
 * @param expression Potential dictionary type expression
 * @returns True if expression is a concrete dictionary type, otherwise false
 */
export function isDictionaryType(expression: Expression) {
  return expression.dispatch(testDictionaryType)
}

/**
 * Test whether a type expression represents a record type.
 * @param expression Potential record type expression
 * @returns True if expression is a concrete record type, otherwise false
 */
export function isRecordType(expression: Expression) {
  return expression.dispatch(testRecordType)
}

const testListType: TypePattern<boolean> = { list: returnTrue, default: returnFalse }
const testDictionaryType: TypePattern<boolean> = { dictionary: returnTrue, default: returnFalse }
const testRecordType: TypePattern<boolean> = { record: returnTrue, default: returnFalse }

const testOptionalType: TypePattern<boolean> = { optional: returnTrue, default: returnFalse }

// fully qualified type names
const namePattern = /[A-Z][0-9A-Za-z]+(?:\.[A-Z][0-9A-Za-z]+)*/
const validTypeName = new RegExp(`^${namePattern.source}$`)
// field selectors
const selectorPattern = /[a-z][0-9A-Za-z]*/
const validSelector = new RegExp(`^${selectorPattern.source}$`)
// construct tokenizer and the associated token symbols
const { tokenizer, type: { enumerated_choice, selector_name, symbolic_glyph, type_name, type_variable } } = ast.patternize({
  type_name: namePattern,
  type_variable: /[A-Z]/,
  selector_name: selectorPattern,
  enumerated_choice: /"[0-9A-Za-z.\-]+"/,
  symbolic_glyph: /[(,)=?|+*_[\]<>{}:@]/
})

// cache all parsed sources
const expressionCache: { [text: string]: AbstractExpression } = create(null)

// flatten source object to source text
function sourceText(source: Source) {
  if (typeof source === 'string') {
    return source
  }
  const accu: string[] = []
  if (source.arguments$) {
    accu.push('(', source.arguments$, ')')
  }
  const constructors = source.constructors$ ? source.constructors$.split(/ +/) : []
  for (const name of constructors) {
    accu.push(name, '(')
  }
  if (source.super$) {
    accu.push(source.super$, '+')
  }
  accu.push('{')
  let i = 0
  for (const selector in source) {
    if (validSelector.test(selector)) {
      accu.push(i++ ? ',' : '', selector, ':', sourceText(<Source>source[selector]))
    }
  }
  accu.push('}')
  for (i = constructors.length; i--;) {
    accu.push(')')
  }
  return accu.join('')
}

// hoisted
function unparse(expression: AbstractExpression) {
  return expression.unparsed
}
function isUnbound(expression: AbstractExpression) {
  return expression.unbound
}

// array substitution
function substituteExpressions(expressions: AbstractExpression[], variables: { readonly [name: string]: AbstractExpression }) {
  const substitutions = expressions.map(expression => expression.substitute(variables))
  return substitutions.some((substitution, i) => substitution !== expressions[i]) ? substitutions : expressions
}

abstract class AbstractExpression implements Expression {
  public get plain(): Expression { return this }
  // an unbound expression is or contains a free variable
  constructor(public readonly unparsed: string, public readonly unbound: boolean) { }
  public abstract dispatch<T>(fn: TypePattern<T>): T
  public substitute(variables: { readonly [name: string]: AbstractExpression }): AbstractExpression {
    return this
  }
}

// TypeExpression ::= TypeMacro | TypeExpression1
function parseTypeExpression(scanner: Scanner): AbstractExpression {
  return scanner.peek('(') ? parseTypeMacro(scanner) : parseTypeExpression1(scanner)
}

// TypeMacro ::= '(' TypeArgument { ',' TypeArgument } ')' TypeExpression1
// TypeArgument ::= type_variable '=' TypeExpression1
function parseTypeMacro(scanner: Scanner) {
  scanner.consume('(')
  const formalArguments: { [name: string]: AbstractExpression } = create(null)
  do {
    const letter = scanner.text, { start } = scanner.consume(type_variable)
    if (formalArguments[letter]) {
      throw scanner.error(`duplicate formal argument ${letter}`, start)
    }
    scanner.consume('=')
    formalArguments[letter] = parseTypeExpression1(scanner)
  } while (scanner.consumed(','))
  scanner.consume(')')
  return createTypeMacro(formalArguments, parseTypeExpression1(scanner))
}
function createTypeMacro(formalArguments: { readonly [name: string]: AbstractExpression }, body: AbstractExpression) {
  const accu = ['(']
  let i = 0
  for (const name in formalArguments) {
    accu.push(i++ ? ',' : '', name, '=', formalArguments[name].unparsed)
  }
  accu.push(')', body.unparsed)
  const unparsed = accu.join('')
  return <TypeMacro>expressionCache[unparsed] || (expressionCache[unparsed] = new TypeMacro(unparsed, formalArguments, body))
}
class TypeMacro extends AbstractExpression {
  constructor(
    unparsed: string,
    private readonly formalArguments: { readonly [name: string]: AbstractExpression },
    private readonly body: AbstractExpression
  ) {
    super(unparsed, body.unbound)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.macro ? fn.macro(this, this.formalArguments, this.body) : fn.default(this)
  }
}

// TypeExpression1 ::= ['?'] TypeExpression2
function parseTypeExpression1(scanner: Scanner) {
  return scanner.consumed('?') ? createOptionalExpression(parseTypeExpression2(scanner)) : parseTypeExpression2(scanner)
}
function createOptionalExpression(mandatory: AbstractExpression): OptionalExpression {
  const unparsed = '?' + mandatory.unparsed
  return <OptionalExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new OptionalExpression(unparsed, mandatory))
}
class OptionalExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly mandatory: AbstractExpression) {
    super(unparsed, mandatory.unbound)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.optional ? fn.optional(this, this.mandatory) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createOptionalExpression(this.mandatory.substitute(variables)) : this
  }
}

// TypeExpression2 ::= TypeExpression3 {'|' TypeExpression3}
function parseTypeExpression2(scanner: Scanner) {
  const expressions = new Set<AbstractExpression>()
  do {
    expressions.add(parseTypeExpression3(scanner))
  } while (scanner.consumed('|'))
  if (expressions.size === 1) {
    const [expression] = [...expressions]
    return expression
  } else {
    return createUnionExpression(expressions)
  }
}
function createUnionExpression(alternatives: Set<AbstractExpression>): UnionExpression {
  const unparsed = [...map(alternatives.values(), unparse)].sort().join('|')
  return <UnionExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new UnionExpression(unparsed, alternatives))
}
class UnionExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly alternatives: Set<AbstractExpression>) {
    super(unparsed, some(alternatives.values(), isUnbound))
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.union ? fn.union(this, this.alternatives) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createUnionExpression(new Set(substituteExpressions([...this.alternatives], variables))) : this
  }
}

// TypeExpression3 ::= TypeExpression4 {'+' TypeExpression4}
function parseTypeExpression3(scanner: Scanner) {
  const expressions: AbstractExpression[] = []
  do {
    expressions.push(parseTypeExpression4(scanner))
  } while (scanner.consumed('+'))
  return expressions.length === 1 ? expressions[0] : createAdditionExpression(expressions)
}
function createAdditionExpression(cascade: AbstractExpression[]): AdditionExpression {
  const unparsed = cascade.map(unparse).join('+')
  return <AdditionExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new AdditionExpression(unparsed, cascade))
}
class AdditionExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly cascade: AbstractExpression[]) {
    super(unparsed, cascade.some(isUnbound))
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.addition ? fn.addition(this, this.cascade) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createAdditionExpression(substituteExpressions(this.cascade, variables)) : this
  }
}

function parseTypeExpression4(scanner: Scanner): AbstractExpression {
  if (scanner.peek(type_name, '(')) {
    return parseApplicationExpression(scanner)
  } else if (scanner.peek(type_name)) {
    const name = scanner.text
    scanner.consume()
    return createReferenceExpression(name)
  } else if (scanner.peek(type_variable)) {
    const name = scanner.text
    scanner.consume()
    return createVariableExpression(name)
  } else if (scanner.peek(selector_name)) {
    const keyword = scanner.text, { start } = scanner.consume()
    switch (keyword) {
      case 'none': return noneExpression
      case 'boolean': return booleanExpression
      case 'number': return numberExpression
      case 'string': return stringExpression
      case 'integer': return integerExpression
      default: throw scanner.error(`bad keyword ${keyword}`, start)
    }
  } else if (scanner.consumed('*')) {
    return wildcardExpression
  } else if (scanner.peek('<')) {
    return parseDictionaryExpression(scanner)
  } else if (scanner.peek('[')) {
    return parseListExpression(scanner)
  } else if (scanner.peek('{')) {
    return parseRecordExpression(scanner)
  } else if (scanner.peek(enumerated_choice)) {
    return parseEnumerationExpression(scanner)
  } else {
    throw scanner.error('invalid type expression')
  }
}

// TypeExpression4 ::= type_name '(' TypeExpression1 {',' TypeExpression1} ')'
function parseApplicationExpression(scanner: Scanner) {
  const name = scanner.text
  scanner.consume(type_name)
  scanner.consume('(')
  const parameters = [parseTypeExpression1(scanner)]
  while (scanner.consumed(',')) {
    parameters.push(parseTypeExpression1(scanner))
  }
  scanner.consume(')')
  return createApplicationExpression(name, parameters)
}
function createApplicationExpression(name: string, parameters: AbstractExpression[]): ApplicationExpression {
  const accu = [name, '(']
  let i = 0
  for (const expression of parameters) {
    accu.push(i++ ? ',' : '', expression.unparsed)
  }
  accu.push(')')
  const unparsed = accu.join('')
  return <ApplicationExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new ApplicationExpression(unparsed, name, parameters))
}
class ApplicationExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly name: string, private readonly parameters: AbstractExpression[]) {
    super(unparsed, parameters.some(isUnbound))
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.application ? fn.application(this, this.name, this.parameters) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createApplicationExpression(this.name, substituteExpressions(this.parameters, variables)) : this
  }
}

// TypeExpression4 ::= '<' TypeExpression1 '>'
function parseDictionaryExpression(scanner: Scanner) {
  scanner.consume('<')
  const element = parseTypeExpression1(scanner)
  scanner.consume('>')
  return createDictionaryExpression(element)
}
function createDictionaryExpression(element: AbstractExpression): DictionaryExpression {
  const unparsed = `<${element.unparsed}>`
  return <DictionaryExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new DictionaryExpression(unparsed, element))
}
class DictionaryExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly element: AbstractExpression) {
    super(unparsed, element.unbound)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.dictionary ? fn.dictionary(this, this.element) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createDictionaryExpression(this.element.substitute(variables)) : this
  }
}

// TypeExpression4 ::= '[' TypeExpression1 ']'
function parseListExpression(scanner: Scanner) {
  scanner.consume('[')
  const element = parseTypeExpression1(scanner)
  scanner.consume(']')
  return createListExpression(element)
}
function createListExpression(element: AbstractExpression): ListExpression {
  const unparsed = `[${element.unparsed}]`
  return <ListExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new ListExpression(unparsed, element))
}
class ListExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly element: AbstractExpression) {
    super(unparsed, element.unbound)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.list ? fn.list(this, this.element) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createListExpression(this.element.substitute(variables)) : this
  }
}

// TypeExpression4 ::= '{' {selector_name ':' FieldExpression} '}'
function parseRecordExpression(scanner: Scanner) {
  scanner.consume('{')
  const fields: { [selector: string]: AbstractExpression } = create(null)
  if (scanner.peek(selector_name)) {
    do {
      const selector = scanner.text, { start } = scanner.consume(selector_name)
      if (fields[selector]) {
        throw scanner.error(`duplicate field ${selector}`, start)
      }
      scanner.consume(':')
      fields[selector] = parseFieldExpression(scanner)
    } while (scanner.consumed(','))
  }
  scanner.consume('}')
  return createRecordExpression(fields)
}
function createRecordExpression(fields: { readonly [selector: string]: AbstractExpression }): RecordExpression {
  const accu = ['{']
  let i = 0
  for (const selector of keys(fields).sort()) {
    accu.push(i++ ? ',' : '', selector, ':', fields[selector].unparsed)
  }
  accu.push('}')
  const unparsed = accu.join('')
  return <RecordExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new RecordExpression(unparsed, fields))
}
class RecordExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly fields: { readonly [selector: string]: AbstractExpression }) {
    super(unparsed, some(values(fields), isUnbound))
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.record ? fn.record(this, this.fields) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    if (this.unbound) {
      const substitutions: { [selector: string]: AbstractExpression } = create(null), fields = this.fields
      for (const selector in fields) {
        substitutions[selector] = fields[selector].substitute(variables)
      }
      return createRecordExpression(substitutions)
    }
    return this
  }
}

// FieldExpression ::= TypeExpression1 {'@' selector_name '=' AnnotationValue}
// AnnotationValue ::= selector_name | enumerated_choice
function parseFieldExpression(scanner: Scanner) {
  const expression = parseTypeExpression1(scanner)
  if (scanner.consumed('@')) {
    const metadata: { [name: string]: string } = create(null)
    do {
      const selector = scanner.text, { start } = scanner.consume(selector_name)
      if (metadata[selector]) {
        throw scanner.error(`duplicate field annotation ${selector}`, start)
      }
      scanner.consume('=')
      if (scanner.peek(selector_name) || scanner.peek(enumerated_choice)) {
        metadata[selector] = scanner.text
        scanner.consume()
      } else {
        throw scanner.error('expected choice or selector')
      }
    } while (scanner.consumed('@'))
    return createFieldExpression(expression, metadata)
  } else {
    return expression
  }
}
function createFieldExpression(expression: AbstractExpression, metadata: { readonly [name: string]: string }): FieldExpression {
  const accu: string[] = [expression.unparsed]
  for (const name of keys(metadata).sort()) {
    accu.push(' @', name, '=', metadata[name])
  }
  const unparsed = accu.join('')
  return <FieldExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new FieldExpression(unparsed, expression, metadata))
}
class FieldExpression extends AbstractExpression {
  public get plain() { return this.undecoratedExpression }
  constructor(
    unparsed: string,
    private readonly undecoratedExpression: AbstractExpression,
    public readonly metadata: { readonly [name: string]: string }) {
    super(unparsed, undecoratedExpression.unbound)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return this.undecoratedExpression.dispatch(fn)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return this.unbound ? createFieldExpression(this.undecoratedExpression.substitute(variables), this.metadata) : this
  }
}

// TypeExpression4 ::= enumerated_choice {'_' enumerated_choice}
function parseEnumerationExpression(scanner: Scanner) {
  const choices = new Set<string>()
  do {
    const choice = scanner.text
    scanner.consume(enumerated_choice)
    choices.add(choice.substr(1, choice.length - 2))
  } while (scanner.consumed('_'))
  return createEnumerationExpression(choices)
}
function createEnumerationExpression(choices: Set<string>) {
  const accu: string[] = []
  let i = 0
  for (const choice of [...choices].sort()) {
    accu.push(i++ ? '_"' : '"', choice, '"')
  }
  const unparsed = accu.join('')
  return <EnumerationExpression>expressionCache[unparsed] || (expressionCache[unparsed] = new EnumerationExpression(unparsed, new Set(choices)))
}
class EnumerationExpression extends AbstractExpression {
  constructor(unparsed: string, private readonly choices: Set<string>) {
    super(unparsed, false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.enumeration ? fn.enumeration(this, this.choices) : fn.default(this)
  }
}

// TypeExpression4 ::= type_name
function createReferenceExpression(name: string) {
  return <ReferenceExpression>expressionCache[name] || (expressionCache[name] = new ReferenceExpression(name))
}
class ReferenceExpression extends AbstractExpression {
  constructor(unparsed: string) {
    super(unparsed, false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.reference ? fn.reference(this) : fn.default(this)
  }
}

// TypeExpression4 ::= type_variable
function createVariableExpression(name: string) {
  return <VariableExpression>expressionCache[name] || (expressionCache[name] = new VariableExpression(name))
}
class VariableExpression extends AbstractExpression {
  constructor(unparsed: string) {
    super(unparsed, true)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.variable ? fn.variable(this) : fn.default(this)
  }
  public substitute(variables: { readonly [name: string]: AbstractExpression }) {
    return variables[this.unparsed] || throwError(`free type variable ${this.unparsed}`)
  }
}

// TypeExpression4 ::= '*'
const wildcardExpression = new class WildcardExpression extends AbstractExpression {
  constructor() {
    super('*', false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.wildcard ? fn.wildcard(this) : fn.default(this)
  }
}

// TypeExpression4 ::= 'none'
const noneExpression = new class NoneExpression extends AbstractExpression {
  constructor() {
    super('none', false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.none ? fn.none(this) : fn.default(this)
  }
}

// TypeExpression4 ::= 'boolean'
const booleanExpression = new class BooleanExpression extends AbstractExpression {
  constructor() {
    super('boolean', false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.boolean ? fn.boolean(this) : fn.default(this)
  }
}

// TypeExpression4 ::= 'number'
const numberExpression = new class NumberExpression extends AbstractExpression {
  constructor() {
    super('number', false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.number ? fn.number(this) : fn.default(this)
  }
}

// TypeExpression4 ::= 'string'
const stringExpression = new class StringExpression extends AbstractExpression {
  constructor() {
    super('string', false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.string ? fn.string(this) : fn.default(this)
  }
}

// TypeExpression4 ::= 'integer'
const integerExpression = new class IntegerExpression extends AbstractExpression {
  constructor() {
    super('integer', false)
  }
  public dispatch<T>(fn: TypePattern<T>): T {
    return fn.integer ? fn.integer(this) : fn.default(this)
  }
}
