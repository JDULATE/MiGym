// One-off: removes duplicate keys from locale packs.
// Runtime semantics = last definition wins, so we keep only each key's LAST occurrence.
import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const KEY = /^(\s*)'((?:[^'\\]|\\.)*)'\s*:/

for (const lang of fs.readdirSync(DIR)) {
  const p = new URL(lang, DIR)
  const lines = fs.readFileSync(p, 'utf8').split('\n')

  // last line index per key
  const lastIdx = new Map()
  lines.forEach((l, i) => {
    const m = l.match(KEY)
    if (m) lastIdx.set(m[2].replace(/\\'/g, "'"), i)
  })

  // keep: non-key lines, plus exactly the final occurrence of every key
  const keptKeyLines = new Set(lastIdx.values())
  const out = lines.filter((l, i) => {
    const m = l.match(KEY)
    if (!m) return true
    return keptKeyLines.has(i)
  })

  if (out.length !== lines.length) {
    fs.writeFileSync(p, out.join('\n'))
    console.log(lang + ': removed ' + (lines.length - out.length) + ' lines')
  } else {
    console.log(lang + ': clean')
  }
}
