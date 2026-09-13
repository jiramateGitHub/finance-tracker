import { createId } from './id'

const ids = new Set(Array.from({ length: 100 }, () => createId()))
if (ids.size !== 100) throw new Error('createId must produce unique ids for a burst of generated records')
if ([...ids].some((id) => !id.trim())) throw new Error('createId must never return an empty id')

const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto')
try {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {
      getRandomValues(array: Uint8Array): Uint8Array {
        array.fill(0)
        return array
      },
    },
  })
  const randomValuesId = createId()
  if (!/^00000000-0000-4000-8000-000000000000$/.test(randomValuesId)) {
    throw new Error('createId must use getRandomValues when randomUUID is unavailable')
  }

  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: undefined,
  })
  if (!/^id-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/.test(createId())) {
    throw new Error('createId must have a final fallback when Web Crypto is unavailable')
  }
} finally {
  if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor)
}

console.log('✓ browser-compatible id generation passed')
