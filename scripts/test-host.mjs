// Isolated host-half end-to-end test (zero-conflict: no running harness).
//
// Applies the host plugin against a stubbed cordis context, drives every
// loopback route with fake request/response objects, and asserts that the
// sidecar document is really written to disk. It also reproduces the
// disable/re-enable cycle: if route registrations do not return disposers, the
// second apply() collides on the same exact paths — the regression that broke
// a live reload before this test existed.
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'model-control-host-'))
// A stand-in profile patch layer. Deliberately hand-written with comments and
// an unrelated row, because the takeover edit must survive both.
const patchPath = join(home, 'cordis.patch.yml')
writeFileSync(patchPath, [
  '# Your patch layer for this dsh profile, applied after every bundle layer:',
  '- id: desktop-shell',
  '  name: dsh-plugin-desktop',
  '- id: dsh-model-control',
  '  name: dsh-model-control',
  '',
].join('\n'), 'utf8')
process.env.DSH_HOME = home

const { apply } = await import('../lib/host.js')
const { statePath, writeState } = await import('../lib/store.js')

// Turn the autofill pass off for the route tests: they drive the declaration
// routes explicitly, and a background writer would move the document's
// revision under them. Autofill itself is asserted at the end.
writeState(home, { defaults: {}, grouping: null, declarations: {}, autofill: false })

/** A stubbed cordis context that records routes and honours disposers. */
function makeCtx() {
  const routes = new Map()
  const disposers = []

  // A mutable stand-in for the `llm-pi-ai` settings document. `mutate` applies
  // path ops, so the selection round-trip is exercised for real.
  const document = {
    providers: {
      'my-self': {
        displayName: '自建网关',
        apiKeyEnv: 'MY_SELF_API_KEY',
        api: 'openai-completions',
        baseURL: 'https://api.example.test/v1',
        models: [
          {
            id: 'deepseek-flash',
            name: 'deepseek-flash',
            contextWindow: 1000000,
            reasoningEfforts: { low: 'low', high: 'high' },
          },
          { id: 'claude-opus-5', name: 'claude-opus-5', input: ['text', 'image'] },
        ],
      },
    },
  }
  let revision = 7

  // A built-in channel's own settings document (the shipped DeepSeek API-key
  // channel). It is NOT part of the pi-ai document, which is the whole point of
  // the /entry route.
  const builtinDocument = {
    baseURL: 'https://api.deepseek.com',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    // A shipped channel carries its own model list too; the ability route has to
    // find it by the namespace the directory names, not in the pi-ai document.
    models: [
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', input: ['text'], maxTokens: 64000 },
    ],
  }
  const storedSecrets = new Map()

  const applyOp = (op, target = document) => {
    if (op.op !== 'set' && op.op !== 'unset') return
    let cursor = target
    for (let i = 0; i < op.path.length - 1; i += 1) {
      const key = op.path[i]
      if (cursor[key] === null || typeof cursor[key] !== 'object') cursor[key] = {}
      cursor = cursor[key]
    }
    const last = op.path[op.path.length - 1]
    if (op.op === 'unset') delete cursor[last]
    else cursor[last] = op.value
  }

  const settings = {
    describe: () => [
      { ns: 'llm-pi-ai', value: document, revision, applies: 'live', autoGenerate: true, schema: {} },
      // A built-in channel's own settings entry, so the /entry route has a real
      // target to read and write.
      { ns: 'llm-deepseek', value: builtinDocument, revision, applies: 'live', autoGenerate: true, schema: {} },
    ],
    async mutate(ns, ops, expectedRevision) {
      if (expectedRevision !== undefined && expectedRevision !== revision) {
        throw new Error('settings revision conflict')
      }
      const target = ns === 'llm-deepseek' ? builtinDocument : document
      for (const op of ops) applyOp(op, target)
      revision += 1
    },
    // The profile patch layer the takeover switch edits. A real file in the
    // temp home, so the route's read/edit/backup path runs for real.
    async prepareDocument() { return patchPath },
  }

  const credentials = {
    async resolve(name) {
      if (storedSecrets.has(name)) return { value: storedSecrets.get(name), source: 'store' }
      return name === 'MY_SELF_API_KEY' ? { value: 'test-key', source: 'env' } : undefined
    },
    async describe(name) {
      if (storedSecrets.has(name)) return { configured: true, source: 'store', writable: true }
      return { configured: name === 'MY_SELF_API_KEY', source: 'env', writable: true }
    },
    // The write path the official page uses for keys. Recorded so a test can
    // assert a typed key really reached the credential store.
    async set(name, value) {
      if (typeof value !== 'string' || value === '') throw new Error('empty credential')
      storedSecrets.set(name, value)
    },
    async unset(name) { storedSecrets.delete(name) },
  }

  const webServer = {
    register(route) {
      if (routes.has(route.path)) throw new Error(`webserver: duplicate exact route "${route.path}"`)
      routes.set(route.path, route.handler)
      const dispose = () => { routes.delete(route.path) }
      return dispose
    },
  }
  const ctx = {
    llm: {
      listProviders: () => [
        { id: 'my-self' },
        // A built-in channel. Note it does NOT carry `settingsNs`: the real
        // service keeps that in the configurable-provider directory below, which
        // is exactly the mistake this stub now guards against.
        { id: 'deepseek-official', name: 'DeepSeek Account' },
        // A built-in channel with no directory entry at all: the page must say
        // so instead of offering a dead button.
        { id: 'deepseek-nsless', name: 'No Namespace' },
      ],
      // The directory that actually declares `settingsNs` and `settingsPath`.
      listConfigurableProviders: () => [
        { provider: 'deepseek-official', displayName: 'DeepSeek', settingsNs: 'llm-deepseek', settingsPath: [] },
      ],
      listModels: async (provider) => (provider === 'my-self'
        ? [{ id: 'deepseek-flash', name: 'DeepSeek Flash' }, { id: 'claude-opus-5', name: 'Claude Opus 5' }]
        : [{ id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' }]),
      // The SERVICE method — not the adapter's `resolveModel`. The old code
      // called the adapter name here and lost every context window.
      resolveModelInfo: async (_provider, id) => ({
        inputModalities: id.startsWith('claude') ? ['text', 'image'] : ['text'],
        context: { contextWindow: 1048576 },
        ...(id === 'deepseek-flash'
          ? { reasoning: { efforts: [{ id: 'high', name: 'High' }], defaultEffort: 'high' } }
          : {}),
      }),
      async discoverModels(ns, request) {
        assert.equal(ns, 'llm-pi-ai', 'discovery is asked of the pi-ai namespace')
        // A draft channel that is NOT in the document must still be probeable:
        // that is what lets the wizard test and fetch before it creates.
        if (request.provider === 'stepfun') {
          assert.equal(request.baseURL, 'https://api.stepfun.com/step_plan/v1')
          assert.equal(request.apiKey, 'sk-draft', 'the unsaved key is used as typed')
          return [
            { id: 'step-3', name: 'Step 3', contextWindow: 32000 },
            { id: 'step-2-mini', name: 'Step 2 mini', contextWindow: 16000 },
          ]
        }
        assert.equal(request.provider, 'my-self')
        assert.equal(request.apiKey, 'test-key', 'the endpoint key is resolved from the credential ref')
        return [
          { id: 'deepseek-flash', name: 'deepseek-flash', contextWindow: 1000000, inputModalities: ['text', 'image'] },
          { id: 'claude-opus-5', name: 'claude-opus-5', contextWindow: 1000000 },
          { id: 'brand-new-model', name: 'brand-new-model', contextWindow: 200000, maxTokens: 64000 },
        ]
      },
    },
    settings,
    get(name) { return name === 'credentials' ? credentials : undefined },
    inject(_names, callback) { callback({ webServer }) },
    effect(factory) { const dispose = factory(); disposers.push(dispose); return dispose },
    _routes: routes,
    _document: document,
    _builtin: builtinDocument,
    _storedSecrets: storedSecrets,
    _disposeAll() { for (const dispose of disposers.splice(0)) if (typeof dispose === 'function') dispose() },
  }
  return ctx
}

/** Minimal Express-like response recorder that resolves when the body lands. */
function makeRes() {
  let settle
  const done = new Promise((resolve) => { settle = resolve })
  return {
    statusCode: 0,
    headers: {},
    body: '',
    done,
    setHeader(name, value) { this.headers[name] = value },
    end(chunk) { this.body = chunk ?? ''; settle() },
  }
}

/** Minimal request: a readable stream with a method and url. */
function makeReq(method, url, body) {
  const listeners = { data: [], end: [] }
  const req = {
    method,
    url,
    on(event, handler) { (listeners[event] ??= []).push(handler); return req },
  }
  queueMicrotask(() => {
    if (body !== undefined) for (const handler of listeners.data) handler(body)
    for (const handler of listeners.end) handler()
  })
  return req
}

const get = async (ctx, path, query = '') => {
  const res = makeRes()
  await ctx._routes.get(path)(makeReq('GET', path + query), res)
  await res.done
  return { status: res.statusCode, json: JSON.parse(res.body) }
}

const post = async (ctx, path, payload) => {
  const res = makeRes()
  await ctx._routes.get(path)(makeReq('POST', path, JSON.stringify(payload)), res)
  await res.done
  return { status: res.statusCode, json: JSON.parse(res.body) }
}

const ctx = makeCtx()
apply(ctx)

// ── 1. Every route registered ──
assert.deepEqual([...ctx._routes.keys()].sort(), [
  '/api/model-control/ability',
  '/api/model-control/advise',
  '/api/model-control/available',
  '/api/model-control/declare',
  '/api/model-control/defaults',
  '/api/model-control/effort',
  '/api/model-control/entry',
  '/api/model-control/grouping',
  '/api/model-control/hidden',
  '/api/model-control/models',
  '/api/model-control/probe',
  '/api/model-control/provider',
  '/api/model-control/providers',
  '/api/model-control/selection',
  '/api/model-control/status',
  '/api/model-control/takeover',
  '/api/model-control/undeclare',
].sort())

// ── 2. /models: vendor, suggested default, context window, live reasoning ──
const models = await get(ctx, '/api/model-control/models')
assert.equal(models.status, 200)
assert.equal(models.json.ok, true)
// 2 from the configured channel + 1 per built-in provider (the stub gives every
// non-`my-self` provider the same single model).
assert.equal(models.json.models.length, 4)
const flash = models.json.models.find((row) => row.id === 'deepseek-flash')
assert.equal(flash.vendor, 'deepseek')
assert.equal(flash.suggestedDefault, 'high')
assert.equal(flash.contextWindow, 1048576, 'resolveModelInfo is the service method that carries the window')
assert.equal(flash.reasoning.defaultEffort, 'high', 'the live declaration is republished to the client')
const claude = models.json.models.find((row) => row.id === 'claude-opus-5')
assert.equal(claude.vendor, 'anthropic')
assert.equal(claude.reasoning, undefined, 'an undeclared model carries no reasoning block')

// ── 3. /advise ──
const advice = await get(ctx, '/api/model-control/advise', '?model=deepseek-flash')
assert.equal(advice.json.advice.matched, true)
assert.equal(advice.json.advice.confidence, 'high')
const missing = await get(ctx, '/api/model-control/advise')
assert.equal(missing.status, 400)

// ── 4. /defaults: write, persist to disk, read back ──
const before = await get(ctx, '/api/model-control/defaults')
assert.deepEqual(before.json.defaults, {}, 'no default has been written yet')
// The sidecar itself already exists: this test disables autofill by writing it
// before apply(). The interesting claim is that the defaults map is empty.
assert.equal(existsSync(statePath(home)), true, 'the autofill-off setup wrote the sidecar')

const written = await post(ctx, '/api/model-control/defaults', {
  provider: 'my-self', model: 'deepseek-flash', effort: 'max',
})
assert.equal(written.status, 200)
assert.equal(written.json.persisted, true, 'host reports a real disk write')
assert.equal(written.json.defaults['my-self/deepseek-flash'], 'max')

assert.equal(existsSync(statePath(home)), true, 'sidecar document exists on disk')
const onDisk = JSON.parse(readFileSync(statePath(home), 'utf8'))
assert.equal(onDisk.defaults['my-self/deepseek-flash'], 'max', 'value reached the disk')

const reread = await get(ctx, '/api/model-control/defaults')
assert.equal(reread.json.defaults['my-self/deepseek-flash'], 'max')

const cleared = await post(ctx, '/api/model-control/defaults', {
  provider: 'my-self', model: 'deepseek-flash', effort: null,
})
assert.deepEqual(cleared.json.defaults, {})

const bad = await post(ctx, '/api/model-control/defaults', { provider: 'my-self' })
assert.equal(bad.status, 400)
const badType = await post(ctx, '/api/model-control/defaults', {
  provider: 'my-self', model: 'deepseek-flash', effort: 42,
})
assert.equal(badType.status, 400)

// ── 5. /grouping: defaults, custom, reset ──
const defaults = await get(ctx, '/api/model-control/grouping')
assert.equal(defaults.json.custom, false)
assert.equal(defaults.json.rules.length, 12)

const custom = await post(ctx, '/api/model-control/grouping', {
  rules: [{ label: 'My Claude', patterns: ['claude'] }, { label: 'My DeepSeek', patterns: ['deepseek'] }],
})
assert.equal(custom.json.custom, true)
assert.equal(custom.json.rules.length, 2)
assert.equal(custom.json.persisted, true)

const reset = await post(ctx, '/api/model-control/grouping', { reset: true })
assert.equal(reset.json.custom, false)
assert.equal(reset.json.rules.length, 12)

// ── 6. /providers: configured channels and their selected models ──
const providers = await get(ctx, '/api/model-control/providers')
assert.equal(providers.status, 200)
// Two kinds share the list: channels declared in the document, and providers
// another plugin registered (the built-in routes). The adapter ones carry their
// models from the `llm` service instead of the document.
const configRows = providers.json.providers.filter((row) => row.kind === 'config')
const adapterRows = providers.json.providers.filter((row) => row.kind === 'adapter')
assert.equal(configRows.length, 1)
assert.ok(adapterRows.length >= 1, 'built-in channels are listed beside the configured ones')
const channel = configRows[0]
assert.equal(channel.id, 'my-self')
assert.equal(channel.displayName, '自建网关')
assert.equal(channel.baseURL, 'https://api.example.test/v1')
assert.equal(channel.api, 'openai-completions')
assert.equal(channel.modelCount, 2)
assert.equal(channel.credential.configured, true, 'credential presence is reported without the value')
assert.equal(JSON.stringify(providers.json).includes('test-key'), false, 'the key value never leaves the host')

// ── 7. /available: what the endpoint advertises, plus what is selected ──
const available = await get(ctx, '/api/model-control/available', '?provider=my-self')
assert.equal(available.status, 200)
assert.equal(available.json.available.length, 3)
assert.deepEqual(available.json.selected, ['deepseek-flash', 'claude-opus-5'])
assert.equal(available.json.available[2].id, 'brand-new-model')
assert.equal(available.json.available[2].maxTokens, 64000)

const noProvider = await get(ctx, '/api/model-control/available')
assert.equal(noProvider.status, 400)
const unknownProvider = await get(ctx, '/api/model-control/available', '?provider=nope')
assert.equal(unknownProvider.status, 404)

// ── 8. /selection: additive model selection writes the models array ──
const selected = await post(ctx, '/api/model-control/selection', {
  provider: 'my-self',
  ids: ['deepseek-flash', 'brand-new-model'],
  available: available.json.available,
})
assert.equal(selected.status, 200)
assert.equal(selected.json.ok, true)
assert.deepEqual(selected.json.diff, {
  added: ['brand-new-model'],
  removed: ['claude-opus-5'],
  kept: ['deepseek-flash'],
})
assert.equal(selected.json.models.length, 2)

const kept = selected.json.models.find((model) => model.id === 'deepseek-flash')
assert.deepEqual(
  kept.reasoningEfforts,
  { low: 'low', high: 'high' },
  'a kept model is preserved verbatim — hand-edited declarations survive a selection change',
)
const added = selected.json.models.find((model) => model.id === 'brand-new-model')
assert.equal(added.contextWindow, 200000, 'a newly selected model carries the discovered metadata')
assert.equal(added.maxTokens, 64000)

// The write really landed in the document.
assert.deepEqual(
  ctx._document.providers['my-self'].models.map((model) => model.id),
  ['deepseek-flash', 'brand-new-model'],
)
// And it is visible to the next /providers read.
const afterSelection = await get(ctx, '/api/model-control/providers')
assert.equal(afterSelection.json.providers[0].modelCount, 2)

// Selecting nothing empties the channel's model list (the "not in this app"
// state) without touching the channel itself.
const emptied = await post(ctx, '/api/model-control/selection', {
  provider: 'my-self', ids: [], available: available.json.available,
})
assert.equal(emptied.json.models.length, 0)
assert.equal(ctx._document.providers['my-self'].baseURL, 'https://api.example.test/v1', 'the channel survives')

// Bad input is rejected, not thrown.
const badSelection = await post(ctx, '/api/model-control/selection', { provider: 'my-self' })
assert.equal(badSelection.status, 400)
const unknownSelection = await post(ctx, '/api/model-control/selection', { provider: 'nope', ids: [] })
assert.equal(unknownSelection.status, 404)
const wrongMethod = await get(ctx, '/api/model-control/selection')
assert.equal(wrongMethod.status, 405)

// ── 9. /declare and /undeclare: the effort ladder reaches the config ──
// Re-select the original pair so the declaration targets exist again.
await post(ctx, '/api/model-control/selection', {
  provider: 'my-self', ids: ['deepseek-flash', 'claude-opus-5'], available: available.json.available,
})
const modelEntry = (id) => ctx._document.providers['my-self'].models.find((model) => model.id === id)

// An undeclared model gains the full declaration from the knowledge base.
const declared = await post(ctx, '/api/model-control/declare', { provider: 'my-self', model: 'claude-opus-5' })
assert.equal(declared.status, 200)
assert.equal(declared.json.ok, true)
assert.equal(declared.json.confidence, 'high')
assert.ok(declared.json.applied.includes('reasoningEfforts'))
assert.deepEqual(
  modelEntry('claude-opus-5').reasoningEfforts,
  { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
  'the written ladder is the validated one',
)
assert.deepEqual(modelEntry('claude-opus-5').compat, { supportsReasoningEffort: true })

// Declaring the same model again is a no-op: every owned field is now present,
// so a re-run must not touch the user's (or our own) existing declaration.
const skipped = await post(ctx, '/api/model-control/declare', { provider: 'my-self', model: 'claude-opus-5' })
assert.deepEqual(skipped.json.applied, [], 'nothing is rewritten')
assert.ok(skipped.json.skipped.includes('reasoningEfforts-already-declared'))
assert.ok(skipped.json.skipped.includes('compat-already-declared'))

// A second, undeclared model gets its own declaration.
const declaredSecond = await post(ctx, '/api/model-control/declare', { provider: 'my-self', model: 'deepseek-flash' })
assert.ok(declaredSecond.json.applied.includes('reasoningEfforts'))

// force refreshes it over the existing value.
const forced = await post(ctx, '/api/model-control/declare', {
  provider: 'my-self', model: 'deepseek-flash', force: true,
})
assert.ok(forced.json.applied.includes('reasoningEfforts'))
assert.deepEqual(modelEntry('deepseek-flash').reasoningEfforts, { off: 'none', low: 'low', high: 'high', max: 'max' })
assert.equal(modelEntry('deepseek-flash').compat.thinkingFormat, 'deepseek')

// Unknown targets and methods are refused, not thrown.
const unknownModel = await post(ctx, '/api/model-control/declare', { provider: 'my-self', model: 'nope' })
assert.equal(unknownModel.status, 404)
const unknownProviderDeclare = await post(ctx, '/api/model-control/declare', { provider: 'nope' })
assert.equal(unknownProviderDeclare.status, 404)
const declareWrongMethod = await get(ctx, '/api/model-control/declare')
assert.equal(declareWrongMethod.status, 405)

// Undo restores exactly the pre-declaration state: the fields this plugin
// added are removed, and nothing else on the entry is disturbed.
const beforeUndo = modelEntry('claude-opus-5')
assert.equal(beforeUndo.reasoningEfforts !== undefined, true)
const undone = await post(ctx, '/api/model-control/undeclare', { provider: 'my-self', model: 'claude-opus-5' })
assert.equal(undone.status, 200)
assert.ok(undone.json.restored > 0)
const afterUndo = modelEntry('claude-opus-5')
assert.equal(afterUndo.reasoningEfforts, undefined, 'the added ladder is gone')
assert.equal(afterUndo.compat, undefined)
assert.equal(afterUndo.name, 'claude-opus-5', 'the rest of the entry is untouched')

// Undeclaring twice finds no backup left.
const undoneAgain = await post(ctx, '/api/model-control/undeclare', { provider: 'my-self', model: 'claude-opus-5' })
assert.equal(undoneAgain.status, 404)

// ── 10. Regression: disable then re-enable must not collide ──
ctx._disposeAll()
assert.equal(ctx._routes.size, 0, 'disabling the plugin released every route')

const ctx2 = makeCtx()
apply(ctx2)
assert.equal(ctx2._routes.size, 17, 're-enabling registers the routes again without a duplicate error')
ctx2._disposeAll()
assert.equal(ctx2._routes.size, 0)

// ── 11. Autofill: with the flag on, a fresh load declares the undeclared ──
// (The route tests ran with it off; this proves the boot pass itself works.)
const ctx3 = makeCtx()
writeState(home, { defaults: {}, grouping: null, declarations: {}, autofill: true })
apply(ctx3)
await new Promise((resolve) => { setTimeout(resolve, 60) })
assert.deepEqual(
  ctx3._document.providers['my-self'].models.find((model) => model.id === 'claude-opus-5').reasoningEfforts,
  { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
  'the boot pass declares a model that had none',
)
assert.deepEqual(
  ctx3._document.providers['my-self'].models.find((model) => model.id === 'deepseek-flash').reasoningEfforts,
  { low: 'low', high: 'high' },
  'the boot pass leaves an existing declaration alone',
)
ctx3._disposeAll()

// ── 12. Channel management: create, edit, hide, delete ──
// Autofill goes back off: it would otherwise write declarations into this
// document while the assertions below are reading it.
writeState(home, { defaults: {}, grouping: null, declarations: {}, autofill: false, takeover: true })
const ctx4 = makeCtx()
apply(ctx4)

// pi-ai refuses a provider that resolves no models, so creating one with an
// empty model list is refused HERE, with an actionable code, instead of being
// written and then failing the whole document at load time.
const emptyCreate = await post(ctx4, '/api/model-control/provider', {
  action: 'add', id: 'shell-only', displayName: 'Shell', api: 'openai-completions',
  baseURL: 'https://shell.example.test/v1',
})
assert.equal(emptyCreate.status, 400)
assert.equal(emptyCreate.json.code, 'MODELS_REQUIRED', 'a machine-readable reason, not just prose')
assert.equal(ctx4._document.providers['shell-only'], undefined, 'nothing was written')

// A draft can be probed without being created: the wizard tests connectivity
// before it writes anything.
const probed = await post(ctx4, '/api/model-control/probe', {
  draft: { id: 'stepfun', baseURL: 'https://api.stepfun.com/step_plan/v1', api: 'openai-completions', apiKey: 'sk-draft' },
})
assert.equal(probed.status, 200)
assert.equal(probed.json.reachable, true)
assert.equal(probed.json.modelCount, 2, 'the endpoint advertises two models')
assert.equal(ctx4._document.providers['stepfun'], undefined, 'probing created nothing')

// And its model list can be fetched before it exists, which is what makes
// "pick models first, then create" possible.
const draftModels = await post(ctx4, '/api/model-control/available', {
  draft: { id: 'stepfun', baseURL: 'https://api.stepfun.com/step_plan/v1', api: 'openai-completions', apiKey: 'sk-draft' },
})
assert.equal(draftModels.status, 200)
assert.ok(Array.isArray(draftModels.json.available) && draftModels.json.available.length === 2)
assert.equal(ctx4._document.providers['stepfun'], undefined, 'fetching for a draft created nothing')

// Creating WITH models — the only form pi-ai accepts for a custom route.
const created = await post(ctx4, '/api/model-control/provider', {
  action: 'add', id: 'second-gw', displayName: '第二个网关', api: 'openai-completions',
  baseURL: 'https://second.example.test/v1', apiKeyEnv: 'SECOND_API_KEY',
  models: [{ id: 'm-one' }, { id: 'm-two', name: 'M Two' }, { name: 'no id — dropped' }, null],
})
assert.equal(created.status, 200)
assert.equal(ctx4._document.providers['second-gw'].baseURL, 'https://second.example.test/v1')
assert.deepEqual(ctx4._document.providers['second-gw'].models.map((m) => m.id), ['m-one', 'm-two'],
  'only entries with a usable id are kept')

// Adding the same id twice is refused rather than clobbering it.
const duplicate = await post(ctx4, '/api/model-control/provider', { action: 'add', id: 'second-gw' })
assert.equal(duplicate.status, 409)

// Editing only touches the named fields.
const edited = await post(ctx4, '/api/model-control/provider', {
  action: 'update', id: 'my-self', displayName: '改名了',
})
assert.equal(edited.status, 200)
assert.equal(ctx4._document.providers['my-self'].displayName, '改名了')
assert.equal(ctx4._document.providers['my-self'].apiKeyEnv, 'MY_SELF_API_KEY', 'the key reference survives an edit')

const editMissing = await post(ctx4, '/api/model-control/provider', { action: 'update', id: 'nope', displayName: 'x' })
assert.equal(editMissing.status, 404)

// Hidden is presentation-only: config and models are untouched.
const hiddenOn = await post(ctx4, '/api/model-control/hidden', { provider: 'my-self', hidden: true })
assert.equal(hiddenOn.status, 200)
assert.deepEqual(hiddenOn.json.hidden, ['my-self'])
assert.equal(ctx4._document.providers['my-self'].baseURL, 'https://api.example.test/v1', 'hiding keeps the config')
const listing = await get(ctx4, '/api/model-control/providers')
assert.equal(listing.json.providers.find((row) => row.id === 'my-self').hidden, true)
assert.equal(listing.json.takeover, true, 'takeover defaults on')
const facts = await get(ctx4, '/api/model-control/models')
assert.deepEqual(facts.json.hiddenProviders, ['my-self'], 'the picker learns which channels to drop')
const hiddenOff = await post(ctx4, '/api/model-control/hidden', { provider: 'my-self', hidden: false })
assert.deepEqual(hiddenOff.json.hidden, [])

// Takeover IS the layer stack: no profile row means the bundle default
// (official page disabled) is in force.
const takeoverOn = await get(ctx4, '/api/model-control/takeover')
assert.equal(takeoverOn.json.enabled, true, 'takeover defaults on: no profile override')
assert.equal(takeoverOn.json.path, patchPath)

// Turning it off pins the shipped entry back on in the PROFILE layer, which is
// applied after every bundle layer, and leaves the rest of the file alone.
const takeoff = await post(ctx4, '/api/model-control/takeover', { enabled: false })
assert.equal(takeoff.json.enabled, false)
assert.equal(takeoff.json.restart, true, 'the layer stack is read at load, so a restart is needed')
assert.equal(takeoff.json.changed, true)
const afterTakeoff = readFileSync(patchPath, 'utf8')
assert.ok(afterTakeoff.includes('- id: ui-settings-models'), 'the override row was added')
assert.ok(afterTakeoff.includes('disabled: false'), 'the shipped page is pinned back on')
assert.ok(afterTakeoff.includes('- id: desktop-shell'), 'an unrelated row survives')
assert.ok(afterTakeoff.startsWith('# Your patch layer'), 'the preamble survives')
assert.equal((await get(ctx4, '/api/model-control/takeover')).json.enabled, false, 'the read reflects the row')

// Turning it back on removes the override, handing control back to the bundle.
const takeoverBack = await post(ctx4, '/api/model-control/takeover', { enabled: true })
assert.equal(takeoverBack.json.enabled, true)
assert.equal(takeoverBack.json.changed, true)
const afterBack = readFileSync(patchPath, 'utf8')
assert.equal(afterBack.includes('ui-settings-models'), false, 'the override row is gone')
assert.equal((await get(ctx4, '/api/model-control/takeover')).json.enabled, true)

// A second identical write is a no-op, and bad input is refused.
assert.equal((await post(ctx4, '/api/model-control/takeover', { enabled: true })).json.changed, false)
const badTakeover = await post(ctx4, '/api/model-control/takeover', { enabled: 'yes' })
assert.equal(badTakeover.status, 400)

// Deleting a channel drops it (and its hidden flag) without touching the rest.
await post(ctx4, '/api/model-control/hidden', { provider: 'second-gw', hidden: true })
const removed = await post(ctx4, '/api/model-control/provider', { action: 'remove', id: 'second-gw' })
assert.equal(removed.status, 200)
assert.equal(ctx4._document.providers['second-gw'], undefined)
const afterRemove = await get(ctx4, '/api/model-control/providers')
assert.deepEqual(afterRemove.json.hidden, [], 'the hidden flag goes with the channel')
assert.ok(ctx4._document.providers['my-self'] !== undefined, 'other channels are untouched')

// ── 13. Effort page: declared vs suggested, and an explicit write ──
const effort = await get(ctx4, '/api/model-control/effort', '?provider=my-self')
assert.equal(effort.status, 200)
// The page always renders the full ladder, so a model whose advice skips a
// level (xhigh here) still gets a box for it.
assert.deepEqual(effort.json.levels, ['low', 'medium', 'high', 'xhigh', 'max'])
const effortFlash = effort.json.models.find((row) => row.id === 'deepseek-flash')
assert.deepEqual(effortFlash.declared, { low: 'low', high: 'high' }, 'the current declaration is reported')
assert.equal(effortFlash.suggested.matched, true)
const effortOpus = effort.json.models.find((row) => row.id === 'claude-opus-5')
assert.equal(effortOpus.declared, undefined, 'an undeclared model reports nothing declared')
assert.deepEqual(effortOpus.suggested.wire, { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' })
// 自适应: the knowledge base marks this generation adaptive, and the model does
// not declare it yet, so the box starts ticked from the suggestion.
assert.equal(effortOpus.suggestedAdaptive, true, 'the advice marks Claude 5 as adaptive')
assert.equal(effortOpus.declaredAdaptive, false, 'nothing is declared as adaptive yet')
assert.equal((await get(ctx4, '/api/model-control/effort')).status, 400)
assert.equal((await get(ctx4, '/api/model-control/effort', '?provider=nope')).status, 404)

// A channel with no models yet answers with an EMPTY list, not an error: the
// page renders its model area from this before the user fetches anything, so an
// empty channel has to be a normal answer.
// A channel can no longer be created empty (pi-ai refuses it), so the "empty
// channel" case is reached by writing the document directly — a hand-edited
// config or a migration could still produce one, and the page must render it
// rather than error.
ctx4._document.providers['empty-gw'] = {
  displayName: 'Empty', api: 'openai-completions', baseURL: 'https://empty.example.test/v1',
}
const emptyEffort = await get(ctx4, '/api/model-control/effort', '?provider=empty-gw')
assert.equal(emptyEffort.status, 200)
assert.deepEqual(emptyEffort.json.models, [], 'an empty channel lists no models, without erroring')

// The provider list carries each channel's models, so the sheet can render them
// without a network fetch — this is what the page relies on when it opens.
const withModels = await get(ctx4, '/api/model-control/providers')
const mySelfRow = withModels.json.providers.find((row) => row.id === 'my-self')
assert.ok(Array.isArray(mySelfRow.models) && mySelfRow.models.length >= 2,
  'a channel row carries its own models')
assert.ok(mySelfRow.models.every((model) => typeof model.id === 'string'))

// The page writes exactly the levels the user ticked.
const explicit = await post(ctx4, '/api/model-control/declare', {
  provider: 'my-self', model: 'claude-opus-5', ladder: { low: 'low', high: 'high' },
})
assert.equal(explicit.status, 200)
assert.deepEqual(ctx4._document.providers['my-self'].models.find((m) => m.id === 'claude-opus-5').reasoningEfforts,
  { low: 'low', high: 'high' }, 'the explicit ladder wins over the advice')

// "No levels" writes the literal false, which is what disables the control.
await post(ctx4, '/api/model-control/declare', { provider: 'my-self', model: 'claude-opus-5', ladder: false })
assert.equal(ctx4._document.providers['my-self'].models.find((m) => m.id === 'claude-opus-5').reasoningEfforts, false)

// A ladder the adapter would reject is refused before anything is written.
const bogus = await post(ctx4, '/api/model-control/declare', {
  provider: 'my-self', model: 'deepseek-flash', ladder: { off: 'none' },
})
assert.deepEqual(ctx4._document.providers['my-self'].models.find((m) => m.id === 'deepseek-flash').reasoningEfforts,
  { low: 'low', high: 'high' }, 'an off-only ladder changes nothing')
assert.ok(bogus.json.skipped.includes('unwritable-ladder'))

// ── 14. A plaintext key typed on the page reaches the credential store ──
// The config keeps only the variable NAME, which is what the adapter reads.
const withKey = await post(ctx4, '/api/model-control/provider', {
  action: 'add', id: 'keyed-gw', displayName: 'Keyed', api: 'openai-completions',
  baseURL: 'https://keyed.example.test/v1', apiKey: 'sk-typed-by-the-user',
  models: [{ id: 'keyed-model' }],
})
assert.equal(withKey.status, 200)
assert.equal(withKey.json.keyStored, true)
assert.equal(withKey.json.provider.apiKeyEnv, 'KEYED_GW_API_KEY', 'the variable name is derived from the channel id')
assert.equal(ctx4._document.providers['keyed-gw'].apiKey, undefined, 'the secret never lands in the config')
assert.equal(ctx4._storedSecrets.get('KEYED_GW_API_KEY'), 'sk-typed-by-the-user', 'it reached the credential store')
const keyedList = await get(ctx4, '/api/model-control/providers')
assert.equal(keyedList.json.providers.find((row) => row.id === 'keyed-gw').credential.configured, true)

// A key may be replaced on its own, keeping the existing variable name.
const rotated = await post(ctx4, '/api/model-control/provider', {
  action: 'update', id: 'keyed-gw', apiKey: 'sk-rotated',
})
assert.equal(rotated.json.keyStored, true)
assert.equal(ctx4._storedSecrets.get('KEYED_GW_API_KEY'), 'sk-rotated')
assert.equal(ctx4._document.providers['keyed-gw'].apiKeyEnv, 'KEYED_GW_API_KEY', 'the name is unchanged')

// An update with no key typed must not touch the stored secret.
await post(ctx4, '/api/model-control/provider', { action: 'update', id: 'keyed-gw', displayName: 'Keyed 2' })
assert.equal(ctx4._storedSecrets.get('KEYED_GW_API_KEY'), 'sk-rotated', 'a plain edit leaves the key alone')

// ── 15. A BUILT-IN channel is editable through its own settings entry ──
const builtinBefore = await get(ctx4, '/api/model-control/providers')
const official = builtinBefore.json.providers.find((row) => row.id === 'deepseek-official')
assert.equal(official.kind, 'adapter')
assert.equal(official.editable.ns, 'llm-deepseek', 'its own namespace, not llm-pi-ai')
assert.equal(official.editable.available, true)
assert.equal(official.editable.baseURL, 'https://api.deepseek.com')
assert.equal(official.editable.apiKeyEnv, 'DEEPSEEK_API_KEY')

// A channel with no settings namespace reports itself as not editable, rather
// than offering a button that cannot work.
const nsless = builtinBefore.json.providers.find((row) => row.id === 'deepseek-nsless')
assert.equal(nsless.editable.available, false)

const editedOfficial = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-official',
  fields: { baseURL: 'https://api.deepseek.com/v1', reasoningEffort: 'high', thinking: 'enabled' },
})
assert.equal(editedOfficial.status, 200)
assert.equal(editedOfficial.json.ns, 'llm-deepseek')
assert.equal(ctx4._builtin.baseURL, 'https://api.deepseek.com/v1')
assert.equal(ctx4._builtin.reasoningEffort, 'high')
assert.equal(ctx4._builtin.thinking, 'enabled')
// The pi-ai document is untouched by an edit to a built-in channel.
assert.equal(ctx4._document.providers['my-self'].baseURL, 'https://api.example.test/v1')

// The official channel's key is stored under ITS reference, not a derived name.
const officialKey = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-official', fields: {}, apiKey: 'sk-deepseek-official',
})
assert.equal(officialKey.json.keyStored, true)
assert.equal(ctx4._storedSecrets.get('DEEPSEEK_API_KEY'), 'sk-deepseek-official')

// Values the owning schema would reject are refused before any write.
const badEffort = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-official', fields: { reasoningEffort: 'ultra' },
})
assert.equal(badEffort.status, 400)
assert.equal(ctx4._builtin.reasoningEffort, 'high', 'the refused value did not land')
const badThinking = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-official', fields: { thinking: 'maybe' },
})
assert.equal(badThinking.status, 400)

// `null` removes the key again, so a level written here is not a one-way door:
// the channel can be put back to its shipped default.
const clearedEntry = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-official', fields: { reasoningEffort: null, thinking: null },
})
assert.equal(clearedEntry.status, 200)
assert.equal(clearedEntry.json.changed, true)
assert.equal('reasoningEffort' in ctx4._builtin, false, 'the effort key was removed')
assert.equal('thinking' in ctx4._builtin, false, 'the thinking key was removed')
assert.equal(ctx4._builtin.baseURL, 'https://api.deepseek.com/v1', 'unrelated keys survive a clear')

// A clear of a key that was never set is still a successful, harmless write.
const clearedAgain = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-official', fields: { reasoningEffort: null },
})
assert.equal(clearedAgain.status, 200)

// An unknown provider, or one with no namespace, is refused — and the refusal
// lists the namespaces that DO exist, so the page can offer them.
const noNs = await post(ctx4, '/api/model-control/entry', { provider: 'deepseek-nsless', fields: { baseURL: 'x' } })
assert.equal(noNs.status, 404)
assert.deepEqual(noNs.json.namespaces, ['llm-pi-ai', 'llm-deepseek'])

// …but an explicit namespace from the page makes the same channel editable.
// This is the fallback for when the directory API answers nothing.
const manualNs = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-nsless', ns: 'llm-deepseek', fields: { baseURL: 'https://manual.example.test' },
})
assert.equal(manualNs.status, 200)
assert.equal(manualNs.json.ns, 'llm-deepseek')
assert.equal(ctx4._builtin.baseURL, 'https://manual.example.test')

// A namespace that does not exist is refused rather than creating one.
const bogusNs = await post(ctx4, '/api/model-control/entry', {
  provider: 'deepseek-nsless', ns: 'not-a-namespace', fields: { baseURL: 'x' },
})
assert.equal(bogusNs.status, 404)
// An unknown provider is refused too, and a GET is not a write.
assert.equal((await post(ctx4, '/api/model-control/entry', { provider: 'nope', fields: { baseURL: 'x' } })).status, 404)
assert.equal((await get(ctx4, '/api/model-control/entry')).status, 405)

// ─── Per-model capabilities ───
//
// pi-ai's chat-model entry holds exactly six fields, and only `input` (plus the
// two budgets) describes a capability. These tests pin that the write lands on
// the named model, keeps every sibling field, and refuses what the schema would
// reject at load time.

// Turn vision ON for a self-built model that did not declare it.
const visionOn = await post(ctx4, '/api/model-control/ability', {
  provider: 'my-self', model: 'deepseek-flash', input: ['text', 'image'],
})
assert.equal(visionOn.status, 200)
assert.equal(visionOn.json.ns, 'llm-pi-ai')
const flashModel = ctx4._document.providers['my-self'].models.find((model) => model.id === 'deepseek-flash')
assert.deepEqual(flashModel.input, ['text', 'image'], 'vision was turned on')
assert.deepEqual(flashModel.reasoningEfforts, { low: 'low', high: 'high' }, 'the declared ladder survived')
assert.equal(flashModel.contextWindow, 1000000, 'contextWindow survived')
assert.equal(flashModel.name, 'deepseek-flash', 'name survived')

// Turn it back off. `text` stays: an empty list is "undeclared" upstream, which
// would silently restore the catalog's answer instead of meaning "no images".
const visionOff = await post(ctx4, '/api/model-control/ability', {
  provider: 'my-self', model: 'deepseek-flash', input: ['text'],
})
assert.equal(visionOff.status, 200)
assert.deepEqual(flashModel.input, ['text'])
assert.deepEqual(flashModel.reasoningEfforts, { low: 'low', high: 'high' }, 'the ladder still survived')

// An empty list is refused rather than written as "accepts nothing".
const emptyInput = await post(ctx4, '/api/model-control/ability', {
  provider: 'my-self', model: 'deepseek-flash', input: [],
})
assert.equal(emptyInput.status, 400)
assert.deepEqual(flashModel.input, ['text'], 'the refused empty list did not land')

// A modality the schema does not know is refused.
const bogusModality = await post(ctx4, '/api/model-control/ability', {
  provider: 'my-self', model: 'deepseek-flash', input: ['text', 'audio'],
})
assert.equal(bogusModality.status, 400)

// Budgets are written as positive integers, and a bad one lands nothing.
const budgets = await post(ctx4, '/api/model-control/ability', {
  provider: 'my-self', model: 'deepseek-flash', contextWindow: 200000, maxTokens: 8192,
})
assert.equal(budgets.status, 200)
assert.equal(flashModel.contextWindow, 200000)
assert.equal(flashModel.maxTokens, 8192)
assert.deepEqual(flashModel.input, ['text'], 'a budget write leaves modalities alone')
const badBudget = await post(ctx4, '/api/model-control/ability', {
  provider: 'my-self', model: 'deepseek-flash', maxTokens: 0,
})
assert.equal(badBudget.status, 400)
assert.equal(flashModel.maxTokens, 8192, 'the refused budget did not land')

// A shipped channel's models are NOT in the pi-ai document; the route has to
// reach them through the channel's own namespace.
const builtinAbility = await post(ctx4, '/api/model-control/ability', {
  provider: 'deepseek-official', model: 'deepseek-v4-pro', input: ['text', 'image'],
})
assert.equal(builtinAbility.status, 200)
assert.equal(builtinAbility.json.ns, 'llm-deepseek', 'written to the channel, not to llm-pi-ai')
const builtinModel = ctx4._builtin.models.find((model) => model.id === 'deepseek-v4-pro')
assert.deepEqual(builtinModel.input, ['text', 'image'])
assert.equal(builtinModel.name, 'DeepSeek V4 Pro', 'the shipped name survived')
assert.equal(builtinModel.maxTokens, 64000, 'the shipped budget survived')

// An unknown model, and a missing one, are refused.
assert.equal((await post(ctx4, '/api/model-control/ability', { model: 'ghost' })).status, 404)
assert.equal((await post(ctx4, '/api/model-control/ability', { provider: 'my-self' })).status, 400)
assert.equal((await get(ctx4, '/api/model-control/ability')).status, 405)
// Naming no field at all changes nothing and says so.
const noop = await post(ctx4, '/api/model-control/ability', { provider: 'my-self', model: 'claude-opus-5' })
assert.equal(noop.status, 200)
assert.equal(noop.json.changed, false)

ctx4._disposeAll()

rmSync(home, { recursive: true, force: true })
console.log('host routes: all assertions passed (17 routes + selection + declare/undeclare + channels + create-with-models + probe + plaintext key + builtin channel + hidden + takeover + effort + ability + autofill + reload cycle)')
