import { CATEGORY_CHART_COLORS, MASTER_COLORS, SEMANTIC_TONE_CLASSES, type SemanticTone } from './theme'

console.log('Testing master color theme and design tokens...')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

// 1. Master colors structure and format
assert(MASTER_COLORS.primary[600].startsWith('#'), 'primary[600] must start with #')
assert(MASTER_COLORS.primary[600] === '#2563eb', 'primary[600] must be #2563eb')
assert(MASTER_COLORS.income[600] === '#059669', 'income[600] must be #059669')
assert(MASTER_COLORS.expense[600] === '#e11d48', 'expense[600] must be #e11d48')
assert(MASTER_COLORS.warning[600] === '#d97706', 'warning[600] must be #d97706')
assert(MASTER_COLORS.neutral[900] === '#0f172a', 'neutral[900] must be #0f172a')
console.log('✓ MASTER_COLORS structure passed')

// 2. Category chart palette
assert(CATEGORY_CHART_COLORS.length === 8, 'CATEGORY_CHART_COLORS length must be 8')
const uniqueChartColors = new Set(CATEGORY_CHART_COLORS)
assert(uniqueChartColors.size === 8, 'CATEGORY_CHART_COLORS must contain 8 unique colors')
CATEGORY_CHART_COLORS.forEach((color) => {
  assert(/^#[0-9a-fA-F]{6}$/.test(color), `Color ${color} must be a valid 6-character hex code`)
})
console.log('✓ CATEGORY_CHART_COLORS passed')

// 3. Semantic tone classes
const expectedTones: SemanticTone[] = ['primary', 'income', 'expense', 'warning', 'neutral']
expectedTones.forEach((tone) => {
  const mapping = SEMANTIC_TONE_CLASSES[tone]
  assert(Boolean(mapping), `Tone ${tone} should exist in SEMANTIC_TONE_CLASSES`)
  assert(mapping.text.length > 0, `Tone ${tone} text class must not be empty`)
  assert(mapping.bgLight.length > 0, `Tone ${tone} bgLight class must not be empty`)
  assert(mapping.solid.length > 0, `Tone ${tone} solid class must not be empty`)
  assert(mapping.badge.length > 0, `Tone ${tone} badge class must not be empty`)
  assert(mapping.bar.length > 0, `Tone ${tone} bar class must not be empty`)
})
console.log('✓ SEMANTIC_TONE_CLASSES passed')

console.log('ALL THEME TESTS PASSED! 🎉')
