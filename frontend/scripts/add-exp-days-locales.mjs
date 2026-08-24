import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const T = {
  'What’s your experience level?': ['Wie erfahren bist du?', '¿Cuál es tu nivel de experiencia?', 'Quel est ton niveau d’expérience ?', 'Qual è il tuo livello di esperienza?', 'Qual é o teu nível de experiência?', 'Jaki jest Twój poziom doświadczenia?', 'Deneyim seviyen nedir?', 'Каков твой уровень подготовки?', '你的经验水平如何？', '경험 수준은 어떻게 되나요?', 'आपका अनुभव स्तर क्या है?'],
  'How many days per week can you train?': ['An wie vielen Tagen pro Woche kannst du trainieren?', '¿Cuántos días por semana puedes entrenar?', 'Combien de jours par semaine peux-tu t’entraîner ?', 'Quanti giorni a settimana puoi allenarti?', 'Quantos dias por semana podes treinar?', 'Ile dni w tygodniu możesz trenować?', 'Haftada kaç gün antrenman yapabilirsin?', 'Сколько дней в неделю ты можешь тренироваться?', '你每周能训练几天？', '일주일에 며칠 훈련할 수 있나요?', 'आप सप्ताह में कितने दिन प्रशिक्षण ले सकते हैं?'],
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
