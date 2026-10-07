// Model-selection pure-function tests (zero-conflict: no host, no DOM).
import assert from 'node:assert/strict'
import { buildSelection, diffSelection, modelFromDiscovered } from '../lib/selection.js'

// ── modelFromDiscovered ──
assert.deepEqual(modelFromDiscovered({ id: 'a' }), { id: 'a' }, 'absent fields are omitted, not written as undefined')
assert.deepEqual(
  modelFromDiscovered({ id: 'a', name: 'A', contextWindow: 1000, maxTokens: 500, inputModalities: ['text', 'image'] }),
  { id: 'a', name: 'A', contextWindow: 1000, maxTokens: 500, input: ['text', 'image'] },
)
assert.deepEqual(modelFromDiscovered({ id: 'a', inputModalities: [] }), { id: 'a' }, 'an empty modality list is not a declaration')

// ── buildSelection: the three rules ──
const existing = [
  { id: 'deepseek-flash', name: 'deepseek-flash', reasoningEfforts: { low: 'low', high: 'high' }, custom: true },
  { id: 'claude-opus-5', name: 'claude-opus-5', input: ['text', 'image'] },
]
const discovered = [
  { id: 'deepseek-flash', name: 'deepseek-flash', contextWindow: 1000000 },
  { id: 'claude-opus-5', name: 'claude-opus-5', contextWindow: 1000000 },
  { id: 'brand-new', name: 'brand-new', contextWindow: 200000 },
]

// 1. Keeping a configured model preserves it VERBATIM (hand edits survive).
const kept = buildSelection(existing, discovered, ['deepseek-flash'])
assert.deepEqual(kept, [existing[0]], 'the existing entry object is reused untouched')
assert.equal(kept[0].custom, true, 'an unknown hand-written field survives')
assert.deepEqual(kept[0].reasoningEfforts, { low: 'low', high: 'high' })

// 2. Adding a discovered model materialises metadata; order follows the pick.
const added = buildSelection(existing, discovered, ['deepseek-flash', 'brand-new'])
assert.deepEqual(added.map((m) => m.id), ['deepseek-flash', 'brand-new'], 'existing first, then new')
assert.equal(added[1].contextWindow, 200000)

// 3. Removing is just "not selected".
const removed = buildSelection(existing, discovered, ['brand-new'])
assert.deepEqual(removed.map((m) => m.id), ['brand-new'])
assert.equal(
  removed.some((m) => m.id === 'claude-opus-5'),
  false,
  'an unselected model disappears from the channel entirely',
)

// Order of kept models follows the existing array, not the selection array.
const reordered = buildSelection(existing, discovered, ['claude-opus-5', 'deepseek-flash'])
assert.deepEqual(reordered.map((m) => m.id), ['deepseek-flash', 'claude-opus-5'], 'existing order wins for kept rows')

// A selected id with no metadata still lands as `{ id }` — never silently dropped.
const manual = buildSelection([], [], ['hand-written-id'])
assert.deepEqual(manual, [{ id: 'hand-written-id' }])

// Selecting nothing empties the channel.
assert.deepEqual(buildSelection(existing, discovered, []), [])
// Missing/odd input never throws.
assert.deepEqual(buildSelection(undefined, undefined, []), [])
assert.deepEqual(buildSelection(null, null, null), [])
assert.deepEqual(buildSelection([{ bad: true }, null], [], []), [], 'entries without an id are ignored')
// Duplicate selections collapse.
assert.equal(buildSelection([], [], ['a', 'a', 'a']).length, 1)

// ── diffSelection ──
assert.deepEqual(diffSelection(existing, ['deepseek-flash', 'brand-new']), {
  added: ['brand-new'],
  removed: ['claude-opus-5'],
  kept: ['deepseek-flash'],
})
assert.deepEqual(diffSelection(undefined, []), { added: [], removed: [], kept: [] })

console.log('selection: all assertions passed')
