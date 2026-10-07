// Model-selection logic for dsh-model-control.
//
// "Model selection" is additive: an endpoint advertises models, and the user
// picks which ones join this harness. The pick is not a separate hidden list —
// it IS the provider's configured `models` array in the `llm-pi-ai` document,
// so an unselected model simply does not exist for any surface (the composer
// picker, the `/model` popup, or another plugin reading the catalog).
//
// Pure functions only, so the merge rules are unit-testable without a host.

/**
 * Convert one discovered endpoint model into the configured-model shape.
 * `LlmDiscoveredModel` → the fields the adapter's config accepts. Absent
 * fields are omitted rather than written as undefined, so a hand-edited config
 * is not littered with nulls.
 */
export function modelFromDiscovered(discovered) {
  const out = { id: discovered.id }
  if (discovered.name !== undefined) out.name = discovered.name
  if (discovered.contextWindow !== undefined) out.contextWindow = discovered.contextWindow
  if (discovered.maxTokens !== undefined) out.maxTokens = discovered.maxTokens
  if (Array.isArray(discovered.inputModalities) && discovered.inputModalities.length > 0) {
    out.input = [...discovered.inputModalities]
  }
  return out
}

/**
 * Build the next configured-model array from a selection.
 *
 * Rules, in order:
 *   1. Every id already configured AND still selected is kept **verbatim** —
 *      hand-edited fields (`reasoningEfforts`, `input`, retry overrides, …)
 *      survive untouched, and the original order is preserved.
 *   2. Newly selected ids are appended in the caller's order, materialised from
 *      the discovered metadata; an id with no metadata still lands as `{ id }`
 *      so a manual entry is never silently dropped.
 *   3. Unselected ids disappear — that is the whole mechanism.
 *
 * @param existing - the provider's current `models` array (may be undefined).
 * @param discovered - endpoint metadata for candidate models.
 * @param selectedIds - the ids the user kept, in display order.
 */
export function buildSelection(existing, discovered, selectedIds) {
  const existingList = Array.isArray(existing) ? existing.filter((m) => m !== null && typeof m === 'object') : []
  const discoveredList = Array.isArray(discovered) ? discovered.filter((m) => m !== null && typeof m === 'object') : []

  const existingById = new Map()
  for (const model of existingList) {
    if (typeof model.id === 'string') existingById.set(model.id, model)
  }
  const discoveredById = new Map()
  for (const model of discoveredList) {
    if (typeof model.id === 'string') discoveredById.set(model.id, model)
  }

  const wanted = []
  const seen = new Set()
  for (const id of Array.isArray(selectedIds) ? selectedIds : []) {
    if (typeof id !== 'string' || id === '' || seen.has(id)) continue
    seen.add(id)
    wanted.push(id)
  }
  const wantedSet = new Set(wanted)

  const out = []
  // 1. Existing entries stay first, in their own order, untouched.
  for (const model of existingList) {
    if (typeof model.id === 'string' && wantedSet.has(model.id)) out.push(model)
  }
  // 2. Newly selected ids are appended.
  for (const id of wanted) {
    if (existingById.has(id)) continue
    const found = discoveredById.get(id)
    out.push(found === undefined ? { id } : modelFromDiscovered(found))
  }
  return out
}

/**
 * Summarise what a selection changes, for the UI and for the response body.
 * @returns `{ added, removed, kept }` — id arrays.
 */
export function diffSelection(existing, selectedIds) {
  const before = new Set(
    (Array.isArray(existing) ? existing : [])
      .filter((model) => model !== null && typeof model === 'object' && typeof model.id === 'string')
      .map((model) => model.id),
  )
  const after = new Set(
    (Array.isArray(selectedIds) ? selectedIds : []).filter((id) => typeof id === 'string' && id !== ''),
  )
  return {
    added: [...after].filter((id) => !before.has(id)),
    removed: [...before].filter((id) => !after.has(id)),
    kept: [...after].filter((id) => before.has(id)),
  }
}
