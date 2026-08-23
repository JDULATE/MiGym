// One-off: isolates the sync & backup ternary for parsing.
import fs from 'node:fs'
import { parse } from 'espree'
const lines = fs.readFileSync('src/views/Settings.jsx', 'utf8').split('\n')
// expression container spans source lines 135..159
let expr = lines.slice(134, 159).join('\n')
expr = expr.replace(/^\{/, '(').replace(/\}\s*$/, ')')
try {
  parse(expr, { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } })
  console.log('ternary alone: OK')
} catch (e) {
  console.log('ternary alone: FAIL @rel' + e.lineNumber, e.message.slice(0, 60))
  const el = expr.split('\n')
  for (let n = Math.max(1, e.lineNumber - 2); n <= Math.min(el.length, e.lineNumber + 1); n++) console.log(n + ': ' + el[n-1])
}
