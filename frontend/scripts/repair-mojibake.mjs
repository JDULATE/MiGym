// Mojibake repair for locale packs: values that were written as UTF-8 but read back
// as Latin-1 (Ã©, Â°, �…) get decoded once. Also fixes the known 'A?Encantado' class.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

const fix = v => {
  if (typeof v !== 'string') return v
  if (!/[\u00C3\u00C2\u00C1\u00C9\u00CD\u00D3\u00DA\u00FF]/.test(v) && !v.includes('\uFFFD')) return v
  try {
    const repaired = Buffer.from(v, 'latin1').toString('utf8')
    // only accept if it removed the tell-tale sequences and didn't add replacement chars
    if (!/[\u00C3\u00C2]/.test(repaired) && !repaired.includes('\uFFFD')) return repaired
  } catch { /* fall through to regex cleanup */ }
  // last resort: strip stray control/garbage chars around capital + vowel pattern
  return v.replace(/\u00C2?\u00BF?/g, '').replace(/([AEIOU])\uFFFD?/g, '$1')
}

let fixed = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const fp = path.join(dir, f)
  let src = fs.readFileSync(fp, 'utf8')
  const out = src.replace(/(['"])(.*?)\1: (['"])(.*?)\3/g, (full, q1, key, q2, val) => {
    const nv = fix(val)
    if (nv === val) return full
    fixed++
    return `${q1}${key}${q1}: ${q2}${nv}${q2}`
  })
  fs.writeFileSync(fp, out)
}
console.log('values repaired:', fixed)
