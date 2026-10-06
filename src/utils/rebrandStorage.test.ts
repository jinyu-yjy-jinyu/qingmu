import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LEGACY_STORAGE_KEY_MAP, migrateLegacyStorageKeys, readWithLegacyFallback } from './rebrandStorage'

function createLocalStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => store.clear()),
    _store: store,
  }
}

let mock: ReturnType<typeof createLocalStorageMock>

beforeEach(() => {
  mock = createLocalStorageMock()
  vi.stubGlobal('localStorage', mock)
})

describe('migrateLegacyStorageKeys', () => {
  it('migrates legacy value to the new key and removes the legacy key', () => {
    mock._store.set('annotpen-locale', 'zh-CN')
    expect(migrateLegacyStorageKeys()).toBe(1)
    expect(mock._store.get('lightcurtain-locale')).toBe('zh-CN')
    expect(mock._store.has('annotpen-locale')).toBe(false)
  })

  it('skips keys that already have a new-key value', () => {
    mock._store.set('annotpen-locale', 'zh-CN')
    mock._store.set('lightcurtain-locale', 'en')
    expect(migrateLegacyStorageKeys()).toBe(0)
    expect(mock._store.get('lightcurtain-locale')).toBe('en')
    expect(mock._store.has('annotpen-locale')).toBe(true)
  })

  it('is idempotent across repeated calls', () => {
    mock._store.set('annotpen-locale', 'zh-CN')
    expect(migrateLegacyStorageKeys()).toBe(1)
    expect(migrateLegacyStorageKeys()).toBe(0)
    expect(mock._store.get('lightcurtain-locale')).toBe('zh-CN')
    expect(mock._store.has('annotpen-locale')).toBe(false)
  })
})

describe('readWithLegacyFallback', () => {
  it('prefers the new key over the legacy key', () => {
    mock._store.set('annotpen-locale', 'zh-CN')
    mock._store.set('lightcurtain-locale', 'en')
    expect(readWithLegacyFallback('lightcurtain-locale', (raw) => raw)).toBe('en')
  })

  it('falls back to the legacy key when the new key is absent', () => {
    mock._store.set('annotpen-locale', 'zh-CN')
    expect(readWithLegacyFallback('lightcurtain-locale', (raw) => raw)).toBe('zh-CN')
  })

  it('returns null when neither key is present', () => {
    expect(readWithLegacyFallback('lightcurtain-locale', (raw) => raw)).toBeNull()
  })

  it('parses the value with the provided parser', () => {
    mock._store.set('annotpen-locale', 'zh-CN')
    expect(readWithLegacyFallback('lightcurtain-locale', () => 'parsed')).toBe('parsed')
  })
})

describe('LEGACY_STORAGE_KEY_MAP', () => {
  it('covers all renamed keys', () => {
    expect(Object.keys(LEGACY_STORAGE_KEY_MAP)).toEqual([
      'annotpen-locale',
      'annotpen-toolbar-position',
      'annotpen-toolbar-window-position',
      'annotpen-toolbar-window-position-v2',
    ])
  })
})
