// One-off diagnostic: JSX element-balance scanner for Settings.jsx.
// Strips {} expression contents and strings, then tracks the open-element stack so the
// first mismatch points at the real culprit (parse errors can report far from cause).
import fs from 'node:fs'
const src = fs.readFileSync('src/views/Settings.jsx', 'utf8')
const lines = src.split('\n')

// strip {…} expressions (nested) and "…" / '…' strings per line — crude but enough for tags
function strip(line) {
  let out = ''
  let depth = 0, str = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (str) { if (c === str) str = null; continue }
    if (c === '{') { depth++; out += ' '; continue }
    if (c === '}') { depth--; out += ' '; continue }
    if (depth > 0) { out += ' '; continue }
    if (c === '"' || c === "'") { str = c; out += ' '; continue }
    out += c
  }
  return out
}

const stack = []
for (let i = 0; i < lines.length; i++) {
  const clean = strip(lines[i])
  const tags = [...clean.matchAll(/<(\/?)([A-Za-z][\w.]*)([^>]*?)(\/?)>/g)]
  for (const m of tags) {
    const [, close, name, , selfClose] = m
    if (selfClose === '/') continue
    if (!close) stack.push({ name, line: i + 1 })
    else {
      // find matching opener
      let k = stack.length - 1
      while (k >= 0 && stack[k].name !== name) k--
      if (k === -1) console.log(`line ${i + 1}: closing </${name}> has no opener`)
      else stack.splice(k, 1)
    }
  }
}
if (stack.length) for (const s of stack) console.log(`UNCLOSED <${s.name}> from line ${s.line}`)
else console.log('all elements balanced')
