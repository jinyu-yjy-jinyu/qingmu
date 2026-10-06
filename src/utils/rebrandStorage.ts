/**
 * Brand migration helpers for browser storage keys (AnnotPen → 轻幕).
 *
 * Legacy keys are one-way migrated to the new `lightcurtain-*` keys, and reads
 * fall back to legacy keys until the migration has run, so no user preference
 * is lost during the rebrand. Migration is idempotent and never overwrites a
 * value already present under the new key.
 */

export const LEGACY_STORAGE_KEY_MAP: Record<string, string> = {
  'annotpen-locale': 'lightcurtain-locale',
  'annotpen-toolbar-position': 'lightcurtain-toolbar-position',
  'annotpen-toolbar-window-position': 'lightcurtain-toolbar-window-position',
  'annotpen-toolbar-window-position-v2': 'lightcurtain-toolbar-window-position-v2',
}

/** Read a key preferring the new name, falling back to the legacy name. */
export function readStoredWithLegacy(newKey: string): string | null {
  try {
    const newRaw = localStorage.getItem(newKey)
    if (newRaw !== null) return newRaw
    for (const [legacyKey, mappedKey] of Object.entries(LEGACY_STORAGE_KEY_MAP)) {
      if (mappedKey === newKey) return localStorage.getItem(legacyKey)
    }
    return null
  } catch {
    return null
  }
}

/** Read a key (new first, legacy fallback) and parse it. */
export function readWithLegacyFallback<T>(newKey: string, parse: (raw: string) => T | null): T | null {
  const raw = readStoredWithLegacy(newKey)
  if (raw === null) return null
  return parse(raw)
}

/**
 * One-way migrate every legacy storage key to its new name. Returns the number
 * of keys migrated. New key already present → skipped; legacy key absent →
 * skipped; legacy key migrated → old key removed. Idempotent.
 */
export function migrateLegacyStorageKeys(): number {
  let migrated = 0
  for (const [legacyKey, newKey] of Object.entries(LEGACY_STORAGE_KEY_MAP)) {
    try {
      if (localStorage.getItem(newKey) !== null) continue
      const legacyValue = localStorage.getItem(legacyKey)
      if (legacyValue === null) continue
      localStorage.setItem(newKey, legacyValue)
      localStorage.removeItem(legacyKey)
      migrated += 1
    } catch {
      // ignore quota / private mode
    }
  }
  return migrated
}
