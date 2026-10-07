// Unit smoke tests for the pure engine modules (zero-conflict: no DOM, no host).
import assert from 'node:assert/strict'
import { advise, matchKnowledgeBase, KNOWLEDGE_BASE, inferVendor } from '../lib/efforts.js'
import { groupByVendor, DEFAULT_RULES } from '../lib/grouping.js'

// ── the knowledge base is the full upstream table ──
assert.equal(KNOWLEDGE_BASE.length, 65, 'the full 65-entry table is bundled')
assert.ok(
  KNOWLEDGE_BASE.some((entry) => entry.efforts === false),
  'the table keeps its explicit "no reasoning control" answers',
)

// ── advise: table hits ──
const flash = advise('deepseek-flash', 'DeepSeek')
assert.equal(flash.matched, true)
assert.equal(flash.source, 'deepseek-v4-1-flash', 'the V4.1 entry, not the plain v4 stem')
assert.equal(flash.defaultEffort, 'high')
assert.deepEqual(flash.input, ['text', 'image'])
assert.equal(flash.wire.off, 'none', 'off maps to wire none')
assert.equal(flash.compat.thinkingFormat, 'deepseek', 'the adapter compat flags ride along')
assert.equal(flash.confidence, 'high')

const opus = advise('claude-opus-5', 'Claude Opus 5')
assert.equal(opus.matched, true)
assert.equal(opus.source, 'anthropic-claude-5')
assert.deepEqual(opus.efforts, ['low', 'medium', 'high', 'xhigh', 'max'], 'the table ladder, not a guess')
assert.equal(opus.defaultEffort, 'high')
assert.deepEqual(opus.compat, { supportsReasoningEffort: true })

const gpt6 = advise('gpt-6.1-sol', 'gpt-6.1-sol')
assert.equal(gpt6.matched, true, 'the table knows the gpt-6 generation')
assert.equal(gpt6.source, 'openai-gpt-6-astra')

const glm = advise('glm-5.3-flashx', 'GLM')
assert.equal(glm.matched, true)
assert.equal(glm.vendor, 'zhipu')
assert.equal(glm.defaultEffort, 'max', 'GLM 5.3 Flash defaults to max in the table')

// ── advise: no-reasoning entries ──
const noReasoning = KNOWLEDGE_BASE.find((entry) => entry.efforts === false)
const noReasoningAdvice = advise(noReasoning.patterns[0], noReasoning.patterns[0])
assert.equal(noReasoningAdvice.matched, true)
assert.equal(noReasoningAdvice.noReasoning, true, 'the table can say "this model has no effort control"')
assert.equal(noReasoningAdvice.wire, false)
assert.deepEqual(noReasoningAdvice.efforts, [])

// ── advise: fallback for unknown models ──
const unknown = advise('totally-unknown-x', 'Totally Unknown X')
assert.equal(unknown.matched, false)
assert.equal(unknown.confidence, 'low')
assert.ok(Array.isArray(unknown.efforts) && unknown.efforts.length > 0)

const unknownVendor = advise('some-gpt-wrapper-9000', 'wrapper')
assert.equal(unknownVendor.matched, false)
assert.equal(unknownVendor.confidence, 'medium', 'a recognisable vendor family upgrades the guess')
assert.equal(unknownVendor.vendor, 'openai')

// ── longest boundary hit ──
const longest = matchKnowledgeBase('deepseek-v4.1-flash', 'DeepSeek')
assert.equal(longest.id, 'deepseek-v4-1-flash', 'the longest pattern wins over the v4 stem')
assert.equal(matchKnowledgeBase('claude-opus-5', undefined).id, 'anthropic-claude-5')

// A stem inside a longer word must not match.
assert.equal(matchKnowledgeBase('notdeepseekatall', undefined), undefined, 'no boundary, no match')
assert.equal(inferVendor('some-gpt-wrapper-9000'), 'openai')

// ── groupByVendor ──
const rows = [
  { provider: 'gw', id: 'claude-opus-5' },
  { provider: 'gw', id: 'gpt-6.1-sol' },
  { provider: 'gw', id: 'glm-5.3-flashx' },
  { provider: 'gw', id: 'deepseek-flash' },
  { provider: 'gw', id: 'mimo-pro' },
  { provider: 'gw', id: 'my-relay-custom-model' },
]
const groups = groupByVendor(rows)
const labels = groups.map((group) => group.label)
assert.ok(labels.includes('Anthropic / Claude'))
assert.ok(labels.includes('OpenAI / GPT'))
assert.ok(labels.includes('智谱 GLM'))
assert.ok(labels.includes('DeepSeek'))
assert.ok(labels.includes('小米 MiMo'))
assert.equal(labels[labels.length - 1], '其他 / 未分类', 'Other bucket is last')
assert.equal(groups.reduce((sum, group) => sum + group.models.length, 0), rows.length, 'no model lost or duplicated')

const custom = groupByVendor([{ provider: 'gw', id: 'claude-x' }], [
  { label: 'My Claude', patterns: ['claude'] },
])
assert.equal(custom.length, 1)
assert.equal(custom[0].label, 'My Claude')
assert.deepEqual(groupByVendor([]), [])

console.log('efforts + grouping: all assertions passed')
console.log('knowledge entries:', KNOWLEDGE_BASE.length, '· default rules:', DEFAULT_RULES.length)
