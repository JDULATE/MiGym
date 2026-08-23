import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const T = {
  Tutorial: ['Tutorial', 'Tutorial', 'Tutoriel', 'Tutorial', 'Tutorial', 'Samouczek', 'Öğretici', 'Обучение', '新手教程', '튜토리얼', 'ट्यूटोरियल'],
  'Giwi walks you through the app step by step. Your data is untouched.': ['Giwi führt dich Schritt für Schritt durch die App. Deine Daten bleiben unberührt.', 'Giwi te guía por la app paso a paso. Tus datos no se tocan.', 'Giwi te guide pas à pas dans l’app. Tes données restent intactes.', 'Giwi ti guida passo passo nell’app. I tuoi dati non vengono modificati.', 'Giwi guia-te pela app passo a passo. Os teus dados ficam intactos.', 'Giwi przeprowadzi cię krok po kroku przez aplikację. Twoje dane pozostają nietknięte.', 'Giwi sizi adım adım uygulama içinde gezdirir. Verilerinize dokunulmaz.', 'Дживи проведёт вас по приложению шаг за шагом. Ваши данные не затрагиваются.', 'Giwi 会一步步引导你使用应用。你的数据不会被改动。', 'Giwi가 앱을 단계별로 안내합니다. 데이터는 변경되지 않습니다.', 'Giwi आपको चरण दर चरण ऐप में मार्गदर्शन करता है। आपका डेटा सुरक्षित रहता है।'],
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
