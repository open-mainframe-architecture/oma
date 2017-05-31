import * as assert from 'assert'
import * as mocha from 'mocha'

import * as kernel from 'oma/kernel'

const { Flavor, asap, detect, scope, uptime } = kernel

describe('feature detection', function () {
  it('respects default case', function () {
    assert.ok(detect({ when: Flavor.AnyEnvironment, install: () => true }))
  })
  it('confirms these tests are running under NodeJS', function () {
    assert.ok(detect(
      { when: Flavor.Nodejs, install: () => true },
      { when: Flavor.AnyEnvironment, install: () => false }
    ))
  })
})

describe('global scope', function () {
  it('holds usual suspects', function () {
    assert.strictEqual(scope().Object, Object)
    assert.strictEqual(scope().Boolean, Boolean)
    assert.strictEqual(scope().Number, Number)
    assert.strictEqual(scope().String, String)
    assert.strictEqual(scope().Array, Array)
    assert.strictEqual(scope().Date, Date)
    assert.strictEqual(scope().Error, Error)
    assert.strictEqual(scope().Math, Math)
    assert.strictEqual(scope().RegExp, RegExp)
  })
  it('holds modern constructs', function () {
    assert.strictEqual(scope().ArrayBuffer, ArrayBuffer)
    assert.strictEqual(scope().Int8Array, Int8Array)
    assert.strictEqual(scope().Uint8Array, Uint8Array)
    assert.strictEqual(scope().Uint8ClampedArray, Uint8ClampedArray)
    assert.strictEqual(scope().Promise, Promise)
    assert.strictEqual(scope().Intl, Intl)
  })
})

describe('uptime', function () {
  it('provides high-resolution timing', function (done) {
    const entry = uptime()
    setTimeout(() => {
      assert.ok(uptime() > exit)
      done()
    }, 0)
    const exit = uptime()
    assert.ok(exit > entry)
  })
})

describe('asap', function () {
  it('executes code in a future event cycle', function (done) {
    asap(() => {
      assert.ok(uptime() > pastCycle)
      done()
    })
    const pastCycle = uptime()
  })
})