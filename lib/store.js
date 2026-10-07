// Sidecar persistence for dsh-model-control.
//
// The picker's UI preferences (favorites) live in the browser, but per-model
// default efforts and vendor-grouping rules belong to the machine, not the
// tab: they must survive a reload, another browser, and a restart. They are
// therefore written as one small JSON document under the harness home:
//
//   <DSH_HOME>/storages/model-control/state.json
//
// Home resolution mirrors the harness rule (explicit path > $DSH_HOME >
// ~/.dsh). Writes are atomic (tmp + rename) so a crash mid-write cannot leave
// a half document, and a corrupt file degrades to defaults instead of
// breaking plugin startup.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const DIR_NAME = 'model-control'
const FILE_NAME = 'state.json'
const VERSION = 1

/** The default document: no pinned efforts, built-in grouping rules, autofill on. */
export function emptyState() {
  return {
    version: VERSION,
    defaults: {},
    grouping: null,
    // Per-model declaration backups, keyed `provider/modelId`: what the entry
    // looked like before this plugin wrote a declaration, so an undo is exact.
    declarations: {},
    // Write a declaration for every configured model that lacks one. On by
    // default: without declarations a third-party channel shows no effort
    // control anywhere, which is the whole problem this plugin exists to fix.
    autofill: true,
    // Take over the official "Models" settings section. On by default, because
    // replacing that page is the point of the plugin — and the page itself
    // carries the switch back, so enabling it can never lock anyone out.
    takeover: true,
    // Providers hidden from every model-listing entry point, keyed by provider
    // id. Presentational only: the provider keeps its config, credentials and
    // models, so unhiding restores it exactly.
    hidden: {},
  }
}

/** Resolve the harness home: explicit path, else $DSH_HOME, else ~/.dsh. */
export function resolveHome(env = process.env) {
  const explicit = env.DSH_HOME
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit
  return join(homedir(), '.dsh')
}

/** Absolute path of the sidecar document for a given home. */
export function statePath(home) {
  return join(home, 'storages', DIR_NAME, FILE_NAME)
}

/**
 * Read the document. A missing, unreadable or malformed file yields the
 * default state — never an exception, because a plugin that throws while
 * loading takes the whole harness down with it.
 */
export function readState(home) {
  const file = statePath(home)
  try {
    if (!existsSync(file)) return emptyState()
    // Strip a BOM before parsing. A hand-edit (PowerShell's
    // `Set-Content -Encoding UTF8` writes one) makes JSON.parse reject the
    // whole file, which silently downgraded a full document to the empty
    // default and lost every declaration backup. Seen live; handled here.
    const parsed = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyState()
    return {
      version: VERSION,
      defaults: typeof parsed.defaults === 'object' && parsed.defaults !== null && !Array.isArray(parsed.defaults)
        ? parsed.defaults
        : {},
      grouping: Array.isArray(parsed.grouping) ? parsed.grouping : null,
      declarations: typeof parsed.declarations === 'object' && parsed.declarations !== null && !Array.isArray(parsed.declarations)
        ? parsed.declarations
        : {},
      autofill: parsed.autofill !== false,
      takeover: parsed.takeover !== false,
      hidden: typeof parsed.hidden === 'object' && parsed.hidden !== null && !Array.isArray(parsed.hidden)
        ? parsed.hidden
        : {},
    }
  } catch {
    return emptyState()
  }
}

/** Write the document atomically. Returns true on success, false on refusal. */
export function writeState(home, state) {
  const file = statePath(home)
  try {
    mkdirSync(dirname(file), { recursive: true })
    const tmp = file + '.tmp'
    writeFileSync(tmp, JSON.stringify({ version: VERSION, ...state }, null, 2), 'utf8')
    renameSync(tmp, file)
    return true
  } catch {
    return false
  }
}

/**
 * The store the host half talks to: a tiny read-through cache in front of the
 * document. Every mutation writes the whole document — the payload is a few
 * hundred bytes and mutations are user-driven, so this is simpler and safer
 * than a partial-update scheme.
 */
export function createStore(home) {
  let cached = readState(home)
  return {
    path: statePath(home),
    read() { return cached },
    /** Merge a patch into the document and persist it. */
    update(patch) {
      cached = { ...cached, ...patch }
      const ok = writeState(home, cached)
      return { state: cached, persisted: ok }
    },
    /** Re-read from disk (used by tests and by a future watch). */
    reload() { cached = readState(home); return cached },
  }
}
