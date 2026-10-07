// Zero-conflict parse check for the client half: re-assembles the exact
// module-loader call shape the harness uses and evaluates the factory body
// with a stubbed loader (no React, no DOM — factory body must at minimum parse
// and register). Exits non-zero on any syntax error.
import { readFile } from 'node:fs/promises'

const src = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

let registered = null
const fakeWindow = {
  __ModuleLoader__: {
    load(def) { registered = def },
  },
}

// Evaluate as a script — the file is a plain `window.__ModuleLoader__.load(...)` call.
new Function('window', src)(fakeWindow)

if (registered === null) throw new Error('factory did not register')
if (registered.id !== 'dsh-model-control') throw new Error('wrong id: ' + registered.id)

// Invoke the factory with a `require` stub; module top-level requires react.
// React is absent in this sandbox, so require throws — that is expected and
// proves the factory body itself parsed and executed up to the first require.
let requireError = null
try {
  registered.factory(() => { throw new Error('no react in sandbox') })
} catch (error) {
  requireError = error
}
if (requireError === null || !String(requireError.message).includes('no react')) {
  throw new Error('unexpected factory behaviour: ' + requireError)
}

// ── Static guard: every `setXxx(...)` must come from a `useState` ──
// A setter that is CALLED but never DECLARED throws `setXxx is not defined`
// inside the component, which the settings section's error boundary turns into
// a blank page. That is exactly how the built-in-channel editor broke once, and
// the failure mode is silent until a user clicks the button, so it is checked
// here rather than left to manual testing.
const declared = new Set()
// From a hook pair: `const [x, setX] = useState(...)`.
for (const match of src.matchAll(/const\s*\[\s*\w+\s*,\s*(set[A-Z]\w*)\s*\]\s*=\s*useState/g)) {
  declared.add(match[1])
}
// From a plain local helper: `const setX = ...` or `function setX(`. These share
// the naming convention but are ordinary functions, not state setters.
for (const match of src.matchAll(/\b(?:const|let|var)\s+(set[A-Z]\w*)\s*=/g)) declared.add(match[1])
for (const match of src.matchAll(/\bfunction\s+(set[A-Z]\w*)\s*\(/g)) declared.add(match[1])
// Setters that come from somewhere other than this file.
const external = new Set(['setTimeout', 'setInterval', 'setImmediate'])

const used = new Set()
// A BARE call only: `localStorage.setItem(...)` is a method, not a setter.
for (const match of src.matchAll(/(?<![.\w$])(set[A-Z]\w*)\s*\(/g)) used.add(match[1])

const missing = [...used].filter((name) => !declared.has(name) && !external.has(name))
if (missing.length > 0) {
  throw new Error('client.js calls undeclared state setters: ' + missing.sort().join(', '))
}

console.log('client.js OK: registered as', registered.id, '· factory parses and runs to first require')
console.log('client.js state: ' + used.size + ' setters called, all resolve to a declaration')

// ── Static guard: every t('key') / tf('key', ...) must exist in BOTH locales ──
// `t()` falls back to the English table and then to `undefined`, which React
// renders as nothing: a missing key is a silently blank label, not an error.
const locales = {}
for (const locale of ['zh', 'en']) {
  const start = src.indexOf('\n    ' + locale + ': {')
  if (start === -1) throw new Error('locale block not found: ' + locale)
  const open = src.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') {
      depth -= 1
      if (depth === 0) { end = i; break }
    }
  }
  const body = src.slice(open + 1, end)
  locales[locale] = new Set([...body.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((m) => m[1]))
}

const referenced = new Set()
for (const match of src.matchAll(/\btf?\('([A-Za-z_$][\w$]*)'/g)) referenced.add(match[1])

const gaps = []
for (const key of referenced) {
  const missingIn = ['zh', 'en'].filter((locale) => !locales[locale].has(key))
  if (missingIn.length > 0) gaps.push(key + ' (missing in ' + missingIn.join(', ') + ')')
}
if (gaps.length > 0) {
  throw new Error('client.js references undefined i18n keys: ' + gaps.sort().join('; '))
}
console.log('client.js i18n: ' + referenced.size + ' keys referenced, all present in zh + en')
