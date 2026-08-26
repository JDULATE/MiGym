// dedupe 'Protein' key: keep first occurrence per pack
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue
  const fp = path.join(dir, f)
  const lines = fs.readFileSync(fp, 'utf8').split('\n')
  const seen = new Set()
  const out = []
  let dropped = 0
  for (const ln of lines) {
    const m = ln.match(/^\s*(['"])Protein\1\s*:/)
    if (m) {
      if (seen.has('Protein')) { dropped++; continue }
      seen.add('Protein')
    }
    out.push(ln)
  }
  if (dropped) { fs.writeFileSync(fp, out.join('\n')); console.log(f, '-' + dropped) }
}
console.log('done')
