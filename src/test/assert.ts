/** Small assertions for utility tests; no test runner or browser types are required. */
export const assert = {
  equal(actual: unknown, expected: unknown, message = 'Values must match'): void {
    if (!Object.is(actual, expected)) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)
  },
  deepEqual(actual: unknown, expected: unknown, message = 'JSON values must match'): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  },
  ok(condition: unknown, message = 'Assertion failed'): void {
    if (!condition) throw new Error(message)
  },
  throws(action: () => unknown): void {
    try { action() } catch { return }
    throw new Error('Expected an exception')
  },
}
