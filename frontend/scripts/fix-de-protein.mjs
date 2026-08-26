// de.js parity: 'Protein' is the same word in German — insert verbatim.
import fs from 'node:fs'
const p = new URL('../src/locales/de.js', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
let s = fs.readFileSync(p, 'utf8')
if (s.includes("'Protein':")) { console.log('already present'); process.exit(0) }
const close = s.lastIndexOf('}')
s = s.slice(0, close) + "  'Protein': 'Protein',\n" + s.slice(close)
fs.writeFileSync(p, s)
console.log('de.js +Protein')
