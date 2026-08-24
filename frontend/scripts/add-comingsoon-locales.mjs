import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const T = {
  'Coming soon': ['Demnächst', 'Próximamente', 'Bientôt', 'In arrivo', 'Em breve', 'Wkrótce', 'Yakında', 'Скоро', '即将推出', '곧 출시 예정', 'जल्द आ रहा है'],
  'Adaptive training': ['Adaptives Training', 'Entrenamiento adaptado', 'Entraînement adapté', 'Allenamento adattato', 'Treino adaptado', 'Trening dostosowany', 'Uyarlanabilir antrenman', 'Адаптивные тренировки', '适应性训练', '맞춤형 훈련', 'अनुकूलित प्रशिक्षण'],
  'Adapted programs for conditions like diabetes, heart problems or back pain.': ['Angepasste Programme bei Diabetes, Herzproblemen oder Rückenschmerzen.', 'Programas adaptados para condiciones como diabetes, problemas cardíacos o dolor de espalda.', 'Programmes adaptés pour le diabète, les problèmes cardiaques ou le mal de dos.', 'Programmi adattati per condizioni come diabete, problemi cardiaci o mal di schiena.', 'Programas adaptados para condições como diabetes, problemas cardíacos ou dores nas costas.', 'Programy dostosowane dla osób z cukrzycą, problemami sercowymi czy bólem pleców.', 'Diyabet, kalp sorunları veya sırt ağrısı gibi durumlar için uyarlanmış programlar.', 'Адаптированные программы при диабете, сердечных проблемах или боли в спине.', '针对糖尿病、心脏问题或腰痛等状况的适应性训练计划。', '당뇨병, 심장 문제, 허리 통증 등을 위한 맞춤 프로그램.', 'मधुमेह, हृदय समस्याओं या पीठ दर्द जैसी स्थितियों के लिए अनुकूलित कार्यक्रम।'],
  'Strength ranking': ['Kraftrangliste', 'Ranking de fuerza', 'Classement de force', 'Classifica di forza', 'Ranking de força', 'Ranking siły', 'Güç sıralaması', 'Рейтинг силы', '力量排名', '근력 랭킹', 'ताकत रैंकिंग'],
  'Rank your lifts from Bronze to Hero and see how you compare.': ['Ordne deine Lifts von Bronze bis Hero ein und vergleiche dich mit anderen.', 'Clasifica tus levantamientos de Bronce a Hero y compárate.', 'Classe tes exercices de Bronze à Héros et compare-toi.', 'Classifica i tuoi sollevamenti da Bronzo a Eroe e confrontati.', 'Classifica os teus levantamentos de Bronze a Heroi e compara-te.', 'Oceń swoje podnoszenie od Brązu do Herosa i porównaj się z innymi.', 'Kaldırmalarınızı Bronz ile Hero arasında sıralayın ve karşılaştırın.', 'Оцени свои подъёмы от Бронзы до Героя и сравни себя с другими.', '将你的举重从青铜排到英雄，看看你的水平。', '당신의 리프트를 브론즈부터 히어로까지 랭킹을 매겨 비교해 보세요.', 'अपने लिफ्ट को कांसे से हीरो तक रैंक करें और तुलना देखें।'],
  'What language do you prefer?': ['Welche Sprache bevorzugst du?', '¿Qué idioma prefieres?', 'Quelle langue préfères-tu ?', 'Quale lingua preferisci?', 'Que idioma preferes?', 'Jaki język preferujesz?', 'Hangi dili tercih edersin?', 'Какой язык ты предпочитаешь?', '你偏好什么语言？', '어떤 언어를 선호하시나요?', 'आप कौन सी भाषा पसंद करते हैं?'],
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
