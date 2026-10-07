// Generator for lib/knowledge.js.
//
// The knowledge table ships inside dsh-better-reasoning-effort (MIT,
// © HaoyueQin) as a plain array literal in its bundled `lib/index.js`. Rather
// than hand-copying 65 entries (and drifting from upstream), this script
// extracts that literal verbatim and emits our own module, preserving the
// upstream field names so a future re-run stays a straight diff.
//
// Run: node scripts/generate-knowledge.mjs [path-to-upstream-lib/index.js]
//
// The generated file is committed: the plugin must load without the upstream
// package present.
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outFile = join(here, '..', 'lib', 'knowledge.js')

const candidates = [
  process.argv[2],
  join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'profiles', 'development', 'node_modules', 'dsh-better-reasoning-effort', 'lib', 'index.js'),
  join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'profiles', 'desktop', 'node_modules', 'dsh-better-reasoning-effort', 'lib', 'index.js'),
].filter((value) => typeof value === 'string')

const source = candidates.find((file) => {
  try { readFileSync(file); return true } catch { return false }
})
if (source === undefined) {
  console.error('upstream lib/index.js not found; pass the path as the first argument')
  process.exit(1)
}

const text = readFileSync(source, 'utf8')
const marker = 'var KNOWLEDGE_BASE = ['
const at = text.indexOf(marker)
if (at < 0) {
  console.error('KNOWLEDGE_BASE literal not found')
  process.exit(1)
}
const open = text.indexOf('[', at)

// Bracket-match the literal, skipping brackets inside strings and comments.
let depth = 0
let end = -1
let inString = false
let quote = ''
let inLineComment = false
let inBlockComment = false
for (let i = open; i < text.length; i += 1) {
  const ch = text[i]
  const next = text[i + 1]
  if (inLineComment) { if (ch === '\n') inLineComment = false; continue }
  if (inBlockComment) { if (ch === '*' && next === '/') { inBlockComment = false; i += 1 } continue }
  if (inString) {
    if (ch === '\\') { i += 1; continue }
    if (ch === quote) inString = false
    continue
  }
  if (ch === '/' && next === '/') { inLineComment = true; i += 1; continue }
  if (ch === '/' && next === '*') { inBlockComment = true; i += 1; continue }
  if (ch === '"' || ch === "'" || ch === '`') { inString = true; quote = ch; continue }
  if (ch === '[' || ch === '{') depth += 1
  else if (ch === ']' || ch === '}') {
    depth -= 1
    if (depth === 0) { end = i; break }
  }
}
if (end < 0) {
  console.error('unterminated literal')
  process.exit(1)
}

// eslint-disable-next-line no-eval -- local, trusted, read-only source
const table = eval(text.slice(open, end + 1))
if (!Array.isArray(table) || table.length === 0) {
  console.error('extracted table is empty')
  process.exit(1)
}

const banner = `// GENERATED FILE — do not edit by hand.
//
// Run \`node scripts/generate-knowledge.mjs\` to regenerate.
//
// Source: dsh-better-reasoning-effort (MIT, © HaoyueQin) — its \`KNOWLEDGE_BASE\`
// array, extracted verbatim so this plugin carries the full 65-entry table
// without depending on that package at runtime. Field names are upstream's:
//
//   patterns      id fragments matched on a boundary; longest hit wins
//   efforts       harness level -> the value sent on the wire, or \`false\`
//                 when the model exposes no reasoning control at all
//   defaultEffort the vendor's own default level, when it has one
//   compat        adapter compatibility flags written alongside a declaration
//   input         input modalities the model accepts
//   contextWindow / maxTokens   reference capacity (shown read-only)
//   note          the upstream editorial note, in Chinese
//
// Everything below this banner is upstream data; the surrounding logic lives in
// efforts.js.

`

writeFileSync(outFile, banner + 'export const KNOWLEDGE_BASE = ' + JSON.stringify(table, null, 2) + '\n', 'utf8')

// Calibration summary: the models this deployment actually uses, so the tests
// can assert against upstream reality instead of guesses.
const probe = ['deepseek-flash', 'deepseek-v4-pro', 'claude-opus-5', 'claude-sonnet-5', 'gpt-6.1-sol', 'glm-5.3-flashx', 'mimo-v2-6', 'kimi-k3']
console.log('wrote', outFile)
console.log('entries:', table.length)
console.log('efforts:false entries:', table.filter((entry) => entry.efforts === false).length)
console.log('with compat:', table.filter((entry) => entry.compat !== undefined).length)
console.log('--- pattern probe (first boundary hit per id, longest wins is done in efforts.js) ---')
for (const id of probe) {
  const hits = table.filter((entry) => entry.patterns.some((pattern) => id.toLowerCase().includes(pattern.toLowerCase())))
  const best = hits.sort((a, b) => Math.max(...b.patterns.map((p) => p.length)) - Math.max(...a.patterns.map((p) => p.length)))[0]
  console.log(
    id.padEnd(20),
    best === undefined
      ? '(no hit — falls back to inference)'
      : `${best.id}  efforts=${best.efforts === false ? 'false' : JSON.stringify(best.efforts)}  default=${best.defaultEffort ?? '-'}  compat=${best.compat === undefined ? '-' : JSON.stringify(best.compat)}`,
  )
}
