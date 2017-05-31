/**
 * Always return nothing.
 */
export function returnNothing(): void {
}

/**
 * Always return null.
 * @returns Null
 */
export function returnNull() {
  return null
}

/**
 * Always return false.
 * @returns False
 */
export function returnFalse() {
  return false
}

/**
 * Always return true.
 * @returns True
 */
export function returnTrue() {
  return true
}

/**
 * Always return bound receiver.
 * @returns Bound receiver
 */
export function returnThis<T>(this: T) {
  return this
}

/**
 * Create closure that always returns the same constant.
 * @param constant Constant to return
 * @returns Closure that always returns supplied constant
 */
export function returnK<T>(constant: T): () => T {
  return () => constant
}

/**
 * Always return first argument.
 * @param arg1 First argument
 * @returns First argument
 */
export function returnArg1<T>(arg1: T): T {
  return arg1
}

/**
 * Always return second argument.
 * @param arg1 First argument
 * @param arg2 Second argument
 * @returns Second argument
 */
export function returnArg2<T>(arg1: any, arg2: T): T {
  return arg2
}

/**
 * Always return third argument.
 * @param arg1 First argument
 * @param arg2 Second argument
 * @param arg3 Third argument
 * @returns Third argument
 */
export function returnArg3<T>(arg1: any, arg2: any, arg3: T): T {
  return arg3
}

/**
 * Always throw an error.
 * @param message Error message
 * @returns never
 * @throws Error with given message
 */
export function throwError(message: string): never {
  throw new Error(message)
}
