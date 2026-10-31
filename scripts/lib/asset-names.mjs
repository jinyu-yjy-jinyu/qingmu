/**
 * Helpers for GitHub release asset names.
 *
 * GitHub silently strips non-ASCII characters from uploaded asset names, so a
 * build whose productName is Chinese (`轻幕_1.0.1_x64-setup.exe`) ends up stored
 * as `_1.0.1_x64-setup.exe`. Release automation re-uploads such assets under a
 * stable ASCII prefix instead, keeping the Chinese product name in the app while
 * keeping the download list readable.
 */

export const ASCII_ASSET_PREFIX = 'qingmu'

/**
 * The ASCII-safe name an asset should be re-uploaded as.
 *
 * Returns `null` when no rename is needed — either the name already starts with
 * an ASCII letter/digit, or nothing usable is left after stripping separators.
 *
 * @param {unknown} name Current asset name as returned by the GitHub API.
 * @param {string} [prefix] Prefix to use for repaired names.
 * @returns {string | null}
 */
export function asciiAssetName(name, prefix = ASCII_ASSET_PREFIX) {
  if (typeof name !== 'string' || name === '') return null
  if (/^[A-Za-z0-9]/.test(name)) return null

  const trimmed = name.replace(/^[^A-Za-z0-9]+/, '')
  if (!trimmed) return null

  return `${prefix}_${trimmed}`
}
