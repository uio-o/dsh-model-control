// Declaration-rule tests (zero-conflict: no host, no DOM).
//
// The adapter validates declarations strictly, so these assertions mirror the
// rules that make a write legal: a non-empty ladder, only `off` allowed to be
// valueless, at least one level beyond `off`, and enums that exist upstream.
import assert from 'node:assert/strict'
import {
  OWNED_FIELDS, THINKING_FORMATS, THINKING_LEVELS,
  buildDeclaration, buildUndo, sanitizeCompat, sanitizeInput, sanitizeLadder,
} from '../lib/declaration.js'
import { advise } from '../lib/efforts.js'

// ── sanitizeLadder ──
assert.equal(sanitizeLadder(false), false, 'false is the "no reasoning control" answer')
assert.equal(sanitizeLadder(undefined), undefined)
assert.equal(sanitizeLadder({}), undefined, 'an empty map is rejected by the adapter')
assert.equal(sanitizeLadder({ off: 'none' }), undefined, 'a ladder offering only off promises nothing')
assert.deepEqual(sanitizeLadder({ off: null, high: 'high' }), { off: null, high: 'high' }, 'off may be valueless')
assert.deepEqual(sanitizeLadder({ off: '', high: 'high' }), { off: null, high: 'high' }, 'an empty off becomes null')
assert.deepEqual(
  sanitizeLadder({ low: 'low', medium: '', high: 'high', bogus: 'x', max: 5 }),
  { low: 'low', high: 'high' },
  'valueless non-off levels, unknown levels and non-strings are dropped',
)
assert.deepEqual(sanitizeLadder({ low: 'low' }), { low: 'low' }, 'a ladder with no off at all is fine')

// ── sanitizeCompat ──
assert.equal(sanitizeCompat(undefined), undefined)
assert.equal(sanitizeCompat({}), undefined)
assert.deepEqual(
  sanitizeCompat({ supportsReasoningEffort: true, thinkingFormat: 'deepseek' }),
  { supportsReasoningEffort: true, thinkingFormat: 'deepseek' },
)
assert.deepEqual(
  sanitizeCompat({ thinkingFormat: 'not-a-format', nope: 1, supportsStrictMode: 'yes' }),
  undefined,
  'an unknown format and a non-boolean are both refused',
)
assert.deepEqual(sanitizeCompat({ vllmPriority: 2 }), { vllmPriority: 2 })
assert.deepEqual(sanitizeCompat({ vllmPriority: 'x' }), undefined)

// ── sanitizeInput ──
assert.equal(sanitizeInput(undefined), undefined)
assert.equal(sanitizeInput([]), undefined)
assert.deepEqual(sanitizeInput(['image', 'text', 'image', 'audio']), ['image', 'text'])

// ── buildDeclaration: an undeclared entry gets the full declaration ──
const advice = advise('claude-opus-5', 'Claude Opus 5')
const fresh = buildDeclaration(advice, { id: 'claude-opus-5', name: 'claude-opus-5' })
const writtenFields = fresh.ops.map((op) => op.path[0])
assert.ok(writtenFields.includes('reasoningEfforts'))
assert.ok(writtenFields.includes('compat'))
assert.deepEqual(fresh.written, writtenFields, 'written names exactly what the plan sets')
assert.deepEqual(fresh.previous, {}, 'nothing existed before, so nothing to restore — only to remove')
const ladderOp = fresh.ops.find((op) => op.path[0] === 'reasoningEfforts')
assert.deepEqual(ladderOp.value, { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' })

// ── an already-declared entry is left alone unless forced ──
const existing = {
  id: 'claude-opus-5',
  reasoningEfforts: { low: 'low', high: 'ultra' },
  compat: { thinkingFormat: 'openai' },
  input: ['text'],
}
const untouched = buildDeclaration(advice, existing)
assert.deepEqual(untouched.ops, [], 'a hand-written declaration is not overwritten')
assert.ok(untouched.skipped.includes('reasoningEfforts-already-declared'))
assert.ok(untouched.skipped.includes('compat-already-declared'))
assert.ok(untouched.skipped.includes('input-already-declared'))

const forced = buildDeclaration(advice, existing, { force: true })
assert.equal(forced.ops.length, 3)
assert.deepEqual(forced.previous.reasoningEfforts, { low: 'low', high: 'ultra' }, 'the old value is kept for undo')
assert.deepEqual(forced.previous.compat, { thinkingFormat: 'openai' })
assert.deepEqual(forced.previous.input, ['text'])

// ── a "no reasoning control" model declares false ──
const noReasoning = advise('deepseek-v3', 'deepseek-v3')
if (noReasoning.noReasoning === true) {
  const plan = buildDeclaration(noReasoning, { id: 'deepseek-v3' })
  const op = plan.ops.find((entry) => entry.path[0] === 'reasoningEfforts')
  assert.equal(op.value, false, 'false is written as-is, not as an empty map')
} else {
  const plan = buildDeclaration({ wire: false }, { id: 'x' })
  assert.equal(plan.ops[0].value, false)
}

// ── buildUndo: restore what existed, remove what did not ──
assert.deepEqual(
  buildUndo({ reasoningEfforts: { low: 'low' } }, ['reasoningEfforts', 'compat', 'input']),
  [
    { op: 'set', path: ['reasoningEfforts'], value: { low: 'low' } },
    { op: 'unset', path: ['compat'] },
    { op: 'unset', path: ['input'] },
  ],
  'the absent fields are removed, the present one is restored',
)
assert.deepEqual(buildUndo({}, ['reasoningEfforts']), [{ op: 'unset', path: ['reasoningEfforts'] }])
assert.deepEqual(buildUndo(undefined, undefined), [
  { op: 'unset', path: ['reasoningEfforts'] },
  { op: 'unset', path: ['compat'] },
  { op: 'unset', path: ['input'] },
], 'no backup at all still produces a safe removal plan')
assert.deepEqual(buildUndo({ bogus: 1 }, ['bogus']), [], 'fields outside the owned set are ignored')

// ── every advised ladder for a real model is writable ──
for (const id of ['deepseek-flash', 'claude-opus-5', 'gpt-6.1-sol', 'glm-5.3-flashx', 'kimi-k3']) {
  const modelAdvice = advise(id, id)
  const plan = buildDeclaration(modelAdvice, { id })
  assert.ok(plan.ops.length > 0, `${id} produces a writable declaration`)
  const value = plan.ops.find((op) => op.path[0] === 'reasoningEfforts').value
  assert.notEqual(value, undefined, `${id} ladder survives validation`)
  if (value !== false) {
    assert.ok(Object.keys(value).some((level) => level !== 'off'), `${id} offers a thinking level`)
    for (const [level, wire] of Object.entries(value)) {
      assert.ok(THINKING_LEVELS.includes(level), `${id}: ${level} is a known level`)
      if (level !== 'off') assert.ok(typeof wire === 'string' && wire !== '', `${id}: ${level} has a wire value`)
    }
  }
}

// The enum mirrors stay in step with what the adapter accepts.
assert.ok(THINKING_FORMATS.includes('deepseek'))
assert.deepEqual(OWNED_FIELDS, ['reasoningEfforts', 'compat', 'input'])

console.log('declaration: all assertions passed')
