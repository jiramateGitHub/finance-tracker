import { addMonths, currentMonthInputValue, getMonthKey, clampPercent, parseAmountSafe, formatDate, formatMonth } from './formatters'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}
assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}
assert.ok = function (val: unknown, message?: string) {
  if (!val) throw new Error(message || 'Expected truthy value')
}

console.log('Testing formatters and date utilities...')

// addMonths forward
assert.equal(addMonths('2026-01', 1), '2026-02')
assert.equal(addMonths('2026-01', 12), '2027-01')
assert.equal(addMonths('2026-11', 2), '2027-01')

// addMonths backward
assert.equal(addMonths('2026-01', -1), '2025-12')
assert.equal(addMonths('2026-03', -3), '2025-12')
assert.equal(addMonths('2026-05', 0), '2026-05')

// getMonthKey
assert.equal(getMonthKey('2026-09-15'), '2026-09')

// clampPercent
assert.equal(clampPercent(50), 50)
assert.equal(clampPercent(-10), 0)
assert.equal(clampPercent(150), 100)
assert.equal(clampPercent(NaN), 0)

// parseAmountSafe
assert.equal(parseAmountSafe('1,500.50'), 1500.5)
assert.equal(parseAmountSafe(''), 0)
assert.equal(parseAmountSafe(undefined, 10), 10)

// formatDate and formatMonth
assert.equal(formatDate(''), '-')
assert.equal(formatMonth(''), '-')
assert.equal(formatDate('invalid-date'), 'invalid-date')
assert.equal(formatMonth('invalid-month'), 'invalid-month')
assert.ok(formatDate('2026-09-15').length > 0)
assert.ok(formatMonth('2026-09').length > 0)

// currentMonthInputValue format
assert.ok(/^\d{4}-\d{2}$/.test(currentMonthInputValue()), 'currentMonthInputValue should match YYYY-MM')

console.log('✓ All formatters tests passed successfully! 🎉')
