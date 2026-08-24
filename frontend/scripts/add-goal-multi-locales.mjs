import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const T = {
  'What are your goals? Pick as many as you like.': ['Was sind deine Ziele? Wähle so viele du magst.', '¿Cuáles son tus objetivos? Elige tantos como quieras.', 'Quels sont tes objectifs ? Choisis-en autant que tu veux.', 'Quali sono i tuoi obiettivi? Scegline quanti ne vuoi.', 'Quais são os teus objetivos? Escolhe quantos quiseres.', 'Jakie są Twoje cele? Wybierz tyle, ile chcesz.', 'Hedeflerin neler? İstediğin kadar seç.', 'Каковы твои цели? Выбирай столько, сколько хочешь.', '你的目标是什么？想选几个就选几个。', '당신의 목표는 무엇인가요? 원하는 만큼 선택하세요.', '¿Cuáles son tus metas? Elige tantas como quieras.'],
}
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
for (const lang of LANGS) {
  const p = new URL(lang + '.js', DIR)
  const src = fs.readFileSync(p, 'utf8')
  const close = src.lastIndexOf('}')
  const existing = new Set()
  let m
  const re = /^\s*'((?:[^'\\]|\\.)*)'\s*:/gm
  while ((m = re.exec(src))) existing.add(m[1].replace(/\\'/g, "'"))
  const entries = []
  for (const [k, vals] of Object.entries(T)) if (!existing.has(k)) entries.push('  ' + q(k) + ': ' + q(vals[LANGS.indexOf(lang)]) + ',')
  if (!entries.length) { console.log(lang + ': none'); continue }
  let pre = src.slice(0, close).replace(/\s+$/, '')
  if (!pre.endsWith(',')) pre += ','
  fs.writeFileSync(p, pre + '\n' + entries.join('\n') + '\n' + src.slice(close))
  console.log(lang + ': +' + entries.length)
}
