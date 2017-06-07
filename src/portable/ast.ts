const { floor, min } = Math
const { getOwnPropertySymbols } = Object

/**
 * A node in an abstract syntax tree corresponds with a source range.
 */
export interface Node {

  /**
   * Node type is name of a production or symbol of a token.
   */
  readonly type: string | symbol

  /**
   * Offset where this node starts in the source text.
   */
  readonly start: number

  /**
   * Offset where this node stops in the source text. This shall be larger than the starting offset.
   */
  readonly stop: number

}

/**
 * A source node breaks a source text into lines.
 * It translates text offsets to more meaningful line/column positions.
 */
export interface Source extends Node {

  /**
   * Source production.
   */
  readonly type: 'source'

  /**
   * Source covers the whole text.
   */
  readonly start: 0

  /**
   * Source text.
   */
  readonly text: string

  /**
   * Source location.
   */
  readonly location: string

  /**
   * Number of lines in the source text.
   */
  readonly lineCount: number

  /**
   * Generate an error. The error is not thrown.
   * @param message Explanation of error
   * @param offset Offset of error location in source text
   * @returns An error
   */
  error(message: string, offset: number): Error

  /**
   * Obtain line and column position of offset in source text. Offsets start at 0.
   * @param offset Offset in source text
   * @returns Source position with line and column information
   * @throws When offset is out of bounds
   */
  position(offset: number): SourcePosition

  /**
   * Obtain starting offset of line in source text. Line numbers start at 1.
   * @param nr Line number
   * @returns Text offset
   * @throws When line number is invalid
   */
  lineOffset(nr: number): number

  /**
   * Obtain length of line in source text. Line numbers start at 1.
   * @param nr Line number
   * @returns Line length
   * @throws When line number is invalid
   */
  lineLength(nr: number): number

  /**
   * Extract a single line from the source text. Line numbers start at 1.
   * @param nr Line number
   * @returns Text of line in source text
   * @throws When line number is invalid
   */
  line(nr: number): string

}

/**
 * A position in a source text.
 */
export interface SourcePosition {

  /**
   * Line number starts at 1.
   */
  readonly line: number

  /**
   * Column number starts at 1.
   */
  readonly column: number

}

/**
 * Create a source node.
 * @param text Source text
 * @param location Optional descriptive location of source text, e.g. file location or URL
 * @returns New source node
 */
export function prepareSource(text: string, location = 'source text'): Source {
  return new PreparedSource(text, location)
}

/**
 * A pattern tester determines where a pattern starts and stops in the source text.
 */
export type PatternTester = (source: Source, start: number) => number | undefined

/**
 * A pattern is defined with a string, regular expression or an explicit tester.
 */
export type PatternDefinition = string | RegExp | PatternTester

/**
 * Token names select pattern definitions for a new patternizer.
 */
export type TokenPatterns = {
  readonly [name: string]: PatternDefinition
}

/**
 * A token is a node that matches a nonempty, lexical pattern.
 * The token type is symbolic which distinguishes tokens from nodes with textual types.
 */
export interface Token extends Node {

  /**
   * Token type is a unique symbol.
   */
  readonly type: symbol

}

/**
 * A tokenizer creates a token iterator over the given source.
 * The tokenizer starts at offset 0 unless an alternative starting offset is specified.
 */
export type Tokenizer = (source: Source, startingOffset?: number) => IterableIterator<Token>

/**
 * A patternizer combines a tokenizer with symbolic token types.
 */
export type Patternizer = {

  /**
  * Token names map to unique token types.
   */
  readonly type: {
    readonly [name: string]: symbol
  }

  /**
   * Tokenizer generates token iterators over source nodes.
   */
  readonly tokenizer: Tokenizer

}

/**
 * Create a patternizer.
 * @param patterns Token names map to pattern definitions
 * @returns A patternizer
 */
export function patternize(patterns: TokenPatterns): Patternizer {
  const symbolicPatterns: { [symbolic: string]: PatternDefinition } = {}, type: { [name: string]: symbol } = {}
  for (const name in patterns) {
    symbolicPatterns[type[name] = Symbol(name)] = patterns[name]
  }
  return { type, tokenizer: tokenizer(symbolicPatterns) }
}

/**
 * A scanner expectation is a literal string, a symbolic token type or a sticky regular expression.
 */
export type Expectation = string | symbol | RegExp

/**
 * A scanner consumes tokens from a source node.
 */
export interface Scanner {

  /**
   * Has this scanner consumed all tokens?
   */
  readonly atEnd: boolean

  /**
   * Offset of first unconsumed token in source.
   * The offset equals source text length if all tokens have been consumed.
   */
  readonly offset: number

  /**
   * Type of first unconsumed token. The heading is the terminator if this scanner is at the end.
   */
  readonly heading: symbol

  /**
   * Text of first unconsumed token. Empty if this scanner is at the end.
   */
  readonly text: string

  /**
   * Generate an error. The error is not thrown.
   * @param message Explanation of error
   * @param offset Optional offset of error location defaults to current scanner offset
   * @returns An error
   */
  error(message: string, offset?: number): Error

  /**
   * Test whether next unconsumed tokens match the expectations, without consuming them.
   * @param expected Expectations for unconsumed tokens
   * @returns True if unconsumed tokens match all expectations, otherwise false
   */
  peek(...expected: Expectation[]): boolean

  /**
   * Attempt to consume next token.
   * @param expectation Expectation of token to consume
   * @returns Consumed token or undefined if expectation does not match
   */
  consumed(expectation: Expectation): Token | undefined

  /**
   * Consume next token. Consume unconditionally if expectation is missing.
   * @param expectation Expectation of token to consume
   * @returns Consumed token
   * @throws When scanner is at its end
   * @throws When next unconsumed token does not match the expectation
   */
  consume(expectation?: Expectation): Token

}

/**
 * Heading if scanner is already at the end. It cannot be consumed.
 */
export const terminator = Symbol('end of input')

/**
 * Create a scanner.
 * @param significant Syntactically significant tokens
 * @param source Source node from where tokens originate
 * @returns New scanner
 */
export function scan(significant: Iterator<Token>, source: Source): Scanner {
  return new PeekingScanner(significant, source)
}

// map token symbols to pattern definitions
type SymbolicPatterns = { readonly [symbolic: string]: PatternDefinition }

class PreparedSource implements Source {
  // array with text offsets that tell where a line starts (even index) and stops (odd index)
  private readonly lineOffsets: number[]
  constructor(public readonly text: string, public readonly location: string) {
    // first line starts at offset 0
    const re = /\r\n|\r|\n|\v|\f|\u2028|\u2029/g, offsets = this.lineOffsets = [0]
    for (let match: RegExpExecArray | null; (match = re.exec(text));) {
      // add offsets where previous line stops and next line starts
      offsets.push(match.index, re.lastIndex)
    }
    // last line stops at text length
    offsets.push(text.length)
  }
  public get type(): 'source' {
    return 'source'
  }
  public get start(): 0 {
    return 0
  }
  public get stop() {
    return this.text.length
  }
  public get lineCount() {
    return this.lineOffsets.length / 2
  }
  public error(message: string, offset: number): Error {
    const { line, column } = this.position(offset)
    return new Error(`${this.location} Ln ${line} Col ${column} ${message}`)
  }
  public position(offset: number): SourcePosition {
    if (offset < 0 || offset > this.text.length) {
      throw new Error(`invalid source offset ${offset}`)
    }
    const offsets = this.lineOffsets
    let bottom = 0, top = offsets.length / 2
    do {
      const probe = floor((bottom + top) / 2)
      if (offset < offsets[2 * probe]) {
        top = probe
      } else {
        bottom = probe + 1
      }
    } while (bottom < top)
    const ix = 2 * bottom - 2, lineOffset = offsets[ix]
    return { line: bottom, column: min(offset - lineOffset, offsets[ix + 1] - lineOffset) + 1 }
  }
  public lineOffset(nr: number) {
    const offsets = this.lineOffsets, ix = 2 * nr - 2
    if (0 <= ix && ix < offsets.length - 1) {
      return offsets[ix]
    } else {
      throw new Error(`invalid line number ${nr}`)
    }
  }
  public lineLength(nr: number) {
    const offsets = this.lineOffsets, ix = 2 * nr - 2
    if (0 <= ix && ix < offsets.length - 1) {
      return offsets[ix + 1] - offsets[ix]
    } else {
      throw new Error(`invalid line number ${nr}`)
    }
  }
  public line(nr: number) {
    const offsets = this.lineOffsets, ix = 2 * nr - 2
    if (0 <= ix && ix < offsets.length - 1) {
      return this.text.substring(offsets[ix], offsets[ix + 1])
    } else {
      throw new Error(`invalid line number ${nr}`)
    }
  }
}

class PeekingScanner implements Scanner {
  // array with unconsumed tokens in the source text.
  private readonly unconsumed: Token[] = []
  // try to grab next significant token and append it to array with unconsumed tokens
  private lookAhead() {
    const iteration = this.significant.next()
    if (iteration.done) {
      return false
    }
    this.unconsumed.push(iteration.value)
    return true
  }
  constructor(private readonly significant: Iterator<Token>, private readonly source: Source) {
  }
  public get atEnd() {
    return !this.unconsumed.length && !this.lookAhead()
  }
  public get offset() {
    return this.atEnd ? this.source.text.length : this.unconsumed[0].start
  }
  public get heading() {
    return this.atEnd ? terminator : this.unconsumed[0].type
  }
  public get text() {
    if (this.atEnd) {
      return ''
    } else {
      const { start, stop } = this.unconsumed[0]
      return this.source.text.substring(start, stop)
    }
  }
  public error(message: string, offset = this.offset) {
    return this.source.error(message, offset)
  }
  public peek(...expected: Expectation[]) {
    const n = expected.length, text = this.source.text, unconsumed = this.unconsumed
    while (unconsumed.length < n) {
      if (!this.lookAhead()) {
        return false
      }
    }
    for (let i = 0; i < n; ++i) {
      const expectation = expected[i], token = unconsumed[i]
      if (typeof expectation === 'symbol') {
        if (token.type !== expectation) {
          return false
        }
      } else if (typeof expectation === 'string') {
        const start = token.start, m = token.stop - start
        if (m !== expectation.length) {
          return false
        }
        for (let j = 0; j < m; ++j) {
          if (text[start + j] !== expectation[j]) {
            return false
          }
        }
      } else if (expectation.sticky) {
        expectation.lastIndex = token.start
        if (!expectation.test(text) || expectation.lastIndex !== token.stop) {
          return false
        }
      } else {
        throw this.error(`bad expectation ${i + 1} ${expectation}`)
      }
    }
    return true
  }
  public consumed(expectation: Expectation) {
    if (this.peek(expectation)) {
      return this.consume()
    }
  }
  public consume(expectation?: Expectation) {
    if (this.atEnd) {
      throw this.error('unexpected end of input')
    }
    if (expectation && !this.peek(expectation)) {
      throw this.error(`expected ${expectation.toString()}`)
    }
    return <Token>this.unconsumed.shift()
  }
}

// utility function to create pattern tester for regular expression
function createTester(regular: string): PatternTester {
  const re = new RegExp(regular, 'y')
  return (source, start) => {
    // position sticky regular expression at start offset
    re.lastIndex = start
    if (re.test(source.text)) {
      // if there's a match, return with the stop offset
      return re.lastIndex
    }
  }
}

// create tokenizer
function tokenizer(patterns: SymbolicPatterns): Tokenizer {
  const testers = new Map<symbol, PatternTester>()
  for (const symbol of getOwnPropertySymbols(patterns)) {
    const pattern = patterns[symbol]
    const tester = typeof pattern === 'string' ? createTester(pattern) :
      pattern instanceof RegExp ? createTester(pattern.source) :
        pattern
    testers.set(symbol, tester)
  }
  // generator function iterates over tokens in given source texts
  return function* (source: Source, startingOffset: number = 0): IterableIterator<Token> {
    const text = source.text, significant = /\S/g
    // lexically significant if character is not a whitespace
    significant.lastIndex = startingOffset
    tryNext: while (significant.test(text)) {
      const start = significant.lastIndex - 1
      for (const [type, tester] of testers.entries()) {
        const stop = tester(source, start)
        if (stop && stop > start) {
          yield { type, start, stop }
          significant.lastIndex = stop
          continue tryNext
        }
      }
      throw source.error(`invalid token ${text[start]}`, start)
    }
  }
}
