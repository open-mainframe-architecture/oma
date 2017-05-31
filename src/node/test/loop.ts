import * as assert from 'assert'
import * as mocha from 'mocha'

import * as loop from 'oma/loop'

const {
  concat,
  count,
  drop,
  empty,
  entries,
  every,
  filter,
  find,
  flatten,
  forEach,
  iterable,
  iterate,
  keys,
  map,
  reduce,
  repeat,
  some,
  take,
  values,
  zip
} = loop

function arrayIterator<T>(array: T[], i: number = 0): Iterator<T> {
  // array iterator is not iterable
  return { next: () => ({ done: i === array.length, value: array[i++] }) }
}

describe('iterable loop', function () {
  it('loops over nothing if empty', function () {
    assert.equal([...empty()].length, 0)
  })
  it('turns an iterator into an iterable iterator', function () {
    assert.equal([...iterable(arrayIterator([]))].length, 0)
    const array = [42, 54, 66]
    assert.deepEqual([...iterable(arrayIterator(array))], array)
  })
  it('loops over iterable elements', function() {
    assert.equal([...iterate([])].length, 0)
    const array = [42, 54, 66]
    assert.deepEqual([...iterate(array)], array)
  })
  it('loops over keys of enumerable properties', function () {
    assert.equal([...keys({})].length, 0)
    assert.deepEqual([...keys({ foo: 42, bar: 54, baz: 66 })], ['foo', 'bar', 'baz'])
  })
  it('loops over values of enumerable properties', function () {
    assert.equal([...values({})].length, 0)
    assert.deepEqual([...values({ foo: 42, bar: 54, baz: 66 })], [42, 54, 66])
  })
  it('loops over entries of enumerable properties', function () {
    assert.equal([...entries({})].length, 0)
    assert.deepEqual([...entries({ foo: 42, bar: 54, baz: 66 })], [['foo', 42], ['bar', 54], ['baz', 66]])
  })
  it('repeatedly loops over a value', function () {
    assert.equal([...repeat(42, 0)].length, 0)
    assert.deepEqual([...repeat(42, 1)], [42])
    assert.deepEqual([...repeat(42, 3)], [42, 42, 42])
  })
  it('loops over a counter', function () {
    assert.equal([...count(1, 0)].length, 0)
    assert.deepEqual([...count(1, 0, -1)], [1, 0])
    assert.deepEqual([...count(0, 1)], [0, 1])
    assert.equal([...count(0, 1, -1)].length, 0)
    assert.deepEqual([...count(1, 10)], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    assert.deepEqual([...count(1, 10, 2)], [1, 3, 5, 7, 9])
  })
  it('loops over filtered values', function () {
    assert.equal([...filter(empty<number>(), n => n % 2 === 0)].length, 0)
    assert.deepEqual([...filter(count(1, 10), n => n % 2 === 0)], [2, 4, 6, 8, 10])
    assert.deepEqual([...filter(count(1, 10), n => n > 5)], [6, 7, 8, 9, 10])
    const thisTwo = { div: 2 }, thisThree: typeof thisTwo = { div: 3 }
    function testObjectDivision(this: typeof thisTwo, n: number) {
      return n % this.div === 0
    }
    assert.deepEqual([...filter(count(1, 10), testObjectDivision, thisTwo)], [2, 4, 6, 8, 10])
    assert.deepEqual([...filter(count(1, 10), testObjectDivision, thisThree)], [3, 6, 9])
    function testNumberDivision(this: number, n: number) {
      return n % this === 0
    }
    assert.deepEqual([...filter(count(1, 10), testNumberDivision, 2)], [2, 4, 6, 8, 10])
    assert.deepEqual([...filter(count(1, 10), testNumberDivision, 3)], [3, 6, 9])
  })
  it('loops over converted values', function () {
    assert.equal([...map(empty<number>(), n => n * 2)].length, 0)
    assert.deepEqual([...map(count(1, 3), n => n * 2)], [2, 4, 6])
    const thisTwo = { mul: 2 }, thisFive: typeof thisTwo = { mul: 5 }
    function objectMultiply(this: typeof thisTwo, n: number) {
      return n * this.mul
    }
    assert.deepEqual([...map(count(1, 3), objectMultiply, thisTwo)], [2, 4, 6])
    assert.deepEqual([...map(count(1, 3), objectMultiply, thisFive)], [5, 10, 15])
    function numberMultiply(this: number, n: number) {
      return n * this
    }
    assert.deepEqual([...map(count(1, 3), numberMultiply, 2)], [2, 4, 6])
    assert.deepEqual([...map(count(1, 3), numberMultiply, 5)], [5, 10, 15])
  })
  it('loops over zipped pairs from two iterators', function () {
    assert.equal([...zip(empty(), empty())].length, 0)
    assert.deepEqual([...zip(count(1, 3), count(5, 7))], [[1, 5], [2, 6], [3, 7]])
    const leftRemainder = count(1, 5)
    assert.deepEqual([...zip(leftRemainder, count(5, 7))], [[1, 5], [2, 6], [3, 7]])
    assert.deepEqual([...leftRemainder], [5])
    const rightRemainder = count(1, 5)
    assert.deepEqual([...zip(count(5, 7), rightRemainder)], [[5, 1], [6, 2], [7, 3]])
    assert.deepEqual([...rightRemainder], [5])
  })
  it('loops over flattened iterators', function () {
    assert.equal([...flatten(empty())].length, 0)
    assert.deepEqual([...flatten(arrayIterator([count(1, 3), count(5, 7)]))], [1, 2, 3, 5, 6, 7])
    assert.deepEqual([...flatten(arrayIterator([count(1, 3), 4, count(5, 7), 8, 9, 10]))], [...count(1, 10)])
    const depthThree = arrayIterator([1, 2, 3])
    const depthTwo = arrayIterator([depthThree, 4, 5, 6])
    const depthOne = arrayIterator([depthTwo, 7, 8, 9])
    assert.deepEqual([...flatten(arrayIterator([depthOne, 10]))], [...count(1, 10)])
  })
  it('loops over flattened iterators, until a depth is reached', function () {
    assert.equal([...flatten(empty(), 2)].length, 0)
    const depthThree = arrayIterator([1, 2, 3])
    const depthTwo = arrayIterator([depthThree, 4, 5, 6])
    const depthOne = arrayIterator([depthTwo, 7, 8, 9])
    assert.deepEqual([...flatten(arrayIterator([depthOne, 10]), 2)], [depthThree, ...count(4, 10)])
  })
  it('loops over concatenated elements and iterators', function () {
    assert.equal([...concat()].length, 0)
    assert.deepEqual([...concat(1, 2, 3)], [1, 2, 3])
    assert.deepEqual([...concat(1, 2, 3, count(4, 8), 9, 10)], [...count(1, 10)])
    const depthTwo = arrayIterator([count(1, 6)])
    const depthOne = arrayIterator([depthTwo, 7, 8, 9])
    assert.deepEqual([...concat(depthOne, 10)], [depthTwo, 7, 8, 9, 10])
  })
  it('applies a closure for each iterated element', function () {
    forEach(empty(), element => assert.ok(false))
    let sum = 0, last = 0
    forEach(count(1, 10), element => {
      assert.equal(element, ++last)
      sum += element
    })
    assert.equal(sum, 55)
    const thisTwo: { sum: number } = { sum: 2 }, thisFive: typeof thisTwo = { sum: 5 }
    function addObjectSum(this: typeof thisTwo, n: number) {
      this.sum += n
    }
    forEach(count(1, 10), addObjectSum, thisTwo)
    forEach(count(1, 10), addObjectSum, thisFive)
    assert.equal(thisTwo.sum, 57)
    assert.equal(thisFive.sum, 60)
  })
  it('reduces iterated elements with an operator', function () {
    assert.equal(reduce(empty(), (a: any) => assert.ok(false), 42), 42)
    assert.equal(reduce(count(1, 10), (a, n) => a + n, 0), 55)
    const thisTwo: { incr: number } = { incr: 2 }, thisFive: typeof thisTwo = { incr: 5 }
    function reduceObject(this: typeof thisTwo, accu: number, n: number) {
      return this.incr + accu + n
    }
    assert.equal(reduce(count(1, 10), reduceObject, 0, thisTwo), 75)
    assert.equal(reduce(count(1, 10), reduceObject, 0, thisFive), 105)
    function reduceNumber(this: number, accu: number, n: number) {
      return this + accu + n
    }
    assert.equal(reduce(count(1, 10), reduceNumber, 0, 2), 75)
    assert.equal(reduce(count(1, 10), reduceNumber, 0, 5), 105)
  })
  it('drops iterated elements', function () {
    assert.equal(drop(empty(), 42), 42)
    const nothingDropped = count(1, 10)
    assert.equal(drop(nothingDropped, 0), 0)
    assert.deepEqual([...nothingDropped], [...count(1, 10)])
    const droppedOne = count(1, 10)
    assert.equal(drop(droppedOne, 1), 0)
    assert.deepEqual([...droppedOne], [...count(2, 10)])
    const droppedThree = count(1, 10)
    assert.equal(drop(droppedThree, 3), 0)
    assert.deepEqual([...droppedThree], [...count(4, 10)])
    const droppedAll = count(1, 10)
    assert.equal(drop(droppedAll, 42), 32)
    assert.equal([...droppedAll].length, 0)
  })
  it('takes iterated elements', function () {
    assert.equal(take(empty(), 42).length, 0)
    const nothingTaken = count(1, 10)
    assert.equal(take(nothingTaken, 0).length, 0)
    assert.deepEqual([...nothingTaken], [...count(1, 10)])
    const takenOne = count(1, 10)
    assert.deepEqual(take(takenOne, 1), [1])
    assert.deepEqual([...takenOne], [...count(2, 10)])
    const takenThree = count(1, 10)
    assert.deepEqual(take(takenThree, 3), [1, 2, 3])
    assert.deepEqual([...takenThree], [...count(4, 10)])
    const takenAll = count(1, 10)
    assert.deepEqual(take(takenAll, 42), [...count(1, 10)])
    assert.equal([...takenAll].length, 0)
  })
  it('finds the first iterated element that satisfies a condition', function () {
    assert.ok(find(empty(), () => !assert.ok(false)).done)
    const foundFirst = count(1, 10)
    assert.equal(find(foundFirst, () => true).value, 1)
    assert.deepEqual([...foundFirst], [...count(2, 10)])
    const foundFifth = count(1, 10)
    assert.equal(find(foundFifth, n => n * n > 20).value, 5)
    assert.deepEqual([...foundFifth], [...count(6, 10)])
    const foundNothing = count(1, 10)
    assert.ok(find(foundNothing, () => false).done)
    assert.equal([...foundNothing].length, 0)
    const thisTwo: { n: number } = { n: 2 }, thisFive: typeof thisTwo = { n: 5 }
    function testObject(this: typeof thisTwo, n: number) {
      return n === this.n
    }
    assert.equal(find(count(1, 10), testObject, thisTwo).value, 2)
    assert.equal(find(count(1, 10), testObject, thisFive).value, 5)
    function testNumber(this: number, n: number) {
      return n === this
    }
    assert.equal(find(count(1, 10), testNumber, 2).value, 2)
    assert.equal(find(count(1, 10), testNumber, 5).value, 5)
  })
  it('tests whether every iterated element satisfies a condition', function () {
    assert.ok(every(empty(), () => !!assert.ok(false)))
    assert.ok(every(count(1, 10), n => n >= 1 && n <= 10))
    assert.ok(every(count(1, 10, 2), n => n % 2 === 1))
    assert.ok(!every(count(1, 10), n => n % 2 === 1))
    assert.ok(!every(count(1, 10), n => n < 10))
    const thisTwo: { n: number } = { n: 2 }, thisTen: typeof thisTwo = { n: 10 }
    function testObject(this: typeof thisTwo, n: number) {
      return n <= this.n
    }
    assert.ok(!every(count(1, 10), testObject, thisTwo))
    assert.ok(every(count(1, 10), testObject, thisTen))
    function testNumber(this: number, n: number) {
      return n <= this
    }
    assert.ok(!every(count(1, 10), testNumber, 2))
    assert.ok(every(count(1, 10), testNumber, 10))
  })
  it('tests whether some iterated element satisfies a condition', function () {
    assert.ok(!some(empty(), () => !assert.ok(false)))
    assert.ok(some(count(1, 10), n => n >= 1 && n <= 10))
    assert.ok(some(count(1, 10), n => n % 2 === 0))
    assert.ok(!some(count(1, 10, 2), n => n % 2 === 0))
    assert.ok(some(count(1, 10), n => n >= 10))
    const thisTwo: { n: number } = { n: 2 }, thisZero: typeof thisTwo = { n: 0 }
    function testObject(this: typeof thisTwo, n: number) {
      return n < this.n
    }
    assert.ok(some(count(10, 1, -1), testObject, thisTwo))
    assert.ok(!some(count(10, 1, -1), testObject, thisZero))
    function testNumber(this: number, n: number) {
      return n < this
    }
    assert.ok(some(count(10, 1, -1), testNumber, 2))
    assert.ok(!some(count(10, 1, -1), testNumber, 0))
  })
})