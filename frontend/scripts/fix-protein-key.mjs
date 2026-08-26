// ensure the 'Protein' key exists in every pack (parity repair)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const TR = {
  es: 'Proteína', pt: 'Proteína', fr: 'Protéine', it: 'Proteina', ru: 'Протеин',
  tr: 'Protein', pl: 'Białko', ko: '단백질', zh: '蛋白质', hi: 'प्रोटीन',
}
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const lang = f.replace('.js', '')
  const fp = path.join(dir, f)
  let src = fs.readFileSync(fp, 'utf8')
  if (src.includes("'" + 'Protein' + "'")) continue
  if (!(lang in TR)) continue
  const close = src.lastIndexOf('}')
  src = src.slice(0, close) + "  'Protein': '" + TR[lang] + "',\n" + src.slice(close)
  fs.writeFileSync(fp, src)
  console.log(f, '+Protein')
}
console.log('done')
