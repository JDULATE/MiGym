// One-off: reports the first line where brace depth incorrectly returns to zero.
import fs from 'node:fs'
const f = process.argv[2]
const src = fs.readFileSync(f, 'utf8')
let line = 1, str = null, block = false, commentLine = false
const stack = []
for (let i = 0; i < src.length; i++) {
  const c = src[i], n = src[i + 1]
  if (c === '\n') { line++; continue }
  if (str === "'") { if (c === '\\') { i++; continue } if (c === "'") str = null; continue }
  if (str === '"') { if (c === '\\') { i++; continue } if (c === '"') str = null; continue }
  if (str === '`') { if (c === '\\') { i++ } ; if (c === '`') str = null; continue }
  if (c === "'" || c === '"' || c === '`') { str = c; continue }
  if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue }
  if (c === '/' && n === '*') { block = true; i++; continue }
  if (block) { if (c === '*' && n === '/') { block = false; i++ } continue }
  if (str) continue
  if (c === '{') stack.push({ ch: '{', line })
  else if (c === '}') {
    const t = stack.pop()
    if (!t) console.log('EXTRA } at line', line)
    if (!stack.length && t) console.log('module-level close of', t.ch, 'at line', line)
    if (t) continue
  }
  else if (c === '(' || c === '[') stack.push({ ch: c, line })
  else if (c === ')' || c === ']') stack.pop()
}
console.log('EOF unclosed:', JSON.stringify(stack.map(s => s.ch + '@' + s.line)))
