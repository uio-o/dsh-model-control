// Editing the profile patch layer, as text.
//
// The patch is a top-level YAML array of loader entries. Disabling a shipped
// entry is a one-line change (`- id: <entry>` + `disabled: true`), and the
// profile layer is applied AFTER every bundle layer, so a row written here
// overrides whatever a bundle decided.
//
// This is deliberately a text edit rather than a YAML round-trip: the file is
// hand-edited, carries explanatory comments, and `!!js` tags that no plain
// parser would survive. Every function is pure, so the rules are testable
// without touching a real profile.

/** Lines that start a new top-level patch entry. */
const ROW_START = /^-(\s|$)/

/**
 * Locate one top-level row by its `id`.
 * @returns `{ start, end }` line indices (end exclusive), or undefined.
 */
export function findRow(text, id) {
  const lines = text.split('\n')
  const target = `- id: ${id}`
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!ROW_START.test(line)) continue
    if (line.trimEnd() !== target && !line.startsWith(target + ' ')) continue
    let end = index + 1
    while (end < lines.length && !ROW_START.test(lines[end])) end += 1
    return { start: index, end }
  }
  return undefined
}

/** The row's own lines, for inspection. */
export function readRow(text, id) {
  const range = findRow(text, id)
  if (range === undefined) return undefined
  return text.split('\n').slice(range.start, range.end).join('\n')
}

/** What the row currently says about `disabled`. */
export function rowDisabled(text, id) {
  const row = readRow(text, id)
  if (row === undefined) return undefined
  const match = /^\s+disabled:\s*(\S+)\s*$/m.exec(row)
  if (match === null) return false
  return match[1] === 'true'
}

/**
 * Set `disabled` on a row, inserting the field when the row does not have one.
 * @returns `{ text, changed }`.
 */
export function setRowDisabled(text, id, disabled) {
  const range = findRow(text, id)
  if (range === undefined) {
    // No row yet: append one. A patch entry needs nothing but its id and the
    // field being overridden.
    const trimmed = text.replace(/\s*$/, '')
    const lines = trimmed === '' ? [] : trimmed.split('\n')
    lines.push(`- id: ${id}`, `  disabled: ${disabled ? 'true' : 'false'}`)
    return { text: lines.join('\n') + '\n', changed: true }
  }
  const lines = text.split('\n')
  const row = lines.slice(range.start, range.end)
  const existing = row.findIndex((line) => /^\s+disabled:/.test(line))
  const replacement = `  disabled: ${disabled ? 'true' : 'false'}`
  if (existing >= 0) {
    const indent = /^(\s*)/.exec(row[existing])[1]
    const next = indent + `disabled: ${disabled ? 'true' : 'false'}`
    if (row[existing] === next) return { text, changed: false }
    row[existing] = next
  } else {
    // Insert directly after the id line, which is where a hand-written row
    // puts it too.
    row.splice(1, 0, replacement)
  }
  lines.splice(range.start, range.end - range.start, ...row)
  return { text: lines.join('\n'), changed: true }
}

/**
 * Delete a row entirely. Used to hand control back to whatever the bundle layer
 * decided — the profile layer only has to override when it disagrees.
 * @returns `{ text, changed }`.
 */
export function removeRow(text, id) {
  const range = findRow(text, id)
  if (range === undefined) return { text, changed: false }
  const lines = text.split('\n')
  lines.splice(range.start, range.end - range.start)
  return { text: lines.join('\n'), changed: true }
}

/**
 * A structural sanity check that never parses YAML: the result must keep the
 * original preamble, stay an array of top-level entries, and differ from the
 * original by at most one entry.
 */
export function looksLikePatch(original, next) {
  if (typeof next !== 'string' || next.trim() === '') return false
  const countRows = (value) => value.split('\n').filter((line) => ROW_START.test(line)).length
  const before = countRows(original)
  const after = countRows(next)
  if (Math.abs(after - before) > 1) return false
  if (after === 0) return false
  const tabs = next.split('\n').filter((line) => line.includes('\t'))
  return tabs.length === 0
}
