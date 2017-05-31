import * as always from 'oma/always'

const { returnK, returnThis } = always

/**
 * Empty iterable iterator. Use type parameter to specialize type.
 * @function
 * @returns Iterable iterator
 */
export const empty: <T>() => IterableIterator<T> = returnK({
  [Symbol.iterator]: returnThis,
  next: returnK({ done: true, value: void 0 })
})

/**
 * Iterate over elements of iterable.
 * @param iterable Zero or more iterable elements
 * @returns An iterable iterator over elements
 */
export function* iterate<T>(elements: Iterable<T>) {
  for (const element of elements) {
    yield element
  }
}

/**
 * Turn an iterator into an iterable iterator.
 * @param iterator An iterator over elements
 * @returns An iterable iterator over elements
 */
export function iterable<T>(iterator: Iterator<T>): IterableIterator<T> {
  return {
    [Symbol.iterator]: returnThis,
    next() { return iterator.next() }
  }
}

/**
 * Iterate over keys of enumerable properties.
 * @param object Object with enumerable properties
 * @returns An iterable iterator over property keys
 */
export function* keys(object: object) {
  for (const key in object) {
    yield key
  }
}

/**
 * Iterate over values of enumerable properties.
 * @param object Object with enumerable properties
 * @returns An iterable iterator over property values
 */
export function* values<T>(object: { [key: string]: T }) {
  for (const key in object) {
    yield object[key]
  }
}

/**
 * Iterate over enumerable properties.
 * @param object Object with enumerable properties
 * @returns An iterable iterator over arrays with two elements, a property key and a property value.
 */
export function* entries<T>(object: { [key: string]: T }) {
  for (const key in object) {
    yield <[string, T]>[key, object[key]]
  }
}

/**
 * Repeatedly iterate over the same element.
 * @param it Element to iterate
 * @param n Optional number of times to repeat element defaults to infinity
 * @returns An iterable iterator over same element
 */
export function* repeat<T>(it: T, n = Infinity) {
  while (n-- > 0) {
    yield it
  }
}

/**
 * Iterate over numbers.
 * @param from First number to iterate
 * @param to Inclusive bound for last number to iterate
 * @param increment Value to increment defaults to 1
 * @returns An iterable iterator that counts from first to last number
 */
export function* count(from: number, to: number, increment = 1): IterableIterator<number> {
  if (increment > 0) {
    for (; from <= to; from += increment) {
      yield from
    }
  } else if (increment < 0) {
    for (; from >= to; from += increment) {
      yield from
    }
  } else {
    yield* repeat(from)
  }
}

/**
 * Filter iterated elements.
 * @param iterator Iterator over elements
 * @param predicate Closure that tests whether an iterated element passes the filter
 * @param thisReceiver Optional receiver to bind in predicate applications
 * @returns An iterable iterator over filtered elements
 */
export function* filter<T, This = any>(iterator: Iterator<T>, predicate: (this: This, x: T) => boolean, thisReceiver?: This) {
  for (let iteration: IteratorResult<T>; !(iteration = iterator.next()).done;) {
    if (predicate.call(thisReceiver, iteration.value)) {
      yield iteration.value
    }
  }
}

/**
 * Convert iterated elements.
 * @param iterator Iterator over elements
 * @param conversion Closure that converts an iterated element
 * @param thisReceiver Optional receiver to bind in conversion applications
 * @returns An iterable iterator over converted elements
 */
export function* map<T, U, This = any>(iterator: Iterator<T>, conversion: (this: This, x: T) => U, thisReceiver?: This) {
  for (let iteration: IteratorResult<T>; !(iteration = iterator.next()).done;) {
    yield <U>conversion.call(thisReceiver, iteration.value)
  }
}

/**
 * Zip two iterators into one iterator over paired elements.
 * @param left Iterator over left elements of pairs
 * @param right Iterator over right elements of pairs
 * @returns An iterable iterator over left and right pairs
 */
export function* zip<T, U>(left: Iterator<T>, right: Iterator<U>) {
  let leftIteration: IteratorResult<T>, rightIteration: IteratorResult<U>
  // ensure consistent behavior if left and right have different lengths
  while ((leftIteration = left.next()), (rightIteration = right.next()), !leftIteration.done && !rightIteration.done) {
    yield <[T, U]>[leftIteration.value, rightIteration.value]
  }
}

/**
 * Flatten iterator over elements and nested iterators.
 * @param iterator Iterator over elements and nested iterators
 * @param depth Maximum recursion depth to expand nested iterators defaults to infinity
 * @returns An iterable iterator over flattened elements
 */
export function* flatten(iterator: Iterator<any>, depth = Infinity): IterableIterator<any> {
  for (let iteration: IteratorResult<any>; !(iteration = iterator.next()).done;) {
    const value = iteration.value
    if (depth > 0 && typeof value.next === 'function') {
      yield* flatten(value, depth - 1)
    } else {
      yield value
    }
  }
}

/**
 * Construct concatenation of elements and iterators.
 * @param elementsAndIterators Either an element or iterator to concatenate
 * @returns An iterable iterator over concatenated elements
 */
export function concat(...elementsAndIterators: any[]) {
  // concatenation flattens one level deep
  return flatten(iterate(elementsAndIterators), 1)
}

/**
 * Apply routine on iterated elements.
 * @param iterator Iterator over elements
 * @param routine Closure that expects an iterated element
 * @param thisReceiver Optional receiver to bind in routine applications
 */
export function forEach<T, This = any>(iterator: Iterator<T>, routine: (this: This, x: T) => void, thisReceiver?: This): void {
  for (let iteration: IteratorResult<T>; !(iteration = iterator.next()).done;) {
    routine.call(thisReceiver, iteration.value)
  }
}

/**
 * Reduce iterated elements.
 * @param iterator Iterator over elements
 * @param reduction Closure that reduces previous accumulator and an iterated element to the next accumulator
 * @param accu Initial accumulator
 * @param thisReceiver Optional receiver to bind in reduction applications
 * @returns Last reduction result or initial accumulator
 */
export function reduce<T, U, This = any>(iterator: Iterator<T>, reduction: (this: This, a: U, x: T) => U, accu: U, thisReceiver?: This) {
  for (let iteration: IteratorResult<T>; !(iteration = iterator.next()).done;) {
    accu = reduction.call(thisReceiver, accu, iteration.value)
  }
  return accu
}

/**
 * Drop elements from iterator.
 * @param iterator Iterator over elements
 * @param n Number of elements to drop
 * @returns Number of elements that could not be dropped, because iterator was exhausted
 */
export function drop<T>(iterator: Iterator<T>, n: number): number {
  let iteration: IteratorResult<T>
  while (n >= 1 && !(iteration = iterator.next()).done) {
    --n
  }
  return n
}

/**
 * Take elements from iterator.
 * @param iterator Iterator over elements
 * @param n Number to take
 * @returns Array with at most n elements taken from iterator
 */
export function take<T>(iterator: Iterator<T>, n: number) {
  const result: T[] = []
  for (let iteration: IteratorResult<T>; n >= 1 && !(iteration = iterator.next()).done; --n) {
    result.push(iteration.value)
  }
  return result
}

/**
 * Find element where predicate holds. If element is not found, the iterator result is done.
 * @param iterator Iterator over elements
 * @param predicate Closure that tests whether predicate holds for an iterated element
 * @param thisReceiver Optional receiver to bind in predicate applications
 * @returns Iterator result over element if not done
 */
export function find<T, This = any>(iterator: Iterator<T>, predicate: (this: This, it: T) => boolean, thisReceiver?: This) {
  let iteration: IteratorResult<T>
  while (!(iteration = iterator.next()).done && !predicate.call(thisReceiver, iteration.value)) {
  }
  return iteration
}

/**
 * Test whether predicate holds for all iterated elements.
 * @param iterator Iterator over elements
 * @param predicate Closure that tests whether predicate holds for an iterated element
 * @param thisReceiver Optional receiver to bind in predicate applications
 * @returns True if predicate holds for all elements, otherwise false
 */
export function every<T, This = any>(iterator: Iterator<T>, predicate: (this: This, it: T) => boolean, thisReceiver?: This) {
  for (let iteration: IteratorResult<T>; !(iteration = iterator.next()).done;) {
    if (!predicate.call(thisReceiver, iteration.value)) {
      return false
    }
  }
  return true
}

/**
 * Test whether predicate holds for some element.
 * @param iterator Iterator over elements
 * @param predicate Closure that tests whether predicate holds for an iterated element
 * @param thisReceiver Optional receiver to bind in predicate applications
 * @returns True if predicate holds for at least one element, otherwise false
 */
export function some<T, This = any>(iterator: Iterator<T>, predicate: (this: This, it: T) => boolean, thisReceiver?: This): boolean {
  return !find(iterator, predicate, thisReceiver).done
}
