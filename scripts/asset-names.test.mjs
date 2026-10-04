import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ASCII_ASSET_PREFIX, asciiAssetName } from './lib/asset-names.mjs'

test('leaves ASCII-safe asset names untouched', () => {
  assert.equal(asciiAssetName('qingmu_1.0.1_x64-setup.exe'), null)
  assert.equal(asciiAssetName('lightcurtain_1.0.1_x64_portable.zip'), null)
  assert.equal(asciiAssetName('latest.json'), null)
})

test('repairs names whose non-ASCII prefix GitHub stripped', () => {
  // 轻幕_1.0.1_x64-setup.exe -> _1.0.1_x64-setup.exe
  assert.equal(asciiAssetName('_1.0.1_x64-setup.exe'), `${ASCII_ASSET_PREFIX}_1.0.1_x64-setup.exe`)
  assert.equal(asciiAssetName('_1.0.1_x64_zh-CN.msi'), `${ASCII_ASSET_PREFIX}_1.0.1_x64_zh-CN.msi`)
  assert.equal(asciiAssetName('_x64.app.tar.gz'), `${ASCII_ASSET_PREFIX}_x64.app.tar.gz`)
  // Other leading separators are handled the same way.
  assert.equal(asciiAssetName('-1.0.1_aarch64.dmg'), `${ASCII_ASSET_PREFIX}_1.0.1_aarch64.dmg`)
  assert.equal(asciiAssetName('.___x.msix'), `${ASCII_ASSET_PREFIX}_x.msix`)
})

test('ignores input that cannot be repaired', () => {
  assert.equal(asciiAssetName(undefined), null)
  assert.equal(asciiAssetName(null), null)
  assert.equal(asciiAssetName(''), null)
  assert.equal(asciiAssetName('___'), null)
  assert.equal(asciiAssetName('轻幕'), null)
})

test('honours a custom prefix', () => {
  assert.equal(asciiAssetName('_setup.exe', 'lightcurtain'), 'lightcurtain_setup.exe')
})
