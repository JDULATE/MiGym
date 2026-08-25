// One-off diagnostic: brace/paren/string balance scanner for a single file.
import fs from 'node:fs'
const f = process.argv[2]
const src = fs.readFileSync(f, 'utf8')
const stack = []
let str = null, tplDepth = 0, line = 1, prev = ''
for (let i = 0; i < src.length; i++) {
  const c = src[i], n = src[i + 1]
  if (c === '\n') line++
  if (str === 'line') { if (c === '\n') str = null; continue }
  if (str) {
    if (c === '\\') { i++; continue }
    if (tplDepth > 0 && c === '}') {
      // could be ${ ... } end — track naively
    }
    if (c === str) str = null
    continue
  }
  if (c === '"' || c === "'") { str = c; continue }
  if (str === 'block') { if (c === '*' && n === '/') { str = null; i++ } continue }
  if (c === '/' && n === '*') { str = 'block'; i++; continue }
  if (c === '/' && n === '/') { str = 'line'; continue }
  if (c === '{') stack.push({ ch: '{', line })
  if (c === '}') { const t = stack.pop(); if (!t || t.ch !== '{') console.log('MISMATCH } at line', line) }
  if (c === '(') stack.push({ ch: '(', line })
  if (c === ')') { const t = stack.pop(); if (!t || t.ch !== '(') console.log('MISMATCH ) at line', line) }
  if (c === '[') stack.push({ ch: '[', line })
  if (c === ']') { const t = stack.pop(); if (!t || t.ch !== '[') console.log('MISMATCH ] at line', line) }
  prev = c
}
console.log('unclosed at EOF:')
for (const t of stack) console.log(' ', t.ch, 'from line', t.line)
if (!stack.length) console.log('  none — braces balanced')
