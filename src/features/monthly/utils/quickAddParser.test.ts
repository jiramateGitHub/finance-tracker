import { parseQuickAdd } from './quickAddParser'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}
assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

const valid = parseQuickAdd('ค่าไฟ 1,450 ยังไม่จ่าย')
assert(valid, 'A valid Quick Add entry should parse')
assert.equal(valid.amount, 1450, 'Quick Add should retain grouped thousands')
assert.equal(valid.status, 'pending', 'Quick Add should identify an unpaid expense')
assert.equal(parseQuickAdd('กาแฟ 65.999'), null, 'Quick Add must reject amounts with more than two decimal places')
assert.equal(parseQuickAdd('กาแฟ 65.999 บาท'), null, 'Quick Add must not extract a trailing digit from an invalid amount')

console.log('✓ Quick Add parser validation passed')
