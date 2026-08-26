// Fill onboarding dialogue translations missing from every pack.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

const T = {
  'Hi! I’m Giwi — I’ll help you set MiGym up for you.': {
    es: '¡Hola! Soy Giwi — Te ayudaré a configurar MiGym.',
    pt: 'Oi! Eu sou o Giwi — Vou te ajudar a configurar o MiGym.',
    fr: 'Salut ! Je suis Giwi — Je vais t’aider à configurer MiGym.',
    de: 'Hi! Ich bin Giwi — Ich helfe dir, MiGym einzurichten.',
    it: 'Ciao! Sono Giwi — Ti aiuterò a configurare MiGym.',
    ru: 'Привет! Я Дживи — Помогу тебе настроить MiGym.',
    tr: 'Merhaba! Ben Giwi — MiGym’i kurmana yardım edeceğim.',
    pl: 'Cześć! Jestem Giwi — Pomogę ci skonfigurować MiGym.',
    ko: '안녕! 나는 Giwi야 — MiGym 설정을 도와줄게.',
    zh: '嗨！我是 Giwi——我会帮你设置 MiGym。',
    hi: 'नमस्ते! मैं Giwi हूँ — मैं तुम्हें MiGym सेट करने में मदद करूँगा।',
  },
  'First, what’s your name?': {
    es: 'Primero, ¿cómo te llamas?', pt: 'Primeiro, qual é o seu nome?', fr: 'D’abord, comment tu t’appelles ?',
    de: 'Zuerst, wie heißt du?', it: 'Prima, come ti chiami?', ru: 'Сначала, как тебя зовут?',
    tr: 'Önce, adın ne?', pl: 'Najpierw, jak się nazywasz?', ko: '먼저, 이름이 뭐야?',
    zh: '首先，你叫什么名字？', hi: 'पहले, तुम्हारा नाम क्या है?',
  },
  'What’s your height?': {
    es: '¿Cuánto mides?', pt: 'Qual é a sua altura?', fr: 'Quelle est ta taille ?',
    de: 'Wie groß bist du?', it: 'Quanto sei alto?', ru: 'Какой у тебя рост?',
    tr: 'Boyun kaç?', pl: 'Ile masz wzrostu?', ko: '키가 어떻게 되세요?',
    zh: '你的身高是多少？', hi: 'आपकी ऊँचाई क्या है?',
  },
  'What’s your main goal?': {
    es: '¿Cuál es tu objetivo principal?', pt: 'Qual é o seu objetivo principal?', fr: 'Quel est ton objectif principal ?',
    de: 'Was ist dein Hauptziel?', it: 'Qual è il tuo obiettivo principale?', ru: 'Какая у тебя главная цель?',
    tr: 'Ana hedefin ne?', pl: 'Jaki jest twój główny cel?', ko: '가장 주된 목표는 무엇인가요?',
    zh: '你的主要目标是什么？', hi: 'तुम्हारा मुख्य लक्ष्य क्या है?',
  },
  'What’s your experience level?': {
    es: '¿Cuál es tu nivel de experiencia?', pt: 'Qual é o seu nível de experiência?', fr: 'Quel est ton niveau d’expérience ?',
    de: 'Wie erfahren bist du?', it: 'Qual è il tuo livello di esperienza?', ru: 'Какой у тебя опыт?',
    tr: 'Deneyim seviyen nedir?', pl: 'Jaki jest twój poziom doświadczenia?', ko: '경험 수준은 어떻게 되나요?',
    zh: '你的经验水平如何？', hi: 'आपका अनुभव स्तर क्या है?',
  },
  'Now I’ll show you how MiGym works.': {
    es: 'Ahora te mostraré cómo funciona MiGym.',
    pt: 'Agora vou te mostrar como o MiGym funciona.',
    fr: 'Maintenant je vais te montrer comment fonctionne MiGym.',
    de: 'Jetzt zeige ich dir, wie MiGym funktioniert.',
    it: 'Ora ti mostrerò come funziona MiGym.',
    ru: 'Теперь я покажу, как работает MiGym.',
    tr: 'Şimdi MiGym’in nasıl çalıştığını göstereceğim.',
    pl: 'Teraz pokażę ci, jak działa MiGym.',
    ko: '이제 MiGym 사용 방법을 보여드릴게요.',
    zh: '现在我来展示 MiGym 的使用方法。',
    hi: 'अब मैं दिखाऊँगा कि MiGym कैसे काम करता है।',
  },
  'years': {
    es: 'años', pt: 'anos', fr: 'ans', de: 'Jahre', it: 'anni', ru: 'лет',
    tr: 'yaş', pl: 'lat', ko: '세', zh: '岁', hi: 'वर्ष',
  },
  'Let’s go!': {
    es: '¡Vamos!', pt: 'Vamos!', fr: 'Allons-y !', de: 'Los geht’s!', it: 'Andiamo!',
    ru: 'Поехали!', tr: 'Hadi başlayalım!', pl: 'Zaczynajmy!', ko: '출발!', zh: '出发！', hi: 'चलो शुरू करें!',
  },
  'I’ll remind you every day.': {
    es: 'Te recuerdo cada día.', pt: 'Eu lembro todos os dias.', fr: 'Je te rappelle chaque jour.',
    de: 'Ich erinnere dich jeden Tag.', it: 'Ti ricordo ogni giorno.', ru: 'Напоминаю каждый день.',
    tr: 'Her gün hatırlatırım.', pl: 'Przypominam codziennie.', ko: '매일 알려드릴게요.',
    zh: '我每天都会提醒你。', hi: 'मैं हर दिन याद दिलाऊँगा।',
  },
  'Protein': {
    es: 'Proteína', pt: 'Proteína', fr: 'Protéine', de: 'Protein', it: 'Proteina',
    ru: 'Протеин', tr: 'Protein', pl: 'Białko', ko: '단백질', zh: '蛋白质', hi: 'प्रोटीन',
  },
  'Pre-workout': {
    es: 'Preentreno', pt: 'Pré-treino', fr: 'Pre-workout', de: 'Pre-Workout', it: 'Pre-workout',
    ru: 'Предтрен', tr: 'Pre-workout', pl: 'Przedtrening', ko: '프리워크아웃',
    zh: '训练前补剂', hi: 'प्री-वर्कआउट',
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
