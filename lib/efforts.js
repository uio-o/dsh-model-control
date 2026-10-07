// Effort advisory engine for dsh-model-control.
//
// The ladder table is the full upstream knowledge base (see lib/knowledge.js,
// generated from dsh-better-reasoning-effort, MIT © HaoyueQin). This module adds
// the matching and inference logic around it:
//
//   1. a boundary-aware, longest-hit match over the model id (the display name
//      is a weaker secondary signal),
//   2. protocol / vendor inference for models the table does not know,
//   3. a confidence label so a surface can tell "the table says so" apart from
//      "we guessed".
//
// Pure functions only — no host imports — so it is unit-testable on its own.
import { KNOWLEDGE_BASE } from './knowledge.js'

export { KNOWLEDGE_BASE }

/** The generic ladder used when nothing better is known. */
export const GENERIC_LADDER = {
  off: 'off', low: 'low', medium: 'medium', high: 'high',
}

/** OpenAI-style stems that imply a reasoning-capable model. */
const OPENAI_REASONING_STEMS = ['o1', 'o3', 'o4', 'gpt-5', 'gpt-6']

/** Vendor default ladders per protocol family (fallback only). */
const PROTOCOL_LADDERS = {
  openai: { off: 'none', low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh' },
  anthropic: { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
  deepseek: { off: 'none', low: 'low', high: 'high', max: 'max' },
}

/** Normalize for loose matching: lowercase, collapse separators. */
function normalize(value) {
  return String(value).toLowerCase().replace(/[\s_]+/g, '-')
}

/** Does `needle` occur in `haystack` on a non-alphanumeric boundary? */
function onBoundary(haystack, at, length) {
  const before = at === 0 ? '' : haystack[at - 1]
  const after = at + length >= haystack.length ? '' : haystack[at + length]
  const edge = (ch) => ch === '' || !/[a-z0-9]/.test(ch)
  return edge(before) && edge(after)
}

/**
 * Longest boundary hit across the id (weight 1) and the display name (0.5).
 * A longer pattern is the more specific answer, which is what keeps
 * `deepseek-v4.1-flash` from being answered by the `deepseek-v4` stem.
 * @returns the matching knowledge entry, or undefined.
 */
export function matchKnowledgeBase(modelId, displayName) {
  const id = normalize(modelId)
  const name = displayName === undefined || displayName === null ? '' : normalize(displayName)
  let best
  for (const entry of KNOWLEDGE_BASE) {
    if (!Array.isArray(entry.patterns)) continue
    for (const pattern of entry.patterns) {
      if (typeof pattern !== 'string' || pattern === '') continue
      const needle = normalize(pattern)
      for (const [hay, weight] of [[id, 1], [name, 0.5]]) {
        if (hay === '') continue
        let at = hay.indexOf(needle)
        while (at >= 0) {
          if (onBoundary(hay, at, needle.length)) {
            const score = needle.length * weight
            if (best === undefined || score > best.score) best = { entry, score }
            break
          }
          at = hay.indexOf(needle, at + 1)
        }
      }
    }
  }
  return best?.entry
}

/** Is this model known to reason, from the id alone? */
function looksReasoning(modelId) {
  const id = normalize(modelId)
  if (OPENAI_REASONING_STEMS.some((stem) => id.includes(stem))) return true
  return /(^|[-.])thinking([-.]|$)|reasoner/.test(id)
}

/** Infer a vendor family from the id — used for grouping and fallback ladders. */
export function inferVendor(modelId) {
  const id = normalize(modelId)
  for (const [vendor, stem] of [
    ['deepseek', 'deepseek'], ['anthropic', 'claude'], ['openai', 'gpt'],
    ['zhipu', 'glm'], ['moonshot', 'kimi'], ['alibaba', 'qwen'],
    ['google', 'gemini'], ['xiaomi', 'mimo'], ['minimax', 'minimax'],
    ['baidu', 'ernie'], ['tencent', 'hunyuan'], ['stepfun', 'step-'],
  ]) if (id.includes(stem)) return vendor
  return undefined
}

/** Vision-capable-looking id, when nothing authoritative says otherwise. */
const VISION_NAME_TOKENS = ['vision', '-vl', 'vl-', 'multimodal', 'image']

function inferModalities(modelId) {
  const id = normalize(modelId)
  for (const token of VISION_NAME_TOKENS) {
    let at = id.indexOf(token)
    while (at >= 0) {
      if (onBoundary(id, at, token.length)) return ['text', 'image']
      at = id.indexOf(token, at + 1)
    }
  }
  return undefined
}

/**
 * The advisory for one model.
 *
 * @returns an object with:
 *   `efforts`       ordered harness-level ids (empty when the model exposes none)
 *   `wire`          level -> the value sent on the wire (`false` when the model
 *                   has no reasoning control at all)
 *   `noReasoning`   true when the table explicitly says so
 *   `defaultEffort` the vendor default level, when the table has one
 *   `input`, `contextWindow`, `maxTokens`, `note`  reference metadata
 *   `compat`        adapter flags to write alongside a declaration
 *   `vendor`        inferred family, for UI grouping
 *   `matched`       did the table answer, or did we infer?
 *   `source`        which entry / which inference produced this
 *   `confidence`    'high' (table) | 'medium' (vendor family) | 'low' (generic)
 */
export function advise(modelId, displayName) {
  const vendor = inferVendor(modelId)
  const entry = matchKnowledgeBase(modelId, displayName)

  if (entry !== undefined) {
    const shared = {
      ...(vendor === undefined ? {} : { vendor }),
      ...(entry.input === undefined ? {} : { input: [...entry.input] }),
      ...(entry.contextWindow === undefined ? {} : { contextWindow: entry.contextWindow }),
      ...(entry.maxTokens === undefined ? {} : { maxTokens: entry.maxTokens }),
      ...(entry.compat === undefined ? {} : { compat: { ...entry.compat } }),
      ...(entry.note === undefined ? {} : { note: entry.note }),
      ...(entry.anthropicAdaptive === undefined ? {} : { anthropicAdaptive: entry.anthropicAdaptive }),
      matched: true,
      source: entry.id,
      confidence: 'high',
    }
    // The table's explicit "no reasoning control" answer.
    if (entry.efforts === false) {
      return { ...shared, efforts: [], wire: false, noReasoning: true }
    }
    const wire = entry.efforts !== null && typeof entry.efforts === 'object' ? entry.efforts : {}
    return {
      ...shared,
      efforts: Object.keys(wire),
      wire: { ...wire },
      // A declared default only counts when the ladder actually carries it.
      ...(typeof entry.defaultEffort === 'string' && entry.defaultEffort in wire
        ? { defaultEffort: entry.defaultEffort }
        : {}),
    }
  }

  const ladder = (vendor !== undefined ? PROTOCOL_LADDERS[vendor] : undefined)
    ?? (looksReasoning(modelId) ? PROTOCOL_LADDERS.openai : GENERIC_LADDER)
  const guessedInput = inferModalities(modelId)
  return {
    efforts: Object.keys(ladder),
    wire: { ...ladder },
    ...(ladder.medium !== undefined ? { defaultEffort: 'medium' } : {}),
    ...(guessedInput === undefined ? {} : { input: guessedInput }),
    ...(vendor === undefined ? {} : { vendor }),
    matched: false,
    source: vendor !== undefined ? 'vendor-family:' + vendor : 'generic',
    confidence: vendor !== undefined ? 'medium' : 'low',
  }
}
