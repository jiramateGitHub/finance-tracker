import { resolveInitialView } from './viewSettings'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}

assert(resolveInitialView(null, 'trips') === 'trips', 'Persisted defaultView should be used when URL is absent')
assert(resolveInitialView('yearly', 'trips') === 'yearly', 'Valid URL view should override persisted defaultView')
assert(resolveInitialView('unknown', 'trips') === 'trips', 'Invalid URL view should fall back to persisted defaultView')
assert(resolveInitialView(null, 'unknown') === 'monthly', 'Invalid persisted defaultView should use monthly fallback')

console.log('✓ supported defaultView resolution passed')
