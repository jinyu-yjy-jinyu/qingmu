#!/usr/bin/env node
/**
 * Verify package-lock.json dependency engine ranges against the pinned Node version.
 * Runs without node_modules so CI can use it before npm ci.
 * Unknown/complex semver patterns are skipped (no false positives).
 *
 * Packages npm would never install on this host are skipped as well: optional
 * platform binaries carry `os` / `cpu` / `libc` guards, so their engine ranges
 * cannot affect this platform. Needed because some of them ship sloppy
 * metadata — e.g. @img/sharp-win32-ia32 declares "^20.9.0" while all 16 of its
 * sibling packages declare ">=20.9.0".
 *
 * Pass --verbose (or CHECK_LOCK_ENGINES_VERBOSE=1) to list what was skipped.
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'))

const pinnedNode = pkg.engines?.node
if (!pinnedNode) process.exit(0)

const verbose = process.argv.includes('--verbose') || process.env.CHECK_LOCK_ENGINES_VERBOSE === '1'

// ------------------------------------------------------------------ semver

function parseVersion(version) {
  const cleaned = String(version).replace(/^v/, '').trim()
  const parts = cleaned.split('.').map((p) => Number(p))
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return null
  return {
    major: parts[0],
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  }
}

function compare(a, b) {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

function satisfiesSingle(version, range) {
  range = range.trim()

  if (/^\d+$/.test(range)) {
    return version.major === Number(range)
  }

  if (range.startsWith('>=')) {
    const min = parseVersion(range.slice(2).trim())
    if (!min) return true
    return compare(version, min) >= 0
  }

  if (range.startsWith('^')) {
    const base = parseVersion(range.slice(1).trim())
    if (!base) return true
    if (base.major > 0) {
      return version.major === base.major && compare(version, base) >= 0
    }
    if (base.minor > 0) {
      return version.major === 0 && version.minor === base.minor && compare(version, base) >= 0
    }
    return version.major === 0 && version.minor === 0 && compare(version, base) >= 0
  }

  return true
}

function satisfies(version, range) {
  return range.split('||').some((part) => satisfiesSingle(version, part))
}

// --------------------------------------------------------- host applicability

function detectLibc() {
  if (process.platform !== 'linux') return null
  try {
    return process.report?.getReport?.()?.header?.glibcVersionRuntime ? 'glibc' : 'musl'
  } catch {
    return null
  }
}

const HOST = { os: process.platform, cpu: process.arch, libc: detectLibc() }

/**
 * Mirrors npm's os / cpu / libc matching: a matching "!value" entry excludes the
 * package, and when positive entries exist at least one of them must match.
 * Returns true when the host value is unknown so we never silently skip checks.
 */
function matchesHostConstraint(list, value) {
  if (!Array.isArray(list) || list.length === 0) return true
  if (!value) return true

  let hasPositive = false
  let matched = false

  for (const raw of list) {
    if (typeof raw !== 'string') continue
    const negated = raw.startsWith('!')
    const entry = negated ? raw.slice(1) : raw
    if (negated) {
      if (entry === value) return false
    } else {
      hasPositive = true
      if (entry === value) matched = true
    }
  }

  return hasPositive ? matched : true
}

function isInstallableHere(meta) {
  return (
    matchesHostConstraint(meta?.os, HOST.os) &&
    matchesHostConstraint(meta?.cpu, HOST.cpu) &&
    matchesHostConstraint(meta?.libc, HOST.libc)
  )
}

// -------------------------------------------------------------------- check

const nodeVersion = parseVersion(pinnedNode)
if (!nodeVersion) {
  console.error(`✖ Invalid engines.node in package.json: ${pinnedNode}`)
  process.exit(1)
}

const versionLabel = `${nodeVersion.major}.${nodeVersion.minor}.${nodeVersion.patch}`
const failures = []
const skipped = []
let checked = 0

for (const [pkgPath, meta] of Object.entries(lock.packages ?? {})) {
  const range = meta?.engines?.node
  if (!range || typeof range !== 'string') continue

  const name = pkgPath.replace(/^node_modules\//, '') || lock.name

  if (!isInstallableHere(meta)) {
    skipped.push({ name, range })
    continue
  }

  checked++
  if (!satisfies(nodeVersion, range)) {
    failures.push({ name, range })
  }
}

if (verbose) {
  const hostLabel = [HOST.os, HOST.cpu, HOST.libc].filter(Boolean).join('/')
  console.error(`Host ${hostLabel} — checked ${checked} range(s), skipped ${skipped.length}.`)
  for (const { name, range } of skipped) {
    console.error(`  – skipped ${name} (requires node ${range})`)
  }
}

if (failures.length === 0) {
  if (verbose) {
    console.error(`✔ Node ${versionLabel} satisfies every applicable engine range.`)
  }
  process.exit(0)
}

console.error(`\n✖ Pinned Node ${versionLabel} does not satisfy lockfile engine requirements:\n`)
for (const { name, range } of failures.sort((a, b) => a.name.localeCompare(b.name))) {
  console.error(`  • ${name}: requires node ${range}`)
}
console.error(`
Bump engines.node / .nvmrc / .node-version together, then re-run:

  npm run check:engines

If one platform package disagrees with all of its siblings, it is usually an
upstream metadata typo — report it there rather than widening the Node pin.
`)
process.exit(1)
