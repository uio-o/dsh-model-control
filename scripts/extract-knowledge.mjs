// Read-only extractor for the upstream knowledge base (dsh-better-reasoning-effort, MIT).
//
// The upstream package ships its knowledge table as a plain array literal inside
// the bundled `lib/index.js`. This script locates that literal by bracket
// matching, evaluates it, and reports its shape. It writes nothing — the
// generator that emits our own `lib/knowledge.js` is a later step.
//
// Usage: node scripts/extract-knowledge.mjs [path-to-upstream-lib/index.js]
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

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
console.log('source:', source)

const text = readFileSync(source, 'utf8')
const marker = 'var KNOWLEDGE_BASE = ['
const at = text.indexOf(marker)
if (at < 0) {
  console.error('KNOWLEDGE_BASE literal not found')
  process.exit(1)
}
const open = text.indexOf('[', at)

// Bracket-match the literal, ignoring brackets inside string literals and
// comments (the upstream table carries `//` notes that mention parentheses and
// brackets, which would otherwise unbalance the scan).
let depth = 0
let end = -1
let inString = false
let quote = ''
let inLineComment = false
let inBlockComment = false
for (let i = open; i < text.length; i += 1) {
  const ch = text[i]
  const next = text[i + 1]
  if (inLineComment) {
    if (ch === '\n') inLineComment = false
    continue
  }
  if (inBlockComment) {
    if (ch === '*' && next === '/') { inBlockComment = false; i += 1 }
    continue
  }
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

const literal = text.slice(open, end + 1)
// eslint-disable-next-line no-eval -- local, trusted, read-only inspection
const table = eval(literal)

console.log('entries:', table.length)
console.log('entries with efforts:false:', table.filter((entry) => entry.efforts === false).length)
console.log('entries with defaultEffort:', table.filter((entry) => entry.defaultEffort !== undefined).length)
console.log('fields present:', [...new Set(table.flatMap((entry) => Object.keys(entry)))].join(', '))
console.log('ids:', table.map((entry) => entry.id).join(', '))
