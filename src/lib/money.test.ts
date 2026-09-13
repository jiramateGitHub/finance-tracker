import { fromMinorUnits, MoneyConversionError, formatMinorUnits, roundTripMoney, toMinorUnits } from './money'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

console.log('Testing money minor-unit conversion...')
assert(toMinorUnits('1,200.50') === 120050, 'Formatted major amounts should convert exactly')
assert(toMinorUnits(12.34) === 1234, 'Decimal major amounts should convert to integer minor units')
assert(fromMinorUnits(1234) === 12.34, 'Minor units should convert back to major units')
assert(formatMinorUnits(1234) === '12.34', 'Minor units should have stable two-decimal formatting')
const rounded = roundTripMoney('10.005', { rounding: 'half-up' })
assert(rounded.minor === 1001 && rounded.text === '10.01', 'Half-up rounding should be explicit and deterministic')

let rejected = false
try {
  toMinorUnits('10.005')
} catch (error) {
  rejected = error instanceof MoneyConversionError
}
assert(rejected, 'Precision loss must be rejected unless rounding is requested')

let unsafeRejected = false
try {
  fromMinorUnits(Number.MAX_SAFE_INTEGER + 1)
} catch (error) {
  unsafeRejected = error instanceof MoneyConversionError
}
assert(unsafeRejected, 'Unsafe minor units must be rejected')

console.log('✓ Money minor-unit conversion passed')
