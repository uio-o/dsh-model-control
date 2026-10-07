// Profile-patch editing rules (zero-conflict: pure text, no filesystem).
import assert from 'node:assert/strict'
import {
  findRow, looksLikePatch, readRow, removeRow, rowDisabled, setRowDisabled,
} from '../lib/profile-patch.js'

const SAMPLE = [
  '# Your patch layer for this dsh profile, applied after every bundle layer:',
  '# a top-level YAML array of loader patch entries.',
  '- id: desktop-shell',
  '  name: dsh-plugin-desktop',
  '  config:',
  '    mode: compatibility',
  '- id: appearance',
  '  disabled: true',
  '- id: dsh-model-control',
  '  name: dsh-model-control',
  '',
].join('\n')

// ── finding ──
assert.deepEqual(findRow(SAMPLE, 'appearance'), { start: 6, end: 8 })
assert.equal(findRow(SAMPLE, 'nope'), undefined)
// A prefix must not match a longer id.
assert.equal(findRow(SAMPLE, 'desk'), undefined)
assert.equal(readRow(SAMPLE, 'desktop-shell').includes('mode: compatibility'), true)

// ── reading the flag ──
assert.equal(rowDisabled(SAMPLE, 'appearance'), true)
assert.equal(rowDisabled(SAMPLE, 'desktop-shell'), false, 'no disabled field means enabled')
assert.equal(rowDisabled(SAMPLE, 'nope'), undefined)

// ── setting the flag ──
const enabled = setRowDisabled(SAMPLE, 'appearance', false)
assert.equal(enabled.changed, true)
assert.equal(rowDisabled(enabled.text, 'appearance'), false)
assert.ok(enabled.text.includes('- id: desktop-shell'), 'other rows survive')
assert.ok(enabled.text.startsWith('# Your patch layer'), 'the preamble survives')
assert.equal(enabled.text.includes('disabled: false'), true)

// Setting the same value twice is a no-op.
const again = setRowDisabled(enabled.text, 'appearance', false)
assert.equal(again.changed, false)
assert.equal(again.text, enabled.text)

// ── inserting a row that does not exist yet ──
const inserted = setRowDisabled(SAMPLE, 'ui-settings-models', true)
assert.equal(inserted.changed, true)
assert.equal(rowDisabled(inserted.text, 'ui-settings-models'), true)
assert.equal(looksLikePatch(SAMPLE, inserted.text), true, 'one more entry is structurally fine')
assert.ok(inserted.text.endsWith('\n'), 'the file keeps a trailing newline')

// Inserting into an empty file still produces an array.
const fromEmpty = setRowDisabled('', 'ui-settings-models', true)
assert.equal(rowDisabled(fromEmpty.text, 'ui-settings-models'), true)
assert.equal(looksLikePatch('- id: x\n', fromEmpty.text), true)

// ── removing a row ──
const removed = removeRow(inserted.text, 'ui-settings-models')
assert.equal(removed.changed, true)
assert.equal(findRow(removed.text, 'ui-settings-models'), undefined)
assert.equal(rowDisabled(removed.text, 'appearance'), true, 'the other rows are untouched')
assert.equal(removeRow(removed.text, 'ui-settings-models').changed, false, 'removing twice is a no-op')

// A row is removed whole: its body must not be left behind as orphans.
const withBody = setRowDisabled(SAMPLE, 'ui-settings-models', true).text
const dropped = removeRow(withBody, 'ui-settings-models')
assert.equal(dropped.text.includes('ui-settings-models'), false)

// ── the structural guard ──
assert.equal(looksLikePatch(SAMPLE, SAMPLE), true)
assert.equal(looksLikePatch(SAMPLE, ''), false)
assert.equal(looksLikePatch(SAMPLE, 'not a list at all'), false, 'a file with no entries is refused')
assert.equal(looksLikePatch(SAMPLE, SAMPLE + '- id: a\n- id: b\n- id: c\n'), false, 'three new entries is too many')
assert.equal(looksLikePatch(SAMPLE, SAMPLE.replace('- id: appearance', '\t- id: appearance')), false, 'tabs are refused')

// ── indentation is preserved ──
const spaced = SAMPLE.replace('  disabled: true', '    disabled: true')
const respaced = setRowDisabled(spaced, 'appearance', false)
assert.ok(respaced.text.includes('    disabled: false'), 'the original indent is kept')

console.log('profile-patch: all assertions passed')
