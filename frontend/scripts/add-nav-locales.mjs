import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const T = {
  Continue: ['Weiter', 'Continuar', 'Continuer', 'Avanti', 'Continuar', 'Dalej', 'Devam', 'Продолжить', '继续', '계속', 'जारी रखें'],
  Back: ['Zurück', 'Atrás', 'Retour', 'Indietro', 'Voltar', 'Wstecz', 'Geri', 'Назад', '返回', '뒤로', 'वापस'],
  Skip: ['Überspringen', 'Omitir', 'Passer', 'Salta', 'Omitir', 'Pomiń', 'Atla', 'Пропустить', '跳过', '건너뛰기', 'छोड़ें'],
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
