// fill missing tour/supplements strings ×11
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

const T = {
  "Today's workout and a quick look at your progress live here.": {
    es: "El entreno de hoy y un vistazo rápido a tu progreso viven aquí.",
    pt: "O treino de hoje e um resumo do seu progresso vivem aqui.",
    fr: "La séance du jour et un aperçu de tes progrès sont ici.",
    de: "Das heutige Workout und ein Blick auf deinen Fortschritt sind hier.",
    it: "L'allenamento di oggi e uno sguardo ai tuoi progressi sono qui.",
    ru: "Тренировка на сегодня и обзор прогресса — здесь.",
    tr: "Bugünün antrenmanı ve ilerleme özetin burada.",
    pl: "Dzisiejszy trening i szybki podgląd postępów są tutaj.",
    ko: "오늘의 운동과 진행 상황이 여기에 표시됩니다.",
    zh: "今日训练和进度概览都在这里。",
    hi: "आज की वर्कआउट और प्रगति का सारांश यहाँ है।",
  },
  "When you're ready, this button starts today's session.": {
    es: "Cuando estés listo, este botón inicia la sesión de hoy.",
    pt: "Quando estiver pronto, este botão inicia a sessão de hoje.",
    fr: "Quand tu es prêt, ce bouton lance la séance du jour.",
    de: "Wenn du bereit bist, startet dieser Knopf die heutige Sitzung.",
    it: "Quando sei pronto, questo pulsante avvia la sessione di oggi.",
    ru: "Когда будешь готов, эта кнопка начнёт сегодняшнюю тренировку.",
    tr: "Hazır olduğunda bu düğme bugünün antrenmanını başlatır.",
    pl: "Gdy będziesz gotowy, ten przycisk rozpocznie dzisiejszą sesję.",
    ko: "준비되면 이 버튼으로 오늘 세션을 시작합니다.",
    zh: "准备好后，此按钮开始今天的训练。",
    hi: "तैयार होने पर यह बटन आज का सेशन शुरू करता है।",
  },
  "During a session you'll see the exercise here, with your previous performance right under it.": {
    es: "Durante la sesión verás aquí el ejercicio, con tu rendimiento anterior justo debajo.",
    pt: "Durante a sessão você verá o exercício aqui, com seu desempenho anterior logo abaixo.",
    fr: "Pendant la séance, l'exercice s'affiche ici avec ta performance précédente juste en dessous.",
    de: "Während der Sitzung siehst du die Übung hier, deine letzte Leistung direkt darunter.",
    it: "Durante la sessione vedrai l'esercizio qui, con la tua performance precedente subito sotto.",
    ru: "Во время сессии упражнение появится здесь, а прошлая результативность — сразу под ним.",
    tr: "Seans sırasında egzersizi burada, önceki performansını hemen altında görürsün.",
    pl: "Podczas sesji zobaczysz ćwiczenie tutaj, a wcześniejsze wyniki tuż pod nim.",
    ko: "세션 중에는 여기에 운동이 표시되고 바로 아래에 이전 기록이 보입니다.",
    zh: "训练时这里会显示动作，下方是你的过往表现。",
    hi: "सेशन के दौरान यहाँ व्यायाम दिखेगा, और उसके ठीक नीचे आपका पिछला प्रदर्शन।",
  },
  "Weight, reps and optional effort per set - tick a row once you're done.": {
    es: "Peso, repeticiones y esfuerzo opcional por serie — marca la fila al terminar.",
    pt: "Peso, repetições e esforço opcional por série — marque a linha ao terminar.",
    fr: "Poids, répétitions et effort optionnel par série — coche la ligne une fois terminée.",
    de: "Gewicht, Wiederholungen und optionale Anstrengung pro Satz — Haken setzen, wenn fertig.",
    it: "Peso, ripetizioni e sforzo opzionale per serie — spunta la riga quando finisci.",
    ru: "Вес, повторения и опциональное усилие на подход — отметь строку, когда закончишь.",
    tr: "Set başına ağırlık, tekrar ve isteğe bağlı efor — bitirince satırı işaretle.",
    pl: "Ciężar, powtórzenia i opcjonalny wysiłek na serię — zaznacz wiersz po skończeniu.",
    ko: "세트마다 무게, 반복, 선택적 강도 — 끝나면 행을 체크하세요.",
    zh: "每组记录重量、次数和可选强度——完成后勾选该行。",
    hi: "प्रति सेट वज़न, रेप्स और वैकल्पिक प्रयास — पूरा होने पर पंक्ति चिह्नित करें।",
  },
  'Creatine, protein, pre-workout… track what you take and get reminders.': {
    es: 'Creatina, proteína, preentreno… registra lo que tomas y recibe recordatorios.',
    pt: 'Creatina, proteína, pré-treino… registre o que você toma e receba lembretes.',
    fr: 'Créatine, protéine, pre-workout… note ce que tu prends et reçois des rappels.',
    de: 'Kreatin, Protein, Pre-Workout … erfasse, was du nimmst, und erhalte Erinnerungen.',
    it: 'Creatina, proteine, pre-workout… registra ciò che prendi e ricevi promemoria.',
    ru: 'Креатин, протеин, предтрен… записывай приёмы и получай напоминания.',
    tr: 'Kreatin, protein, pre-workout… aldıklarını kaydet, hatırlatmalar al.',
    pl: 'Kreatyna, białko, przedtrening… zapisuj co przyjmujesz i otrzymuj przypomnienia.',
    ko: '크레아틴, 단백질, 프리워크아웃… 복용을 기록하고 알림을 받으세요.',
    zh: '肌酸、蛋白粉、预锻炼……记录你的服用并获得提醒。',
    hi: 'क्रिएटिन, प्रोटीन, प्री-वर्कआउट… जो लेते हैं दर्ज करें और रिमाइंडर पाएं。',
  },
}

let added = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const lang = f.replace('.js', '')
  if (!(lang in { es: 1, pt: 1, fr: 1, de: 1, it: 1, ru: 1, tr: 1, pl: 1, ko: 1, zh: 1, hi: 1 })) continue
  const fp = path.join(dir, f)
  let src = fs.readFileSync(fp, 'utf8')
  const lines = []
  for (const [key, langs] of Object.entries(T)) {
    if (src.includes("'" + key + "'") || src.includes('"' + key + '"')) continue
    lines.push('  ' + JSON.stringify(key) + ': ' + JSON.stringify(langs[lang] ?? key) + ',')
  }
  if (!lines.length) continue
  const close = src.lastIndexOf('}')
  fs.writeFileSync(fp, src.slice(0, close) + lines.join('\n') + '\n' + src.slice(close))
  added += lines.length
}
console.log('added:', added)
