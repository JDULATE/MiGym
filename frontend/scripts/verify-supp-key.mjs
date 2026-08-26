// verify exact stored value for the supps question across packs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const KEY = 'Do you take any supplements?'
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const src = fs.readFileSync(path.join(dir, f), 'utf8')
  const re = new RegExp('["\\' + "']" + KEY.replace('?', '\\?') + '["\\' + "']" + '\\s*:\\s*["\\' + "']([^" + '"' + "'" + ']*)')
  const m = re.exec(src)
  console.log(f.padEnd(7), JSON.stringify(m ? m[1] : 'KEY MISSING'))
}
