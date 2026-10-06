import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

export function readVersion() {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  return pkg.version
}

export function bumpVersion(current, level) {
  const [major, minor, patch] = current.split('.').map(Number)
  if (level === 'major') return `${major + 1}.0.0`
  if (level === 'minor') return `${major}.${minor + 1}.0`
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`
  throw new Error(`Invalid bump level: ${level}. Use patch, minor, or major.`)
}

export function writeVersion(nextVersion) {
  const pkgPath = join(ROOT, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  pkg.version = nextVersion
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  const lockPath = join(ROOT, 'package-lock.json')
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  lock.version = nextVersion
  if (lock.packages?.['']) lock.packages[''].version = nextVersion
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)

  const cargoPath = join(ROOT, 'src-tauri/Cargo.toml')
  writeFileSync(cargoPath, readFileSync(cargoPath, 'utf8').replace(/^version = ".*"$/m, `version = "${nextVersion}"`))

  const cargoLockPath = join(ROOT, 'src-tauri/Cargo.lock')
  writeFileSync(
    cargoLockPath,
    readFileSync(cargoLockPath, 'utf8').replace(
      /(\[\[package\]\]\nname = "lightcurtain"\nversion = ")[^"]+(")/,
      `$1${nextVersion}$2`,
    ),
  )

  // Tauri's own config drives bundle/installer file names — keep it in sync.
  const tauriConfPath = join(ROOT, 'src-tauri/tauri.conf.json')
  writeFileSync(
    tauriConfPath,
    readFileSync(tauriConfPath, 'utf8').replace(/("version":\s*")[^"]+(")/, `$1${nextVersion}$2`),
  )

  // MSIX manifest uses a 4-part version (major.minor.patch.revision).
  const msixPath = join(ROOT, 'appxmanifest.xml')
  writeFileSync(
    msixPath,
    readFileSync(msixPath, 'utf8').replace(
      /(Version=")\d+\.\d+\.\d+\.\d+(")/,
      `$1${nextVersion}.0$2`,
    ),
  )
}
