// Vendor grouping for dsh-model-control.
//
// Pure display-layer grouping: buckets a flat model list by the model's
// vendor family, inferred from the model id. It never touches routing —
// every model keeps its `{ provider, model }` pairing, only the list layout
// changes. Rules are user-overridable via config.
//
// A rule is `{ label, patterns }`; the first rule whose pattern boundary-hits
// the id wins. Unmatched models fall into "Other".

const DEFAULT_RULES = [
  { label: 'Anthropic / Claude', patterns: ['claude'] },
  { label: 'OpenAI / GPT', patterns: ['gpt', 'o1', 'o3', 'o4', 'chatgpt', 'codex'] },
  { label: '智谱 GLM', patterns: ['glm'] },
  { label: 'DeepSeek', patterns: ['deepseek'] },
  { label: '月之暗面 Kimi', patterns: ['kimi', 'moonshot'] },
  { label: '阿里 Qwen', patterns: ['qwen', 'qwq', 'qwen3', 'qvq'] },
  { label: 'Google Gemini', patterns: ['gemini'] },
  { label: '字节 Doubao', patterns: ['doubao', 'seed-'] },
  { label: '小米 MiMo', patterns: ['mimo'] },
  { label: 'MiniMax', patterns: ['minimax', 'abab'] },
  { label: '腾讯 Hunyuan', patterns: ['hunyuan', 'hy-'] },
  { label: 'StepFun', patterns: ['step-'] },
]

function normalize(value) {
  return String(value).toLowerCase().replace(/[\s_]+/g, '-')
}

function onBoundary(haystack, at, length) {
  const before = at === 0 ? '' : haystack[at - 1]
  const after = at + length >= haystack.length ? '' : haystack[at + length]
  const edge = (ch) => ch === '' || !/[a-z0-9]/.test(ch)
  return edge(before) && edge(after)
}

function hit(id, pattern) {
  const hay = normalize(id)
  const needle = normalize(pattern)
  let at = hay.indexOf(needle)
  while (at >= 0) {
    if (onBoundary(hay, at, needle.length)) return true
    at = hay.indexOf(needle, at + 1)
  }
  return false
}

/**
 * Group models by vendor.
 * @param models - `[{ provider, id, name? }]` rows (already display-folded).
 * @param rules - optional user rules replacing the defaults.
 * @returns ordered `[{ label, models }]`, "Other" always last; original order
 *   preserved inside each bucket and for first appearance of each label.
 */
export function groupByVendor(models, rules) {
  const table = rules !== undefined && Array.isArray(rules) && rules.length > 0 ? rules : DEFAULT_RULES
  const buckets = new Map()
  const OTHER = '其他 / 未分类'
  for (const model of models) {
    let label
    for (const rule of table) {
      if (rule.patterns.some((pattern) => hit(model.id, pattern))) { label = rule.label; break }
    }
    if (label === undefined) label = OTHER
    if (!buckets.has(label)) buckets.set(label, [])
    buckets.get(label).push(model)
  }
  const out = []
  for (const rule of table) {
    const list = buckets.get(rule.label)
    if (list !== undefined && list.length > 0) out.push({ label: rule.label, models: list })
  }
  const rest = buckets.get(OTHER)
  if (rest !== undefined && rest.length > 0) out.push({ label: OTHER, models: rest })
  return out
}

export { DEFAULT_RULES }
