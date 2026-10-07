// Sidecar store round-trip test (zero-conflict: temp dir, no host, no DOM).
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createStore, emptyState, readState, resolveHome, statePath, writeState } from '../lib/store.js'

const home = mkdtempSync(join(tmpdir(), 'model-control-test-'))
try {
  // 1. Missing file → default state, no throw.
  assert.deepEqual(readState(home), emptyState())
  assert.equal(existsSync(statePath(home)), false)

  // 2. Write then read back in a FRESH store (simulates a process restart).
  const store = createStore(home)
  const written = store.update({ defaults: { 'my-self/deepseek-flash': 'max' } })
  assert.equal(written.persisted, true, 'write reports persisted')
  assert.equal(written.state.defaults['my-self/deepseek-flash'], 'max')

  const fresh = createStore(home)
  assert.equal(fresh.read().defaults['my-self/deepseek-flash'], 'max', 'survives a fresh store')

  // 3. Grouping patch merges without dropping defaults.
  const afterGrouping = fresh.update({ grouping: [{ label: 'X', patterns: ['x'] }] })
  assert.equal(afterGrouping.state.grouping.length, 1)
  assert.equal(afterGrouping.state.defaults['my-self/deepseek-flash'], 'max', 'merge keeps defaults')

  // 4. On-disk document is valid JSON with the expected shape.
  const onDisk = JSON.parse(readFileSync(statePath(home), 'utf8'))
  assert.equal(onDisk.version, 1)
  assert.equal(onDisk.defaults['my-self/deepseek-flash'], 'max')
  assert.equal(onDisk.grouping[0].label, 'X')

  // 5. Corrupt file degrades to defaults instead of throwing.
  writeFileSync(statePath(home), '{ not json', 'utf8')
  assert.deepEqual(readState(home), emptyState(), 'corrupt file degrades safely')

  // 5b. A UTF-8 BOM is NOT corruption: a hand-edit adds one, and treating it as
  // corrupt silently wiped a full document (measured live: 8 declaration
  // backups lost). The document must survive.
  const full = { version: 1, defaults: { a: 'high' }, grouping: null, declarations: { 'p/m': { at: 'x', previous: {}, written: ['reasoningEfforts'] } }, autofill: true, hidden: {} }
  writeFileSync(statePath(home), '\uFEFF' + JSON.stringify(full, null, 2), 'utf8')
  const withBom = readState(home)
  assert.equal(withBom.defaults.a, 'high', 'a BOM-prefixed document still parses')
  assert.deepEqual(Object.keys(withBom.declarations), ['p/m'], 'the declaration backups survive the BOM')

  // 5c. The new fields round-trip, and `hidden`/`takeover` defaults are stable.
  writeFileSync(statePath(home), JSON.stringify(full), 'utf8')
  assert.deepEqual(readState(home).hidden, {})
  assert.equal(readState(home).autofill, true)
  assert.equal(readState(home).takeover, true, 'takeover still defaults on for older documents')

  // 6. resolveHome honours DSH_HOME and ignores blank values.
  assert.equal(resolveHome({ DSH_HOME: 'D:/tmp/x' }), 'D:/tmp/x')
  assert.ok(resolveHome({ DSH_HOME: '   ' }).endsWith('.dsh'), 'blank DSH_HOME falls back to ~/.dsh')
  assert.ok(resolveHome({}).endsWith('.dsh'))

  // 7. writeState creates missing directories.
  const nested = join(home, 'deep', 'nested')
  assert.equal(writeState(nested, { defaults: { a: 'low' }, grouping: null }), true)
  assert.equal(readState(nested).defaults.a, 'low')

  console.log('store: all assertions passed')
} finally {
  rmSync(home, { recursive: true, force: true })
}
