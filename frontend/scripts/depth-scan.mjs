// One-off: tracks JSX-region brace depth line by line to find an unclosed { before 164.
import fs from 'node:fs'
const lines = fs.readFileSync('src/views/Settings.jsx', 'utf8').split('\n')
let bal = 0
for (let i = 78; i <= 165; i++) {
  const l = lines[i - 1]
  let inS = null
  for (const ch of l) {
    if (inS) { if (ch === inS) inS = null; continue }
    if (ch === "'" || ch === '"') { inS = ch; continue }
    if (ch === '{') bal++
    if (ch === '}') bal--
  }
  if (bal !== 0) console.log(i + ': depth ' + bal + ' | ' + l.slice(0, 100))
}
console.log('final:', bal)
