// Repair: tour bodies use CURLY apostrophes in source; earlier fill added STRAIGHT-
// variant keys that never match. Remove straight-variant garbage, insert curly keys
// with real translations.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const CURL = '\u2019'

const CURLY_KEYS = [
  `Today${CURL}s workout and a quick look at your progress live here.`,
  `When you${CURL}re ready, this button starts today${CURL}s session.`,
  `During a session you${CURL}ll see the exercise here, with your previous performance right under it.`,
  `Weight, reps and optional effort per set - tick a row once you${CURL}re done.`,
]

const TR = {
  es: [
    'El entreno de hoy y un vistazo rápido a tu progreso viven aquí.',
    'Cuando estés listo, este botón inicia la sesión de hoy.',
    'Durante la sesión verás aquí el ejercicio, con tu rendimiento anterior justo debajo.',
    'Peso, repeticiones y esfuerzo opcional por serie — marca la fila al terminar.',
  ],
  pt: [
    'O treino de hoje e um resumo do seu progresso vivem aqui.',
    'Quando estiver pronto, este botão inicia a sessão de hoje.',
    'Durante a sessão você verá o exercício aqui, com seu desempenho anterior logo abaixo.',
    'Peso, repetições e esforço opcional por série — marque a linha ao terminar.',
  ],
  fr: [
    'La séance du jour et un aperçu de tes progrès sont ici.',
    'Quand tu es prêt, ce bouton lance la séance du jour.',
    'Pendant la séance, l’exercice s’affiche ici avec ta performance précédente juste en dessous.',
    'Poids, répétitions et effort optionnel par série — coche la ligne une fois terminée.',
  ],
  de: [
    'Das heutige Workout und ein Blick auf deinen Fortschritt sind hier.',
    'Wenn du bereit bist, startet dieser Knopf die heutige Sitzung.',
    'Während der Sitzung siehst du die Übung hier, deine letzte Leistung direkt darunter.',
    'Gewicht, Wiederholungen und optionale Anstrengung pro Satz — Haken setzen, wenn fertig.',
  ],
  it: [
    "L'allenamento di oggi e uno sguardo ai tuoi progressi sono qui.",
    'Quando sei pronto, questo pulsante avvia la sessione di oggi.',
    'Durante la sessione vedrai l’esercizio qui, con la tua performance precedente subito sotto.',
    'Peso, ripetizioni e sforzo opzionale per serie — spunta la riga quando finisci.',
  ],
  ru: [
    'Тренировка на сегодня и обзор прогресса — здесь.',
    'Когда будешь готов, эта кнопка начнёт сегодняшнюю тренировку.',
    'Во время сессии упражнение появится здесь, а прошлая результативность — сразу под ним.',
    'Вес, повторения и опциональное усилие на подход — отметь строку, когда закончишь.',
  ],
  tr: [
    'Bugünün antrenmanı ve ilerleme özetin burada.',
    'Hazır olduğunda bu düğme bugünün antrenmanını başlatır.',
    'Seans sırasında egzersizi burada, önceki performansını hemen altında görürsün.',
    'Set başına ağırlık, tekrar ve isteğe bağlı efor — bitirince satırı işaretle.',
  ],
  pl: [
    'Dzisiejszy trening i szybki podgląd postępów są tutaj.',
    'Gdy będziesz gotowy, ten przycisk rozpocznie dzisiejszą sesję.',
    'Podczas sesji zobaczysz ćwiczenie tutaj, a wcześniejsze wyniki tuż pod nim.',
    'Ciężar, powtórzenia i opcjonalny wysiłek na serię — zaznacz wiersz po skończeniu.',
  ],
  ko: [
    '오늘의 운동과 진행 상황이 여기에 표시됩니다.',
    '준비되면 이 버튼으로 오늘 세션을 시작합니다.',
    '세션 중에는 여기에 운동이 표시되고 바로 아래에 이전 기록이 보입니다.',
    '세트마다 무게, 반복, 선택적 강도 — 끝나면 행을 체크하세요.',
  ],
  zh: [
    '今日训练和进度概览都在这里。',
    '准备好后，此按钮开始今天的训练。',
    '训练时这里会显示动作，下方是你的过往表现。',
    '每组记录重量、次数和可选强度——完成后勾选该行。',
  ],
  hi: [
    'आज की वर्कआउट और प्रगति का सारांश यहाँ है।',
    'तैयार होने पर यह बटन आज का सेशन शुरू करता है।',
    'सेशन के दौरान यहाँ व्यायाम दिखेगा, और उसके ठीक नीचे आपका पिछला प्रदर्शन।',
    'प्रति सेट वज़न, रेप्स और वैकल्पिक प्रयास — पूरा होने पर पंक्ति चिह्नित करें।',
  ],
}

const STRAIGHT_PREFIXES = CURLY_KEYS.map(k =>
  k.replaceAll(CURL, "'").slice(0, 30))

let fixed = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const lang = f.replace('.js', '')
  const fp = path.join(dir, f)
  let lines = fs.readFileSync(fp, 'utf8').split('\n')
  // 1) drop straight-apostrophe garbage lines
  lines = lines.filter(ln => !STRAIGHT_PREFIXES.some(p => ln.includes('"' + p)))
  let src = lines.join('\n')
  const add = []
  CURLY_KEYS.forEach((key, i) => {
    if (!(lang in TR)) return
    if (src.includes("'" + key + "'") || src.includes('"' + key + '"')) return
    add.push('  ' + JSON.stringify(key) + ': ' + JSON.stringify(TR[lang][i]) + ',')
  })
  if (add.length) {
    const close = src.lastIndexOf('}')
    src = src.slice(0, close) + add.join('\n') + '\n' + src.slice(close)
    fixed++
  }
  fs.writeFileSync(fp, src)
}
console.log('packs touched:', fixed)
