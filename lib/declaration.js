// Declaration construction for dsh-model-control.
//
// A "declaration" is the part of an `llm-pi-ai` model entry that tells the
// adapter what the model can do: `reasoningEfforts` (which thinking levels
// exist and what each is called on the wire), `compat` (adapter flags such as
// thinkingFormat), and `input` (modalities). Without it the harness shows no
// effort control at all — which is exactly the state a third-party channel
// starts in, since the official models page never exposes these fields.
//
// The adapter validates them strictly, so this module enforces the same rules
// before anything is written:
//   * `reasoningEfforts` is either `false` (no reasoning control) or a non-empty
//     map of level -> wire value,
//   * only `off` may carry an empty/null wire value; every other level needs a
//     non-empty string,
//   * at least one level other than `off` must be offered,
//   * level names and `thinkingFormat` come from the adapter's own enums.
//
// Pure functions: no host imports, so the rules are unit-testable.
import { advise } from './efforts.js'

/** Mirrors `THINKING_LEVELS` in the pi-ai adapter. */
export const THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']

/** Mirrors `SUPPORTED_THINKING_FORMATS` in the pi-ai adapter. */
export const THINKING_FORMATS = [
  'openai', 'deepseek', 'openrouter', 'together', 'baseten', 'zai', 'qwen',
  'chat-template', 'qwen-chat-template', 'string-thinking', 'ant-ling',
]

/** Boolean flags a declaration may carry inside `compat`. */
const COMPAT_BOOLEAN_KEYS = [
  'supportsStore', 'supportsDeveloperRole', 'supportsReasoningEffort',
  'supportsUsageInStreaming', 'supportsFinishReason', 'requiresToolResultName',
  'requiresAssistantAfterToolResult', 'requiresThinkingAsText',
  'requiresReasoningContentOnAssistantMessages', 'supportsThinkingTokenBudget',
  'supportsMaxOutputTokens', 'supportsStrictMode', 'supportsLongCacheRetention',
  'supportsEagerToolInputStreaming', 'supportsCacheControlOnTools',
  'supportsTemperature', 'forceAdaptiveThinking', 'allowEmptySignature',
  'supportsStrictTools',
]

/** The fields a declaration owns. Everything else on the entry is preserved. */
export const OWNED_FIELDS = ['reasoningEfforts', 'compat', 'input']

/**
 * Validate an advised ladder into a writable `reasoningEfforts` value.
 * @returns `false` for "no reasoning control", a cleaned map, or undefined when
 *   the ladder cannot be written at all (the caller skips that model).
 */
export function sanitizeLadder(wire) {
  if (wire === false) return false
  if (wire === null || typeof wire !== 'object' || Array.isArray(wire)) return undefined

  const out = {}
  for (const level of THINKING_LEVELS) {
    if (!(level in wire)) continue
    const value = wire[level]
    if (level === 'off') {
      // `off` is the one level allowed to be valueless: an empty spelling still
      // arms the adapter's disabled branch.
      if (value === null || value === '' || value === undefined) out.off = null
      else if (typeof value === 'string') out.off = value
      continue
    }
    if (typeof value === 'string' && value !== '') out[level] = value
  }

  // The adapter rejects an empty map, and rejects a map offering nothing but
  // `off` — both would be a declaration that promises no thinking at all.
  const beyondOff = Object.keys(out).filter((level) => level !== 'off')
  if (beyondOff.length === 0) return undefined
  return out
}

/** Keep only the compat keys and value shapes the adapter accepts. */
export function sanitizeCompat(compat) {
  if (compat === null || typeof compat !== 'object' || Array.isArray(compat)) return undefined
  const out = {}
  for (const key of COMPAT_BOOLEAN_KEYS) {
    if (typeof compat[key] === 'boolean') out[key] = compat[key]
  }
  if (typeof compat.thinkingFormat === 'string' && THINKING_FORMATS.includes(compat.thinkingFormat)) {
    out.thinkingFormat = compat.thinkingFormat
  }
  if (typeof compat.maxTokensField === 'string') out.maxTokensField = compat.maxTokensField
  if (typeof compat.thinkingTokenBudgetField === 'string') out.thinkingTokenBudgetField = compat.thinkingTokenBudgetField
  if (typeof compat.cacheControlFormat === 'string') out.cacheControlFormat = compat.cacheControlFormat
  if (typeof compat.vllmPriority === 'number' && Number.isFinite(compat.vllmPriority)) out.vllmPriority = compat.vllmPriority
  if (compat.chatTemplateKwargs !== null && typeof compat.chatTemplateKwargs === 'object') {
    out.chatTemplateKwargs = compat.chatTemplateKwargs
  }
  if (compat.chatTemplateArgs !== null && typeof compat.chatTemplateArgs === 'object') {
    out.chatTemplateArgs = compat.chatTemplateArgs
  }
  return Object.keys(out).length === 0 ? undefined : out
}

/** Keep only the modalities the adapter knows. */
export function sanitizeInput(input) {
  if (!Array.isArray(input)) return undefined
  const out = input.filter((value) => value === 'text' || value === 'image')
  return out.length === 0 ? undefined : [...new Set(out)]
}

/**
 * Build the write plan for one model.
 *
 * `force: false` (the default) never overwrites a field the entry already
 * declares — a hand-written `reasoningEfforts` is the user's own work and a
 * re-run must not silently replace it. `force: true` refreshes the advice over
 * whatever is there.
 *
 * @param advice - the output of {@link advise}.
 * @param existing - the model entry as configured (may be undefined).
 * @param options - `{ force }`.
 * @returns `{ ops, previous, skipped }`:
 *   `ops`      `{ path, value }` pairs relative to the model entry,
 *   `previous` the prior value of each owned field (for undo),
 *   `skipped`  why nothing was written, when that is the case.
 */
export function buildDeclaration(advice, existing, options = {}) {
  const force = options.force === true
  const entry = existing !== null && typeof existing === 'object' ? existing : {}
  const ops = []
  const previous = {}
  const written = []
  const skipped = []

  const ladder = sanitizeLadder(advice?.wire)
  if (advice?.wire === undefined) {
    skipped.push('no-ladder')
  } else if (ladder === undefined) {
    skipped.push('unwritable-ladder')
  } else if (!force && entry.reasoningEfforts !== undefined) {
    skipped.push('reasoningEfforts-already-declared')
  } else {
    ops.push({ path: ['reasoningEfforts'], value: ladder })
    written.push('reasoningEfforts')
    if (entry.reasoningEfforts !== undefined) previous.reasoningEfforts = entry.reasoningEfforts
  }

  const compat = sanitizeCompat(advice?.compat)
  if (compat !== undefined) {
    if (force || entry.compat === undefined) {
      ops.push({ path: ['compat'], value: compat })
      written.push('compat')
      if (entry.compat !== undefined) previous.compat = entry.compat
    } else {
      skipped.push('compat-already-declared')
    }
  }

  const input = sanitizeInput(advice?.input)
  if (input !== undefined) {
    if (force || entry.input === undefined) {
      ops.push({ path: ['input'], value: input })
      written.push('input')
      if (entry.input !== undefined) previous.input = entry.input
    } else {
      skipped.push('input-already-declared')
    }
  }

  return { ops, previous, written, skipped }
}

/**
 * The inverse plan: restore each written field to its prior value, or remove it
 * when it was absent before the declaration.
 *
 * `previous` only carries fields that had a value, because a JSON round-trip
 * drops `undefined` — "it was absent" is derived from `written` minus
 * `previous`, never stored as a value.
 *
 * @param previous - the fields that had a value (see {@link buildDeclaration}).
 * @param written - the field names the declaration set.
 */
export function buildUndo(previous, written) {
  const ops = []
  const fields = Array.isArray(written) && written.length > 0 ? written : OWNED_FIELDS
  const before = previous !== null && typeof previous === 'object' ? previous : {}
  for (const field of fields) {
    if (!OWNED_FIELDS.includes(field)) continue
    if (Object.prototype.hasOwnProperty.call(before, field)) {
      ops.push({ op: 'set', path: [field], value: before[field] })
    } else {
      ops.push({ op: 'unset', path: [field] })
    }
  }
  return ops
}

/** Convenience: advice for a model id, ready to hand to buildDeclaration. */
export function adviceFor(modelId, displayName) {
  return advise(modelId, displayName)
}
