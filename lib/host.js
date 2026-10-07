// Host half of dsh-model-control.
//
// Fork of dsh-model-picker's host (route republishing context windows and
// input modalities), extended with:
//   1. per-model effort advisory  — GET /api/model-control/advise?model=…&display=…
//   2. per-model default effort   — GET/POST /api/model-control/defaults
//   3. vendor grouping rules      — GET/POST /api/model-control/grouping
//   4. model rows gain `vendor` + `suggestedDefault` for UI grouping
//
// Defaults and grouping rules live in a plugin-owned sidecar under the harness
// home (`storages/model-control/state.json`), so they survive a restart and are
// shared across browsers; the plugin never writes llm-pi-ai settings
// implicitly. Effort declarations are advisory-only in 0.1: the effort popup
// shows the recommended ladder; writing declarations into settings lands in a
// later milestone.
//
// Node-safe: no window/document access at module scope.
import { copyFileSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { advise } from './efforts.js'
import { groupByVendor, DEFAULT_RULES } from './grouping.js'
import { createStore, resolveHome, statePath } from './store.js'
import { buildSelection, diffSelection, modelFromDiscovered } from './selection.js'
import { adviceFor, buildDeclaration, buildUndo } from './declaration.js'
import { looksLikePatch, removeRow, rowDisabled, setRowDisabled } from './profile-patch.js'

export const name = 'dsh-model-control'

/**
 * `llm` answers the facts, `webServer` carries the routes, `settings` owns the
 * `llm-pi-ai` document the selection writes into. `credentials` is optional
 * (reached through `ctx.get`) because a deployment may configure keys purely
 * through the environment.
 */
export const inject = ['llm', 'webServer', 'settings']

const CACHE_MS = 30_000
const PI_AI_NS = 'llm-pi-ai'
const ROUTE_MODELS = '/api/model-control/models'
const ROUTE_ADVISE = '/api/model-control/advise'
const ROUTE_DEFAULTS = '/api/model-control/defaults'
const ROUTE_GROUPING = '/api/model-control/grouping'
const ROUTE_PROVIDERS = '/api/model-control/providers'
const ROUTE_AVAILABLE = '/api/model-control/available'
const ROUTE_SELECTION = '/api/model-control/selection'
const ROUTE_DECLARE = '/api/model-control/declare'
const ROUTE_UNDECLARE = '/api/model-control/undeclare'
const ROUTE_STATUS = '/api/model-control/status'
const ROUTE_PROVIDER = '/api/model-control/provider'
const ROUTE_HIDDEN = '/api/model-control/hidden'
const ROUTE_TAKEOVER = '/api/model-control/takeover'
const ROUTE_EFFORT = '/api/model-control/effort'
const ROUTE_ENTRY = '/api/model-control/entry'
const ROUTE_ABILITY = '/api/model-control/ability'
const ROUTE_PROBE = '/api/model-control/probe'

/**
 * The request modalities pi-ai lets a chat-model entry declare. Mirrors the
 * adapter's own `MODALITIES`; anything else is refused rather than written,
 * because the schema rejects it at load time and takes the whole document down
 * with it.
 */
const MODALITIES = ['text', 'image']

/** Boot retry ladder for the autofill pass; settings may not be live yet. */
const AUTOFILL_RETRY_MS = [1500, 3000, 6000, 12000, 24000]

/** The shipped loader entry that renders the official 「模型」 settings page. */
const OFFICIAL_MODELS_ENTRY = 'ui-settings-models'

let cache = { at: 0, value: null }

async function collect(llm) {
  const rows = []
  for (const provider of llm.listProviders()) {
    let listed
    try {
      listed = await llm.listModels(provider.id)
    } catch {
      continue
    }
    for (const model of listed ?? []) {
      let info
      try {
        // The service method is `resolveModelInfo`; `resolveModel` is the
        // ADAPTER method and does not exist on the service. Calling the wrong
        // name threw for every row, which silently dropped every context
        // window (observed: `ctx=` empty for all 11 models).
        info = await llm.resolveModelInfo(provider.id, model.id)
      } catch {
        info = undefined
      }
      // `listModels` is the cheaper source for modalities; `resolveModelInfo`
      // is the only one that carries the context window and the declared
      // reasoning ladder.
      const modalities = info?.inputModalities ?? model.inputModalities
      const contextWindow = info?.context?.contextWindow
      const advice = advise(model.id, model.name)
      rows.push({
        provider: provider.id,
        id: model.id,
        ...(model.name !== undefined ? { name: model.name } : {}),
        ...(contextWindow === undefined ? {} : { contextWindow }),
        ...(Array.isArray(modalities) ? { input: [...modalities] } : {}),
        // What the model declares right now — empty until a declaration is
        // written. The picker's effort zone keys off exactly this.
        ...(info?.reasoning === undefined ? {} : { reasoning: info.reasoning }),
        // Vendor label drives UI grouping; suggestedDefault seeds the effort
        // popup until the user picks their own default.
        ...(advice.vendor !== undefined ? { vendor: advice.vendor } : {}),
        ...(advice.defaultEffort !== undefined ? { suggestedDefault: advice.defaultEffort } : {}),
      })
    }
  }
  return rows
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

/**
 * Persistence for defaults and grouping rules: a read-through store over
 * `<DSH_HOME>/storages/model-control/state.json`, so a pinned default effort
 * survives a restart and is shared by every browser on this machine. A home
 * that cannot be written degrades to in-process state, and the response says
 * so via `persisted` rather than failing the request.
 */
function makePersist(ctx) {
  const home = resolveHome()
  const store = createStore(home)
  return {
    path: statePath(home),
    read() { return store.read() },
    /** Persist a patch; returns `{ state, persisted }`. */
    update(patch) { return store.update(patch) },
  }
}

/** @param ctx - host plugin context carrying `llm` and `webServer`. */
export function apply(ctx) {
  const persist = makePersist(ctx)

  // Diagnostics the settings page can display. The page is the only channel
  // that can reach these routes on a fenced host, so a failure has to be
  // visible there rather than only in a log file.
  const diagnostics = { autofill: null, lastDeclare: null }

  // The host half is loaded once per process, and a reload does not always
  // re-import it. These lines are how we tell "the new code is running" from
  // "the process still holds the old module", and they carry the autofill
  // outcome, which is otherwise invisible when every write fails quietly.
  const log = (level, ...rest) => {
    try {
      const write = level === 'error' ? console.error : console.log
      write('[dsh-model-control]', ...rest)
    } catch { /* console may be gone during shutdown */ }
  }
  log('log', 'host loaded · v' + '0.2.0')

  // ─── llm-pi-ai document access ───
  // The selection is the provider's `models` array in this document, so the
  // settings service is the source of truth for "which models exist here".
  const piAiDescriptor = () => {
    try {
      return ctx.settings.describe().find((entry) => entry.ns === PI_AI_NS)
    } catch (error) {
      log('error', 'settings.describe() threw:', String(error?.message ?? error))
      return undefined
    }
  }
  const piAiProviders = (descriptor) => {
    const value = descriptor?.value
    if (value === null || typeof value !== 'object') return {}
    const providers = value.providers
    return providers !== null && typeof providers === 'object' && !Array.isArray(providers) ? providers : {}
  }
  const providerConfig = (id) => {
    const providers = piAiProviders(piAiDescriptor())
    const config = providers[id]
    return config !== null && typeof config === 'object' && !Array.isArray(config) ? config : undefined
  }

  const describeProvider = (providerId) => {
    const config = providerConfig(providerId)
    if (config === undefined) return undefined
    const models = Array.isArray(config.models) ? config.models : []
    return models.map((model, index) => {
      const advice = model !== null && typeof model === 'object' && typeof model.id === 'string'
        ? adviceFor(model.id, model.name)
        : undefined
      return {
        index,
        id: typeof model?.id === 'string' ? model.id : undefined,
        name: typeof model?.name === 'string' ? model.name : undefined,
        contextWindow: typeof model?.contextWindow === 'number' ? model.contextWindow : undefined,
        maxTokens: typeof model?.maxTokens === 'number' ? model.maxTokens : undefined,
        input: Array.isArray(model?.input) ? [...model.input] : undefined,
        // What the model currently declares, and what we would suggest. Both
        // are shown side by side in the effort page so the difference is
        // visible before anything is written.
        declared: model?.reasoningEfforts === undefined ? undefined : model.reasoningEfforts,
        declaredCompat: model?.compat === undefined ? undefined : model.compat,
        // 自适应 = the adapter's `compat.forceAdaptiveThinking`: the upstream
        // picks the strength instead of the declared ladder. The knowledge base
        // marks the generations that work this way (`anthropicAdaptive`), so the
        // page can tick the box to match reality instead of guessing.
        declaredAdaptive: model?.compat?.forceAdaptiveThinking === true,
        suggestedAdaptive: advice?.anthropicAdaptive === true,
        ...(advice === undefined ? {} : {
          suggested: {
            wire: advice.wire,
            ...(advice.defaultEffort === undefined ? {} : { defaultEffort: advice.defaultEffort }),
            ...(advice.compat === undefined ? {} : { compat: advice.compat }),
            ...(advice.input === undefined ? {} : { input: advice.input }),
            confidence: advice.confidence,
            matched: advice.matched,
            source: advice.source,
            noReasoning: advice.noReasoning === true,
            adaptive: advice.anthropicAdaptive === true,
          },
        }),
      }
    })
  }

  /** Every strength level the page always shows, in order. */
  const CANONICAL_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']

  // ─── Declaration writing ───
  // Writing `reasoningEfforts` (+ `compat`, + `input`) onto a model entry is
  // what makes the harness show an effort control for it at all. Every write is
  // planned by declaration.js, applied as path ops (so no secret is ever
  // restated), and backed up first so an undo is exact.
  /**
   * Declare one model, addressed by its index in the provider's `models` array.
   * @returns a per-model result row.
   */
  const declareAt = async (descriptor, providerId, modelIndex, force, adviceOverride) => {
    const providers = piAiProviders(descriptor)
    const config = providers[providerId]
    if (config === null || typeof config !== 'object' || Array.isArray(config)) {
      return { provider: providerId, index: modelIndex, skipped: ['no-provider'] }
    }
    const models = Array.isArray(config.models) ? config.models : []
    const entry = models[modelIndex]
    if (entry === null || typeof entry !== 'object' || typeof entry.id !== 'string') {
      return { provider: providerId, index: modelIndex, skipped: ['no-model'] }
    }
    // An explicit override is the effort page's manual edit path; otherwise the
    // knowledge base answers.
    const advice = adviceOverride !== undefined
      ? { ...adviceOverride, confidence: 'manual', matched: false, source: 'manual' }
      : adviceFor(entry.id, entry.name)
    const plan = buildDeclaration(advice, entry, { force })
    if (plan.ops.length === 0) {
      return {
        provider: providerId,
        model: entry.id,
        applied: [],
        skipped: plan.skipped,
        confidence: advice.confidence,
        matched: advice.matched,
      }
    }
    const ops = plan.ops.map((op) => ({
      op: 'set',
      path: ['providers', providerId, 'models', modelIndex, ...op.path],
      value: op.value,
    }))
    await ctx.settings.mutate(PI_AI_NS, ops, descriptor.revision)
    // Remember exactly what was there, so `undeclare` can put it back.
    const state = persist.read()
    const declarations = { ...(state.declarations ?? {}) }
    declarations[providerId + '/' + entry.id] = {
      at: new Date().toISOString(),
      // `previous` holds only fields that HAD a value (JSON drops undefined);
      // `written` names every field this write touched, so the undo can tell
      // "restore this" from "remove this".
      previous: plan.previous,
      written: plan.written,
      confidence: advice.confidence,
      source: advice.source,
    }
    persist.update({ declarations })
    return {
      provider: providerId,
      model: entry.id,
      applied: plan.ops.map((op) => op.path.join('.')),
      skipped: plan.skipped,
      confidence: advice.confidence,
      matched: advice.matched,
    }
  }

  /**
   * Walk every configured model and declare the ones still missing one.
   * Re-reads the descriptor per model because each successful write bumps the
   * revision, and a stale revision is rejected by design.
   * @returns `{ total, declared, skipped, failed }` summary rows.
   */
  const declareAll = async (force) => {
    const results = []
    const descriptor0 = piAiDescriptor()
    if (descriptor0 === undefined) return { ok: false, error: `no settings entry "${PI_AI_NS}"`, results }
    const providerIds = Object.keys(piAiProviders(descriptor0))
    for (const providerId of providerIds) {
      const descriptor = piAiDescriptor()
      if (descriptor === undefined) break
      const config = piAiProviders(descriptor)[providerId]
      const count = Array.isArray(config?.models) ? config.models.length : 0
      for (let index = 0; index < count; index += 1) {
        const live = piAiDescriptor()
        if (live === undefined) break
        try {
          results.push(await declareAt(live, providerId, index, force))
        } catch (error) {
          results.push({ provider: providerId, index, failed: String(error?.message ?? error) })
        }
      }
    }
    const declared = results.filter((row) => Array.isArray(row.applied) && row.applied.length > 0).length
    const failed = results.filter((row) => row.failed !== undefined).length
    return { ok: true, total: results.length, declared, failed, results }
  }

  /**
   * The key to interrogate an endpoint with. `apiKeyEnv` names an environment
   * variable — which is exactly what the credentials service addresses — and a
   * literal `apiKey` is the fallback. Resolution is per call, never cached.
   */
  const resolveApiKey = async (config) => {
    const envName = typeof config?.apiKeyEnv === 'string' && config.apiKeyEnv !== '' ? config.apiKeyEnv : undefined
    if (envName !== undefined) {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) {
        try {
          const resolved = await credentials.resolve(envName)
          if (resolved !== undefined && typeof resolved.value === 'string' && resolved.value !== '') return resolved.value
        } catch { /* fall through to the literal key */ }
      }
    }
    if (typeof config?.apiKey === 'string' && config.apiKey !== '') return config.apiKey
    return undefined
  }

  // ─── Secrets, stored the way the official page stores them ───
  // The page asks for a plaintext key; it never lands in the config. The config
  // keeps an environment-variable NAME (that is the field the adapter reads),
  // and the value goes to the credential service — the same store the official
  // Models page writes to. `set` refuses while a read-only source shadows the
  // name, and that refusal is surfaced instead of silently doing nothing.
  const deriveKeyName = (providerId) =>
    providerId.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase() + '_API_KEY'

  const resolveKeyName = async (providerId, parsed) => {
    if (typeof parsed.apiKeyEnv === 'string' && parsed.apiKeyEnv !== '') return parsed.apiKeyEnv
    if (typeof parsed.apiKey === 'string' && parsed.apiKey !== '') return deriveKeyName(providerId)
    return undefined
  }

  const storeSecret = async (name, value) => {
    const credentials = ctx.get('credentials')
    if (credentials === undefined) {
      throw new Error('凭据服务不可用，无法保存密钥（请改填环境变量名）')
    }
    await credentials.set(name, value)
    log('log', 'credential stored under "' + name + '"')
  }

  /**
   * Last outcome of the configurable-provider directory probe. Surfaced on the
   * channel card so "why is there no Settings button" is answerable from the UI
   * rather than from a guess.
   */
  let lastDirectoryProbe = { hasMethod: false, count: -1, error: undefined }

  /**
   * The directory entry a configurable provider declared.
   *
   * `settingsNs` lives HERE, not on `listProviders()`: that call returns the
   * ADAPTER's provider object, while the namespace and settings path are
   * declared separately through `registerConfigurableProviders`. Reading the
   * wrong list is why the built-in channels first came back "not configurable".
   */
  const configurableEntry = (providerId) => {
    const probe = { hasMethod: false, count: -1, error: undefined }
    try {
      probe.hasMethod = typeof ctx.llm.listConfigurableProviders === 'function'
      const rows = ctx.llm.listConfigurableProviders?.() ?? []
      probe.count = Array.isArray(rows) ? rows.length : -2
      lastDirectoryProbe = probe
      return rows.find((row) => row?.provider === providerId)
    } catch (error) {
      probe.error = String(error?.message ?? error)
      lastDirectoryProbe = probe
      return undefined
    }
  }

  /**
   * The settings namespace a provider's own configuration lives in. Config-based
   * channels answer `llm-pi-ai`; the built-in DeepSeek channels answer the
   * namespace their owning plugin registered (`llm-deepseek`, …), which is what
   * makes them editable from this page too.
   */
  const providerSettingsNs = (providerId) => {
    const entry = configurableEntry(providerId)
    if (entry !== undefined && typeof entry.settingsNs === 'string' && entry.settingsNs !== '') {
      return entry.settingsNs
    }
    // Fallback: an adapter may also carry the namespace on its provider object.
    try {
      const row = (ctx.llm.listProviders() ?? []).find((provider) => provider?.id === providerId)
      if (typeof row?.settingsNs === 'string' && row.settingsNs !== '') return row.settingsNs
    } catch { /* fall through */ }
    return undefined
  }

  /** Where inside that namespace the provider's own fields live. */
  const providerSettingsPath = (providerId) => {
    const entry = configurableEntry(providerId)
    return Array.isArray(entry?.settingsPath) ? [...entry.settingsPath] : []
  }

  /** Fields this plugin is willing to write on a built-in channel's entry. */
  const ENTRY_FIELDS = ['baseURL', 'reasoningEffort', 'thinking', 'apiKeyEnv', 'maxTokens', 'defaultContextWindow']
  const OFFICIAL_EFFORTS = ['off', 'low', 'high', 'max']
  const OFFICIAL_THINKING = ['enabled', 'disabled']

  ctx.inject(['webServer'], (webServerCtx) => {
    const webServer = webServerCtx.webServer

    // Each route gets its own disposer: `ctx.effect` runs the returned
    // disposer when the plugin is disabled or reloaded. Registering bare (as
    // the upstream picker host does) leaves the exact paths occupied, and the
    // next activation dies with `webserver: duplicate exact route`.
    const register = (path, handler) => {
      ctx.effect(() => webServer.register({ kind: 'exact', path, handler }), 'dsh-model-control:' + path)
    }

    // ─── Providers + their configured model selection ───
    // Two kinds of channel share this list:
    //   * `config`  — declared in the `llm-pi-ai` document; fully editable here.
    //   * `adapter` — registered by another plugin (the built-in DeepSeek
    //     routes). Their models come from the `llm` service, and their
    //     credentials live with the owning plugin, so this page lists them and
    //     says who owns them instead of pretending to edit them.
    register(ROUTE_PROVIDERS, (_req, res) => {
      void (async () => {
        try {
          const descriptor = piAiDescriptor()
          const providers = piAiProviders(descriptor)
          const credentials = ctx.get('credentials')
          const state = persist.read()
          const hidden = state.hidden ?? {}
          const rows = []
          const configuredIds = new Set()

          for (const [id, config] of Object.entries(providers)) {
            if (config === null || typeof config !== 'object' || Array.isArray(config)) continue
            configuredIds.add(id)
            const models = Array.isArray(config.models) ? config.models : []
            let credential
            const envName = typeof config.apiKeyEnv === 'string' ? config.apiKeyEnv : undefined
            if (credentials !== undefined && envName !== undefined) {
              try {
                const info = await credentials.describe(envName)
                credential = { configured: info?.configured === true, source: info?.source, writable: info?.writable === true }
              } catch { credential = undefined }
            }
            rows.push({
              id,
              kind: 'config',
              displayName: typeof config.displayName === 'string' ? config.displayName : id,
              api: typeof config.api === 'string' ? config.api : undefined,
              baseURL: typeof config.baseURL === 'string' ? config.baseURL : undefined,
              apiKeyEnv: envName,
              ...(credential === undefined ? {} : { credential }),
              models: models.filter((model) => model !== null && typeof model === 'object'),
              modelCount: models.length,
              hidden: hidden[id] === true,
            })
          }

          // Adapter-registered providers that are not in the document.
          let live = []
          try { live = ctx.llm.listProviders() ?? [] } catch { live = [] }
          for (const provider of live) {
            if (typeof provider?.id !== 'string' || configuredIds.has(provider.id)) continue
            let models = []
            try { models = (await ctx.llm.listModels(provider.id)) ?? [] } catch { models = [] }
            // The built-in channels keep their own configuration. Read it so the
            // page can offer the same editing surface as a config channel: the
            // endpoint, the thinking switch, the effort level, and (for the
            // API-key channel only) the credential reference behind the key.
            // The namespace comes from the CONFIGURABLE-PROVIDER directory —
            // `listProviders()` does not carry it.
            const ns = providerSettingsNs(provider.id)
            const descriptorOf = ns === undefined
              ? undefined
              : ctx.settings.describe().find((entry) => entry.ns === ns)
            const own = descriptorOf?.value !== null && typeof descriptorOf?.value === 'object' ? descriptorOf.value : {}
            const ownKeyEnv = typeof own.apiKeyEnv === 'string' && own.apiKeyEnv !== '' ? own.apiKeyEnv : undefined
            let ownCredential
            const credentials = ctx.get('credentials')
            if (credentials !== undefined && ownKeyEnv !== undefined) {
              try {
                const info = await credentials.describe(ownKeyEnv)
                ownCredential = { configured: info?.configured === true, source: info?.source, writable: info?.writable === true }
              } catch { ownCredential = undefined }
            }
            rows.push({
              id: provider.id,
              kind: 'adapter',
              displayName: typeof provider.name === 'string' && provider.name !== '' ? provider.name : provider.id,
              api: typeof provider.api === 'string' ? provider.api : undefined,
              // A model is editable when the channel has a settings entry to
              // write into. The page uses this to decide whether to draw the
              // per-model 设置 button, rather than guessing from the id.
              models: models
                .filter((model) => model !== null && typeof model === 'object')
                .map((model) => ({
                  ...model,
                  editable: ns !== undefined && typeof model.id === 'string',
                })),
              modelCount: models.length,
              hidden: hidden[provider.id] === true,
              // Everything the page needs to edit this channel in place.
              editable: {
                ns,
                available: descriptorOf !== undefined,
                probe: { ...lastDirectoryProbe },
                baseURL: typeof own.baseURL === 'string' ? own.baseURL : undefined,
                reasoningEffort: typeof own.reasoningEffort === 'string' ? own.reasoningEffort : undefined,
                thinking: typeof own.thinking === 'string' ? own.thinking : undefined,
                apiKeyEnv: ownKeyEnv,
                ...(ownCredential === undefined ? {} : { credential: ownCredential }),
              },
            })
          }

          // Takeover is read from the layer stack, not from the sidecar: the
          // profile row is what actually decides whether the shipped page
          // renders, and its absence means the bundle default (disabled).
          let takeover = true
          try {
            const file = await ctx.settings.prepareDocument()
            takeover = rowDisabled(readFileSync(file, 'utf8'), OFFICIAL_MODELS_ENTRY) !== false
          } catch { /* keep the default */ }

          sendJson(res, 200, {
            ok: true,
            providers: rows,
            hidden: Object.keys(hidden).filter((id) => hidden[id] === true),
            takeover,
            revision: descriptor?.revision,
          })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        }
      })()
    })

    // ─── Channel management: create, edit, delete ───
    // Writes go through `settings.mutate` path ops, so a single channel can be
    // touched without restating the whole document (and never a secret).
    register(ROUTE_PROVIDER, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const action = parsed.action
            const id = parsed.id
            if (typeof id !== 'string' || id.trim() === '') {
              sendJson(res, 400, { ok: false, error: 'id is required' }); return
            }
            const descriptor = piAiDescriptor()
            if (descriptor === undefined) {
              sendJson(res, 500, { ok: false, error: `no settings entry "${PI_AI_NS}"` }); return
            }
            const existing = piAiProviders(descriptor)[id]

            if (action === 'add') {
              if (existing !== undefined) {
                sendJson(res, 409, { ok: false, error: `provider "${id}" already exists` }); return
              }
              // pi-ai refuses a provider that resolves no models, and for a route
              // the installed catalog does not describe that means the `models`
              // array itself must be non-empty — an empty one makes the whole
              // document fail to load. So a channel is created WITH its models,
              // in one write. The page's flow is: probe -> fetch -> pick -> create.
              const wanted = Array.isArray(parsed.models) ? parsed.models : []
              const models = wanted
                .filter((model) => model !== null && typeof model === 'object'
                  && typeof model.id === 'string' && model.id !== '')
                .map((model) => ({ ...model, id: model.id }))
              if (models.length === 0) {
                sendJson(res, 400, {
                  ok: false,
                  code: 'MODELS_REQUIRED',
                  error: 'a channel needs at least one model: pi-ai rejects a provider whose models array is empty, '
                    + 'and a route the installed catalog does not describe has no defaults to fall back on',
                })
                return
              }
              // The key is typed in plaintext on the page and stored through the
              // credential service under an environment-variable NAME. That is
              // exactly how the official page handles it: the config keeps only
              // the reference, so a key never lands in the config file.
              const keyName = await resolveKeyName(id, parsed)
              const entry = {
                displayName: typeof parsed.displayName === 'string' && parsed.displayName !== '' ? parsed.displayName : id,
                ...(typeof parsed.api === 'string' && parsed.api !== '' ? { api: parsed.api } : { api: 'openai-completions' }),
                ...(typeof parsed.baseURL === 'string' && parsed.baseURL !== '' ? { baseURL: parsed.baseURL } : {}),
                ...(keyName === undefined ? {} : { apiKeyEnv: keyName }),
                models,
              }
              if (typeof parsed.apiKey === 'string' && parsed.apiKey !== '') {
                await storeSecret(keyName, parsed.apiKey)
              }
              await ctx.settings.mutate(PI_AI_NS, [
                { op: 'set', path: ['providers', id], value: entry },
              ], descriptor.revision)
              cache = { at: 0, value: null }
              sendJson(res, 200, { ok: true, provider: { id, ...entry }, keyStored: typeof parsed.apiKey === 'string' && parsed.apiKey !== '' })
              return
            }

            if (existing === null || typeof existing !== 'object' || Array.isArray(existing)) {
              sendJson(res, 404, { ok: false, error: `no llm-pi-ai provider "${id}"` }); return
            }

            if (action === 'update') {
              const ops = []
              for (const field of ['displayName', 'api', 'baseURL', 'apiKeyEnv']) {
                if (typeof parsed[field] === 'string') {
                  ops.push({ op: 'set', path: ['providers', id, field], value: parsed[field] })
                }
              }
              // A new key may arrive on its own, keeping the existing name.
              const wantedKey = typeof parsed.apiKey === 'string' && parsed.apiKey !== ''
              if (wantedKey) {
                const currentName = typeof existing.apiKeyEnv === 'string' && existing.apiKeyEnv !== ''
                  ? existing.apiKeyEnv
                  : undefined
                const keyName = typeof parsed.apiKeyEnv === 'string' && parsed.apiKeyEnv !== ''
                  ? parsed.apiKeyEnv
                  : (currentName ?? deriveKeyName(id))
                await storeSecret(keyName, parsed.apiKey)
                if (keyName !== currentName) {
                  ops.push({ op: 'set', path: ['providers', id, 'apiKeyEnv'], value: keyName })
                }
              }
              // Rotating a key without changing its variable name touches no
              // config field at all. That is a success, not "nothing to
              // update" — the secret really was stored, and reporting an error
              // there made a successful rotation look like a failure.
              if (ops.length === 0) {
                if (!wantedKey) { sendJson(res, 400, { ok: false, error: 'nothing to update' }); return }
                cache = { at: 0, value: null }
                sendJson(res, 200, { ok: true, provider: { id }, updated: 0, keyStored: true })
                return
              }
              await ctx.settings.mutate(PI_AI_NS, ops, descriptor.revision)
              cache = { at: 0, value: null }
              sendJson(res, 200, { ok: true, provider: { id }, updated: ops.length, keyStored: wantedKey })
              return
            }

            if (action === 'remove') {
              await ctx.settings.mutate(PI_AI_NS, [
                { op: 'unset', path: ['providers', id] },
              ], descriptor.revision)
              const state = persist.read()
              const hidden = { ...(state.hidden ?? {}) }
              delete hidden[id]
              persist.update({ hidden })
              cache = { at: 0, value: null }
              sendJson(res, 200, { ok: true, removed: id })
              return
            }

            sendJson(res, 400, { ok: false, error: `unknown action "${String(action)}"` })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    // ─── Edit a BUILT-IN channel's own configuration ───
    // The two shipped DeepSeek channels are not rows of the `llm-pi-ai`
    // document; they belong to their own loader entries. They are edited
    // through their own settings namespace, with a field whitelist so this
    // route can never become a general-purpose settings writer.
    register(ROUTE_ENTRY, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const providerId = parsed.provider
            if (typeof providerId !== 'string' || providerId === '') {
              sendJson(res, 400, { ok: false, error: 'provider is required' }); return
            }
            // Auto-detection first, then an explicit namespace from the page.
            // The override exists because the directory API is the only way to
            // learn a built-in channel's namespace, and a page that depends on
            // one host call is a page that breaks when that call answers
            // nothing. Whatever arrives is validated against the live settings
            // descriptors, so this can never become an arbitrary settings write.
            const requestedNs = typeof parsed.ns === 'string' && parsed.ns !== '' ? parsed.ns : undefined
            const described = ctx.settings.describe()
            const ns = requestedNs ?? providerSettingsNs(providerId)
            if (ns === undefined) {
              sendJson(res, 404, {
                ok: false,
                error: `provider "${providerId}" has no settings namespace`,
                namespaces: described.map((entry) => String(entry.ns)),
              }); return
            }
            const descriptor = described.find((entry) => entry.ns === ns)
            if (descriptor === undefined) {
              sendJson(res, 404, {
                ok: false,
                error: `settings entry "${ns}" is not available`,
                namespaces: described.map((entry) => String(entry.ns)),
              }); return
            }

            const fields = parsed.fields !== null && typeof parsed.fields === 'object' ? parsed.fields : {}
            // The directory entry says where inside its namespace this provider's
            // fields live (`[]` for the shipped DeepSeek channels).
            const basePath = providerSettingsPath(providerId)
            const ops = []
            for (const field of ENTRY_FIELDS) {
              if (!(field in fields)) continue
              const value = fields[field]
              // `null` means "remove this key", which is how a value written
              // here can be taken back out again. Without it, setting a level
              // once would be a one-way door: the page could never restore the
              // channel to its shipped default.
              if (value === null) {
                ops.push({ op: 'unset', path: [...basePath, field] })
                continue
              }
              if (typeof value !== 'string' || value === '') continue
              if (field === 'reasoningEffort' && !OFFICIAL_EFFORTS.includes(value)) {
                sendJson(res, 400, { ok: false, error: `reasoningEffort must be one of ${OFFICIAL_EFFORTS.join('/')}` }); return
              }
              if (field === 'thinking' && !OFFICIAL_THINKING.includes(value)) {
                sendJson(res, 400, { ok: false, error: `thinking must be one of ${OFFICIAL_THINKING.join('/')}` }); return
              }
              ops.push({ op: 'set', path: [...basePath, field], value })
            }

            // A built-in channel may also carry a credential reference. The key
            // is stored through the credential service, never in the config.
            const wantedKey = typeof parsed.apiKey === 'string' && parsed.apiKey !== ''
            if (wantedKey) {
              const current = descriptor.value !== null && typeof descriptor.value === 'object' ? descriptor.value : {}
              const name = typeof fields.apiKeyEnv === 'string' && fields.apiKeyEnv !== ''
                ? fields.apiKeyEnv
                : (typeof current.apiKeyEnv === 'string' && current.apiKeyEnv !== '' ? current.apiKeyEnv : undefined)
              if (name === undefined) {
                sendJson(res, 400, { ok: false, error: 'this channel has no key field; set an environment-variable name first' }); return
              }
              await storeSecret(name, parsed.apiKey)
            }

            // Recorded so a write can be traced from the log: which fields the
            // page actually sent, and the ops they turned into. A clear that
            // silently becomes a set looks identical in the UI.
            log('log', 'entry write ' + providerId + ' ns=' + ns
              + ' fields=' + JSON.stringify(fields)
              + ' ops=' + JSON.stringify(ops))

            if (ops.length === 0) {
              sendJson(res, 200, { ok: true, changed: false, ns, keyStored: wantedKey })
              return
            }
            await ctx.settings.mutate(ns, ops, descriptor.revision)
            cache = { at: 0, value: null }
            sendJson(res, 200, { ok: true, changed: true, ns, updated: ops.length, keyStored: wantedKey })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    // ─── Per-model abilities (input modalities, context / output budget) ───
    //
    // Why only these: pi-ai's chat-model entry is exactly
    // `{ name, contextWindow, maxTokens, input, reasoningEfforts, compat }`.
    // There is no per-model "supports tools" flag — tool use is assumed by every
    // protocol pi-ai speaks, and the tool-shaped switches that DO exist
    // (`supportsToolSearch`, `requiresToolResultName`, …) are protocol-level
    // compat knobs, not model capabilities. There is likewise no chat-side
    // image-OUTPUT flag: text-to-image lives in pi-ai's separate image-model
    // registry (`api: "openrouter-images"`), which this document never feeds.
    // So "看图" and "图片输入" are the same single `input` list, and offering a
    // tool/image-output checkbox here would write a key the schema does not
    // have. The endpoint keeps that honest instead of inventing fields.
    register(ROUTE_ABILITY, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const modelId = typeof parsed.model === 'string' ? parsed.model : ''
            if (modelId === '') { sendJson(res, 400, { ok: false, error: 'model is required' }); return }
            const providerId = typeof parsed.provider === 'string' && parsed.provider !== '' ? parsed.provider : undefined

            // Which document owns this model? A self-built channel is a row of
            // the pi-ai document; a shipped channel is its own settings entry.
            const descriptor = piAiDescriptor()
            if (descriptor === undefined) { sendJson(res, 500, { ok: false, error: `no settings entry "${PI_AI_NS}"` }); return }
            const providers = piAiProviders(descriptor)
            const ownerOf = providerId !== undefined && Array.isArray(providers[providerId]?.models)
              ? providerId
              : Object.keys(providers).find((id) =>
                Array.isArray(providers[id]?.models) && providers[id].models.some((model) => model?.id === modelId))

            const ops = []
            let ns = PI_AI_NS
            let basePath = []
            let entry
            let revision = descriptor.revision

            if (ownerOf !== undefined) {
              const models = providers[ownerOf].models
              const index = models.findIndex((model) => model?.id === modelId)
              entry = models[index]
              basePath = ['providers', ownerOf, 'models', index]
            } else {
              // Not a pi-ai row: try the shipped channel's own entry, where the
              // models live under the namespace the directory names.
              const builtinId = providerId
              if (builtinId === undefined) { sendJson(res, 404, { ok: false, error: `model "${modelId}" is not configured` }); return }
              const targetNs = providerSettingsNs(builtinId)
              const described = ctx.settings.describe()
              const found = targetNs === undefined ? undefined : described.find((row) => row.ns === targetNs)
              if (found === undefined) { sendJson(res, 404, { ok: false, error: `provider "${builtinId}" has no settings namespace` }); return }
              const value = found.value !== null && typeof found.value === 'object' ? found.value : {}
              const list = Array.isArray(value.models) ? value.models : []
              const index = list.findIndex((model) => model?.id === modelId)
              if (index < 0) { sendJson(res, 404, { ok: false, error: `model "${modelId}" is not configured on "${builtinId}"` }); return }
              ns = targetNs
              revision = found.revision
              basePath = providerSettingsPath(builtinId).concat(['models', index])
              entry = list[index]
            }

            if (entry === null || typeof entry !== 'object') { sendJson(res, 404, { ok: false, error: `model "${modelId}" is not an object` }); return }

            // Only the fields the caller actually named are touched; every other
            // key on the entry (name, compat, reasoningEfforts, cost, limits…)
            // is left exactly as it was.
            if (parsed.input !== undefined) {
              if (!Array.isArray(parsed.input)) { sendJson(res, 400, { ok: false, error: 'input must be an array' }); return }
              const wanted = [...new Set(parsed.input.filter((m) => MODALITIES.includes(m)))]
              if (wanted.length !== parsed.input.length) {
                sendJson(res, 400, { ok: false, error: `input may only name ${MODALITIES.join('/')}` }); return
              }
              // An empty list means "accepts nothing", which pi-ai reads as
              // "undeclared" and falls back to the catalog — never what a
              // checkbox that was just unticked means. Refuse it rather than
              // silently restoring capabilities the user just switched off.
              if (wanted.length === 0) { sendJson(res, 400, { ok: false, error: 'input must name at least one modality' }); return }
              ops.push({ op: 'set', path: [...basePath, 'input'], value: wanted })
            }
            for (const field of ['contextWindow', 'maxTokens']) {
              if (parsed[field] === undefined) continue
              if (parsed[field] === null) { ops.push({ op: 'unset', path: [...basePath, field] }); continue }
              const value = parsed[field]
              if (!Number.isInteger(value) || value <= 0) {
                sendJson(res, 400, { ok: false, error: `${field} must be a positive integer` }); return
              }
              ops.push({ op: 'set', path: [...basePath, field], value })
            }

            if (ops.length === 0) { sendJson(res, 200, { ok: true, changed: false }); return }
            await ctx.settings.mutate(ns, ops, revision)
            cache = { at: 0, value: null }
            sendJson(res, 200, { ok: true, changed: true, ns, model: modelId, updated: ops.length })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    // ─── Hide / unhide a channel in the model pickers ───
    // Presentational only: the channel keeps its config, its key and its
    // models, so unhiding restores it byte for byte.
    register(ROUTE_HIDDEN, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}')
          const id = parsed.provider
          if (typeof id !== 'string' || id === '') {
            sendJson(res, 400, { ok: false, error: 'provider is required' }); return
          }
          const state = persist.read()
          const hidden = { ...(state.hidden ?? {}) }
          if (parsed.hidden === false) delete hidden[id]
          else hidden[id] = true
          const result = persist.update({ hidden })
          sendJson(res, 200, {
            ok: true,
            hidden: Object.keys(result.state.hidden ?? {}).filter((key) => result.state.hidden[key] === true),
            persisted: result.persisted,
          })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
        }
      })
    })

    // ─── Take over the official "Models" settings section ───
    //
    // This is done in the LAYER STACK, not in the slot table. Reusing the
    // shipped section id (`models`) does not replace that page — the
    // registration is rejected as a duplicate and no occupant appears (measured
    // live). What does work is disabling the shipped loader entry
    // `ui-settings-models`, which is one line in a patch layer.
    //
    // That line already ships in this plugin's own bundle patch, so takeover is
    // ON by default and is undone automatically when the plugin is disabled or
    // removed. The switch below only has to write the OPPOSITE into the profile
    // layer (applied after every bundle layer) when the user wants the official
    // page back.
    register(ROUTE_TAKEOVER, (req, res) => {
      // The request listeners are attached BEFORE any await: a stream that has
      // already delivered its body must not be read late, or the handler hangs
      // waiting for an `end` that already happened.
      if (req.method === 'GET') {
        void (async () => {
          try {
            const file = await ctx.settings.prepareDocument()
            const disabled = rowDisabled(readFileSync(file, 'utf8'), OFFICIAL_MODELS_ENTRY)
            // No row in the profile layer means the bundle's default (disabled)
            // is in force, i.e. takeover is on.
            sendJson(res, 200, {
              ok: true,
              enabled: disabled !== false,
              path: file,
              profileRow: disabled === undefined ? undefined : `disabled: ${disabled}`,
            })
          } catch (error) {
            sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
          }
        })()
        return
      }
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            if (typeof parsed.enabled !== 'boolean') {
              sendJson(res, 400, { ok: false, error: 'enabled must be a boolean' }); return
            }
            const file = await ctx.settings.prepareDocument()
            const current = readFileSync(file, 'utf8')
            const next = parsed.enabled
              // Takeover on: drop our override so the bundle default applies.
              ? removeRow(current, OFFICIAL_MODELS_ENTRY)
              // Takeover off: pin the entry back on, overriding the bundle.
              : setRowDisabled(current, OFFICIAL_MODELS_ENTRY, false)
            if (!next.changed) {
              sendJson(res, 200, { ok: true, enabled: parsed.enabled, changed: false, path: file, restart: false })
              return
            }
            if (!looksLikePatch(current, next.text)) {
              sendJson(res, 500, { ok: false, error: 'refusing to write a patch that no longer looks like one' })
              return
            }
            const backup = file + '.model-control.bak'
            copyFileSync(file, backup)
            const tmp = file + '.tmp'
            writeFileSync(tmp, next.text, 'utf8')
            renameSync(tmp, file)
            sendJson(res, 200, {
              ok: true,
              enabled: parsed.enabled,
              changed: true,
              path: file,
              backup,
              // The layer stack is read when the host loads, so the nav does
              // not change until the app restarts.
              restart: true,
            })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    // ─── Probe a draft channel's connectivity, writing nothing ───
    // "Does this endpoint answer with this key?" is the question worth asking
    // BEFORE creating anything: pi-ai will not store a provider with no models,
    // so the create step has to be last, and a failure there would otherwise
    // surface as a schema error instead of a connection error.
    register(ROUTE_PROBE, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const draft = parsed.draft !== null && typeof parsed.draft === 'object' ? parsed.draft : parsed
            const id = typeof draft.id === 'string' && draft.id !== '' ? draft.id : ''
            if (id === '') { sendJson(res, 400, { ok: false, error: 'draft.id is required' }); return }
            // An unsaved key is used as typed; otherwise fall back to whatever is
            // already stored for this id (the edit-an-existing-channel case).
            let apiKey = typeof draft.apiKey === 'string' && draft.apiKey !== '' ? draft.apiKey : undefined
            if (apiKey === undefined) {
              const existing = providerConfig(id)
              if (existing !== undefined) apiKey = await resolveApiKey(existing)
            }
            // The same call the fetch step uses, so a "reachable" answer here
            // means the fetch that follows will not surprise anyone.
            const available = await ctx.llm.discoverModels(PI_AI_NS, {
              provider: id,
              ...(typeof draft.baseURL === 'string' && draft.baseURL !== '' ? { baseURL: draft.baseURL } : {}),
              ...(typeof draft.api === 'string' && draft.api !== '' ? { api: draft.api } : {}),
              ...(apiKey === undefined ? {} : { apiKey }),
            })
            const count = Array.isArray(available) ? available.length : 0
            sendJson(res, 200, {
              ok: true,
              reachable: true,
              modelCount: count,
              // Zero models is a REACHABLE endpoint that advertises nothing — a
              // real answer, and a different problem from "cannot connect".
              hint: count === 0 ? 'endpoint answered but listed no models' : undefined,
            })
          } catch (error) {
            sendJson(res, 502, { ok: false, reachable: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    // ─── What the endpoint advertises (candidates for selection) ───
    register(ROUTE_AVAILABLE, (req, res) => {
      // GET  ?provider=<id>   → list candidates for an EXISTING channel
      // POST {draft:{...}}    → same, for a channel that has not been created yet
      //
      // The POST form is what makes "test, then fetch, then create" possible:
      // pi-ai refuses a provider whose models array is empty, so a channel must
      // be created WITH its models in one write. Fetching has to happen before
      // that write, which means it has to work on a descriptor that is not in
      // the document.
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', () => {
          void (async () => {
            try {
              const parsed = JSON.parse(body || '{}')
              const draft = parsed.draft !== null && typeof parsed.draft === 'object' ? parsed.draft : {}
              const id = typeof draft.id === 'string' && draft.id !== '' ? draft.id : ''
              if (id === '') { sendJson(res, 400, { ok: false, error: 'draft.id is required' }); return }
              // An explicit key in the body wins; otherwise fall back to the
              // stored one when this id already exists (editing a draft).
              let apiKey = typeof draft.apiKey === 'string' && draft.apiKey !== '' ? draft.apiKey : undefined
              if (apiKey === undefined) {
                const existing = providerConfig(id)
                if (existing !== undefined) apiKey = await resolveApiKey(existing)
              }
              const available = await ctx.llm.discoverModels(PI_AI_NS, {
                provider: id,
                ...(typeof draft.baseURL === 'string' && draft.baseURL !== '' ? { baseURL: draft.baseURL } : {}),
                ...(typeof draft.api === 'string' && draft.api !== '' ? { api: draft.api } : {}),
                ...(apiKey === undefined ? {} : { apiKey }),
              })
              sendJson(res, 200, {
                ok: true,
                provider: id,
                available: (available ?? []).map((model) => modelFromDiscovered(model)),
                selected: [],
              })
            } catch (error) {
              sendJson(res, 502, { ok: false, error: String(error?.message ?? error) })
            }
          })()
        })
        return
      }
      void (async () => {
        try {
          const url = new URL(req.url ?? '/', 'http://x')
          const id = url.searchParams.get('provider') ?? ''
          if (id === '') { sendJson(res, 400, { ok: false, error: 'missing provider' }); return }
          const config = providerConfig(id)
          if (config === undefined) {
            sendJson(res, 404, { ok: false, error: `no llm-pi-ai provider "${id}"` })
            return
          }
          const apiKey = await resolveApiKey(config)
          const available = await ctx.llm.discoverModels(PI_AI_NS, {
            provider: id,
            ...(typeof config.baseURL === 'string' ? { baseURL: config.baseURL } : {}),
            ...(typeof config.api === 'string' ? { api: config.api } : {}),
            ...(apiKey === undefined ? {} : { apiKey }),
          })
          const selected = (Array.isArray(config.models) ? config.models : [])
            .filter((model) => model !== null && typeof model === 'object' && typeof model.id === 'string')
            .map((model) => model.id)
          sendJson(res, 200, {
            ok: true,
            provider: id,
            available: (available ?? []).map((model) => modelFromDiscovered(model)),
            selected,
          })
        } catch (error) {
          sendJson(res, 502, { ok: false, error: String(error?.message ?? error) })
        }
      })()
    })

    // ─── Write the selection back into the provider's models array ───
    register(ROUTE_SELECTION, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const id = parsed.provider
            if (typeof id !== 'string' || id === '') {
              sendJson(res, 400, { ok: false, error: 'provider is required' }); return
            }
            if (!Array.isArray(parsed.ids)) {
              sendJson(res, 400, { ok: false, error: 'ids must be an array' }); return
            }
            const discovered = Array.isArray(parsed.available) ? parsed.available : []

            // Read-modify-write with one revision retry: another surface (the
            // official models page, another browser) may have written between
            // our read and our write.
            let attempt = 0
            for (;;) {
              const descriptor = piAiDescriptor()
              if (descriptor === undefined) {
                sendJson(res, 500, { ok: false, error: `no settings entry "${PI_AI_NS}"` }); return
              }
              const providers = piAiProviders(descriptor)
              const config = providers[id]
              if (config === null || typeof config !== 'object' || Array.isArray(config)) {
                sendJson(res, 404, { ok: false, error: `no llm-pi-ai provider "${id}"` }); return
              }
              const existing = Array.isArray(config.models) ? config.models : []
              const next = buildSelection(existing, discovered, parsed.ids)
              try {
                await ctx.settings.mutate(PI_AI_NS, [
                  { op: 'set', path: ['providers', id, 'models'], value: next },
                ], descriptor.revision)
                // The picker caches the catalog for 30s; a selection change is
                // exactly the moment that cache must not lie.
                cache = { at: 0, value: null }
                sendJson(res, 200, {
                  ok: true,
                  provider: id,
                  models: next,
                  modelCount: next.length,
                  diff: diffSelection(existing, next.map((model) => model.id)),
                })
                return
              } catch (error) {
                if (attempt === 0) { attempt += 1; continue }
                sendJson(res, 409, { ok: false, error: String(error?.message ?? error) })
                return
              }
            }
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    // ─── Declare / undeclare a model's effort ladder ───
    // `POST /declare { provider, model?, force? }` — with a `model`, that one
    // entry; without, every model of the provider. `POST /undeclare` restores
    // whatever the entry held before this plugin wrote a declaration.
    // ─── Effort page data: declared vs suggested, per model ───
    register(ROUTE_EFFORT, (req, res) => {
      void (async () => {
        try {
          const url = new URL(req.url ?? '/', 'http://x')
          const id = url.searchParams.get('provider') ?? ''
          if (id === '') { sendJson(res, 400, { ok: false, error: 'missing provider' }); return }
          if (providerConfig(id) === undefined) {
            sendJson(res, 404, { ok: false, error: `no llm-pi-ai provider "${id}"` }); return
          }
          // `levels` is the full ladder the page always renders, so a model
          // whose advice skips a level still gets a box for it.
          sendJson(res, 200, {
            ok: true,
            provider: id,
            levels: CANONICAL_LEVELS,
            models: describeProvider(id),
          })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        }
      })()
    })

    register(ROUTE_DECLARE, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const providerId = parsed.provider
            const force = parsed.force === true
            if (providerId !== undefined && typeof providerId !== 'string') {
              sendJson(res, 400, { ok: false, error: 'provider must be a string' }); return
            }
            const descriptor = piAiDescriptor()
            if (descriptor === undefined) {
              sendJson(res, 500, { ok: false, error: `no settings entry "${PI_AI_NS}"` }); return
            }
            const providers = piAiProviders(descriptor)

            if (typeof parsed.model === 'string') {
              const targetProvider = providerId ?? Object.keys(providers).find((id) =>
                Array.isArray(providers[id]?.models) && providers[id].models.some((model) => model?.id === parsed.model))
              if (targetProvider === undefined) {
                sendJson(res, 404, { ok: false, error: `model "${parsed.model}" is not configured` }); return
              }
              const models = Array.isArray(providers[targetProvider]?.models) ? providers[targetProvider].models : []
              const index = models.findIndex((model) => model?.id === parsed.model)
              if (index < 0) {
                sendJson(res, 404, { ok: false, error: `model "${parsed.model}" is not configured on "${targetProvider}"` }); return
              }
              // An explicit `ladder` (with optional compat/input) is the effort
              // page writing what the user picked; otherwise the knowledge base
              // answers.
              const override = parsed.ladder === undefined && parsed.compat === undefined && parsed.input === undefined
                ? undefined
                : {
                  ...(parsed.ladder === undefined ? {} : { wire: parsed.ladder }),
                  ...(parsed.compat === undefined ? {} : { compat: parsed.compat }),
                  ...(parsed.input === undefined ? {} : { input: parsed.input }),
                }
              const row = await declareAt(descriptor, targetProvider, index, override === undefined ? force : true, override)
              cache = { at: 0, value: null }
              sendJson(res, 200, { ok: true, ...row })
              return
            }

            if (providerId !== undefined) {
              const models = Array.isArray(providers[providerId]?.models) ? providers[providerId].models : undefined
              if (models === undefined) {
                sendJson(res, 404, { ok: false, error: `no llm-pi-ai provider "${providerId}"` }); return
              }
              const results = []
              for (let index = 0; index < models.length; index += 1) {
                const live = piAiDescriptor()
                if (live === undefined) break
                try {
                  results.push(await declareAt(live, providerId, index, force))
                } catch (error) {
                  results.push({ provider: providerId, index, failed: String(error?.message ?? error) })
                }
              }
              cache = { at: 0, value: null }
              sendJson(res, 200, { ok: true, provider: providerId, total: results.length, results })
              return
            }

            const summary = await declareAll(force)
            cache = { at: 0, value: null }
            sendJson(res, 200, summary)
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

    register(ROUTE_UNDECLARE, (req, res) => {
      if (req.method !== 'POST') { sendJson(res, 405, { ok: false, error: 'method not allowed' }); return }
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        void (async () => {
          try {
            const parsed = JSON.parse(body || '{}')
            const providerId = parsed.provider
            const modelId = parsed.model
            if (typeof providerId !== 'string' || typeof modelId !== 'string') {
              sendJson(res, 400, { ok: false, error: 'provider and model are required' }); return
            }
            const key = providerId + '/' + modelId
            const backup = (persist.read().declarations ?? {})[key]
            if (backup === undefined) {
              sendJson(res, 404, { ok: false, error: `no declaration backup for "${key}"` }); return
            }
            const descriptor = piAiDescriptor()
            if (descriptor === undefined) {
              sendJson(res, 500, { ok: false, error: `no settings entry "${PI_AI_NS}"` }); return
            }
            const models = Array.isArray(piAiProviders(descriptor)[providerId]?.models)
              ? piAiProviders(descriptor)[providerId].models
              : []
            const index = models.findIndex((model) => model?.id === modelId)
            if (index < 0) {
              sendJson(res, 404, { ok: false, error: `model "${modelId}" is no longer configured` }); return
            }
            const ops = buildUndo(backup.previous, backup.written).map((op) => ({
              ...op,
              path: ['providers', providerId, 'models', index, ...op.path],
            }))
            if (ops.length > 0) await ctx.settings.mutate(PI_AI_NS, ops, descriptor.revision)
            const state = persist.read()
            const declarations = { ...(state.declarations ?? {}) }
            delete declarations[key]
            persist.update({ declarations })
            cache = { at: 0, value: null }
            sendJson(res, 200, { ok: true, provider: providerId, model: modelId, restored: ops.length })
          } catch (error) {
            sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
          }
        })()
      })
    })

  register(ROUTE_MODELS, (_req, res) => {
    void (async () => {
      try {
        const now = Date.now()
        if (cache.value === null || now - cache.at > CACHE_MS) {
          cache = { at: now, value: await collect(ctx.llm) }
        }
        // The hidden set rides along so the picker can drop those channels in
        // its own render — it owns the composer seat, so this is enough to keep
        // a hidden channel out of every model list this plugin draws.
        const hidden = persist.read().hidden ?? {}
        sendJson(res, 200, {
          ok: true,
          models: cache.value,
          hiddenProviders: Object.keys(hidden).filter((id) => hidden[id] === true),
        })
      } catch (error) {
        sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
      }
    })()
  })

  register(ROUTE_ADVISE, (req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const model = url.searchParams.get('model') ?? ''
    const display = url.searchParams.get('display')
    if (model === '') { sendJson(res, 400, { ok: false, error: 'missing model' }); return }
    try {
      sendJson(res, 200, { ok: true, advice: advise(model, display ?? undefined) })
    } catch (error) {
      sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
    }
  })

  register(ROUTE_DEFAULTS, (req, res) => {
    if (req.method === 'GET') {
      const state = persist.read()
      sendJson(res, 200, { ok: true, defaults: state.defaults, store: persist.path })
      return
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}')
          const { provider, model, effort } = parsed
          if (typeof provider !== 'string' || typeof model !== 'string') {
            sendJson(res, 400, { ok: false, error: 'provider and model are required' }); return
          }
          const key = provider + '/' + model
          const defaults = { ...persist.read().defaults }
          if (effort === null || effort === undefined || effort === '') {
            delete defaults[key]
          } else {
            if (typeof effort !== 'string') {
              sendJson(res, 400, { ok: false, error: 'effort must be a string or null' }); return
            }
            defaults[key] = effort
          }
          const result = persist.update({ defaults })
          sendJson(res, 200, { ok: true, defaults: result.state.defaults, persisted: result.persisted, store: persist.path })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
        }
      })
      return
    }
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
  })

  register(ROUTE_GROUPING, (req, res) => {
    if (req.method === 'GET') {
      const stored = persist.read().grouping
      sendJson(res, 200, { ok: true, rules: stored ?? DEFAULT_RULES, custom: stored !== null })
      return
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', (chunk) => { body += chunk })
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}')
          let result = null
          if (parsed.rules !== undefined) {
            if (!Array.isArray(parsed.rules)) {
              sendJson(res, 400, { ok: false, error: 'rules must be an array' }); return
            }
            result = persist.update({ grouping: parsed.rules })
          }
          if (parsed.reset === true) {
            result = persist.update({ grouping: null })
          }
          const stored = (result?.state ?? persist.read()).grouping
          sendJson(res, 200, {
            ok: true,
            rules: stored ?? DEFAULT_RULES,
            custom: stored !== null,
            ...(result === null ? {} : { persisted: result.persisted }),
          })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: String(error?.message ?? error) })
        }
      })
      return
    }
    sendJson(res, 405, { ok: false, error: 'method not allowed' })
  })

    // ─── Diagnostics ───
    // Everything needed to explain "why is there still no effort control":
    // whether the settings namespace was found, which namespaces exist, how
    // many models each provider carries, and what the last declare attempt did.
    register(ROUTE_STATUS, (_req, res) => {
      void (async () => {
        try {
          let namespaces = []
          let describeError
          try {
            namespaces = ctx.settings.describe().map((entry) => String(entry.ns))
          } catch (error) {
            describeError = String(error?.message ?? error)
          }
          const descriptor = piAiDescriptor()
          const providers = piAiProviders(descriptor)
          const modelCounts = {}
          for (const [id, config] of Object.entries(providers)) {
            modelCounts[id] = Array.isArray(config?.models) ? config.models.length : 0
          }
          const state = persist.read()
          // Why a built-in channel's Settings button may be missing: it needs a
          // settings entry for the namespace its CONFIGURABLE-PROVIDER entry
          // declares. Report both halves so the answer is visible, not guessed.
          const nsSet = new Set(namespaces)
          let liveProviders = []
          try {
            liveProviders = (ctx.llm.listProviders() ?? []).map((provider) => ({
              id: provider?.id,
              onAdapter: provider?.settingsNs,
              onDirectory: configurableEntry(provider?.id)?.settingsNs,
              resolved: providerSettingsNs(provider?.id),
              hasEntry: nsSet.has(providerSettingsNs(provider?.id)),
            }))
          } catch { liveProviders = [] }
          sendJson(res, 200, {
            ok: true,
            // First on purpose: this is the half that explains a missing
            // Settings button on a built-in channel.
            liveProviders,
            plugin: name,
            sidecar: persist.path,
            autofillEnabled: state.autofill !== false,
            hasPiAiEntry: descriptor !== undefined,
            namespaces,
            ...(describeError === undefined ? {} : { describeError }),
            providerIds: Object.keys(providers),
            modelCounts,
            declarations: Object.keys(state.declarations ?? {}).length,
            lastAutofill: diagnostics.autofill,
            lastDeclare: diagnostics.lastDeclare,
          })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: String(error?.message ?? error) })
        }
      })()
    })
  })

  // ─── Autofill on load ───
  // A third-party channel starts with no declarations, which means no effort
  // control appears anywhere — the problem this plugin exists to fix. Fill the
  // gap once per process, and only for models that still lack a declaration, so
  // a hand-written one is never replaced. Retries cover settings not being live
  // yet at plugin load.
  const timers = new Set()
  ctx.effect(() => () => {
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
  }, 'dsh-model-control:autofill')
  const attemptAutofill = (step) => {
    void (async () => {
      try {
        if (persist.read().autofill === false) {
          diagnostics.autofill = { at: new Date().toISOString(), skipped: 'disabled-by-config' }
          log('log', 'autofill skipped: disabled by config')
          return
        }
        if (piAiDescriptor() === undefined) {
          let namespaces = []
          try { namespaces = ctx.settings.describe().map((entry) => String(entry.ns)) } catch { /* reported below */ }
          throw new Error('settings entry "' + PI_AI_NS + '" not found; namespaces=' + JSON.stringify(namespaces))
        }
        const summary = await declareAll(false)
        if (summary.declared > 0) cache = { at: 0, value: null }
        const failures = (summary.results ?? []).filter((row) => row.failed !== undefined).slice(0, 5)
        diagnostics.autofill = {
          at: new Date().toISOString(),
          total: summary.total,
          declared: summary.declared,
          failed: summary.failed,
          // The first few concrete reasons, so the page can show what went
          // wrong instead of just a count.
          failures,
        }
        log('log', 'autofill done:', JSON.stringify({ total: summary.total, declared: summary.declared, failed: summary.failed, failures }))
      } catch (error) {
        const message = String(error?.message ?? error)
        diagnostics.autofill = { at: new Date().toISOString(), attempt: step, error: message }
        log('error', 'autofill attempt ' + step + ' failed:', message)
        if (step >= AUTOFILL_RETRY_MS.length) return
        const timer = setTimeout(() => {
          timers.delete(timer)
          attemptAutofill(step + 1)
        }, AUTOFILL_RETRY_MS[step])
        timers.add(timer)
      }
    })()
  }
  attemptAutofill(0)
}

export { groupByVendor }
