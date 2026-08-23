// One-off: prints the open-element/brace stack upon reaching a target line.
import fs from 'node:fs'
const f = process.argv[2]
const targetLine = Number(process.argv[3])
const src = fs.readFileSync(f, 'utf8')
const stack = []
let str = null, block = false, line = 1
for (let i = 0; i < src.length && line <= targetLine; i++) {
  const c = src[i], n = src[i + 1]
  if (c === '\n') { line++; continue }
  if (block) { if (c === '*' && n === '/') { block = false; i++ } continue }
  if (str === "'") { if (c === '\\') i++; if (c === "'" ) str = null; continue }
  if (str === '"') { if (c === '\\') i++; if (c === '"') str = null; continue }
  if (c === '/' && n === '/') break
  if (c === '/' && n === '*') { block = true; i++; continue }
  if (str) { if (c === '\\') i++; continue }
  if (c === "'" || c === '"') { str = c; continue }
  if (c === '{' || c === '(' || c === '[') stack.push({ ch: c, line })
  if (c === '}' || c === ')' || c === ']') {
    const pairs = { '}': '{', ')': '(', ']': '[' }
    const t = stack.pop()
    if (!t || t.ch !== pairs[c]) console.log('MISMATCH at line', line, c)
  }
}
console.log('open stack at line', targetLine, ':')
for (const s of stack) console.log(' ', s.ch, '@line', s.line)
