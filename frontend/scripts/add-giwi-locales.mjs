import fs from 'node:fs'
const DIR = new URL('../src/locales/', import.meta.url)
const LANGS = ['de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi']
const T = {
  'Welcome to MiGym': ['Willkommen bei MiGym', 'Bienvenido a MiGym', 'Bienvenue sur MiGym', 'Benvenuto su MiGym', 'Bem-vindo ao MiGym', 'Witaj w MiGym', 'MiGym’e hoş geldin', 'Добро пожаловать в MiGym', '欢迎来到 MiGym', 'MiGym에 오신 것을 환영합니다', 'MiGym में आपका स्वागत है'],
  'Hi! I’m Giwi — I’ll help you set MiGym up for you.': ['Hi! Ich bin Giwi — ich helfe dir, MiGym einzurichten.', '¡Hola! Soy Giwi y te ayudaré a configurar MiGym.', 'Salut ! Moi c’est Giwi — je vais t’aider à préparer MiGym.', 'Ciao! Sono Giwi e ti aiuterò a impostare MiGym.', 'Olá! Eu sou a Giwi — vou ajudar-te a configurar o MiGym.', 'Cześć! Jestem Giwi — pomogę ci skonfigurować MiGym.', 'Merhaba! Ben Giwi — MiGym’i senin için ayarlamana yardım edeceğim.', 'Привет! Я Дживи — помогу настроить MiGym под тебя.', '嗨！我是 Giwi——我来帮你设置 MiGym。', '안녕! 나는 Giwi야 — MiGym 설정을 도와줄게.', 'नमस्ते! मैं Giwi हूँ — आपकी MiGym सेटअप में मदद करूँगा।'],
  'First, what’s your name?': ['Zuerst: Wie heißt du?', 'Primero, ¿cómo te llamas?', 'D’abord, comment tu t’appelles ?', 'Prima, come ti chiami?', 'Primeiro, como te chamas?', 'Najpierw — jak się nazywasz?', 'Önce, adın ne?', 'Сначала — как тебя зовут?', '首先，你叫什么名字？', '먼저, 이름이 뭐예요?', 'सबसे पहले, आपका नाम क्या है?'],
  'Your name': ['Dein Name', 'Tu nombre', 'Ton nom', 'Il tuo nome', 'O teu nome', 'Twoje imię', 'Adın', 'Ваше имя', '你的名字', '당신의 이름', 'आपका नाम'],
  'Nice to meet you, {0}!': ['Freut mich, {0}!', '¡Encantado, {0}!', 'Enchanté, {0} !', 'Piacere, {0}!', 'Prazer em conhecer-te, {0}!', 'Miło cię poznać, {0}!', 'Memnun oldum {0}!', 'Приятно познакомиться, {0}!', '很高兴认识你，{0}！', '만나서 반가워요, {0}님!', 'आपसे मिलकर खुशी हुई, {0}!'],
  'How old are you?': ['Wie alt bist du?', '¿Cuántos años tienes?', 'Quel âge as-tu ?', 'Quanti anni hai?', 'Quantos anos tens?', 'Ile masz lat?', 'Kaç yaşındasın?', 'Сколько тебе лет?', '你多大了？', '몇 살이에요?', 'आपकी उम्र क्या है?'],
  Age: ['Alter', 'Edad', 'Âge', 'Età', 'Idade', 'Wiek', 'Yaş', 'Возраст', '年龄', '나이', 'उम्र'],
  'What do you weigh right now?': ['Wie viel wiegst du gerade?', '¿Cuánto pesas ahora mismo?', 'Combien pèses-tu actuellement ?', 'Quanto pesi in questo momento?', 'Quanto pesas neste momento?', 'Ile teraz ważysz?', 'Şu anda kaç kilosun?', 'Сколько ты сейчас весишь?', '你现在体重是多少？', '지금 몸무게는 얼마인가요?', 'अभी आपका वज़न कितना है?'],
  'Current weight': ['Aktuelles Gewicht', 'Peso actual', 'Poids actuel', 'Peso attuale', 'Peso atual', 'Aktualna waga', 'Mevcut kilo', 'Текущий вес', '当前体重', '현재 체중', 'वर्तमान वज़न'],
  'What’s your height?': ['Wie groß bist du?', '¿Cuánto mides?', 'Quelle est ta taille ?', 'Quanto sei alto?', 'Qual é a tua altura?', 'Jaki masz wzrost?', 'Boyun kaç?', 'Какой у тебя рост?', '你的身高是多少？', '키가 어떻게 되세요?', 'आपकी ऊँचाई क्या है?'],
  'What’s your main goal?': ['Was ist dein Hauptziel?', '¿Cuál es tu objetivo principal?', 'Quel est ton objectif principal ?', 'Qual è il tuo obiettivo principale?', 'Qual é o teu objetivo principal?', 'Jaki jest twój główny cel?', 'Asıl hedefin nedir?', 'Какая у тебя главная цель?', '你的主要目标是什么？', '가장 주된 목표는 무엇인가요?', 'आपका मुख्य लक्ष्य क्या है?'],
  'Your profile': ['Dein Profil', 'Tu perfil', 'Ton profil', 'Il tuo profilo', 'O teu perfil', 'Twój profil', 'Profilin', 'Ваш профиль', '你的资料', '당신의 프로필', 'आपकी प्रोफ़ाइल'],
  'Perfect! I know a little about you now.': ['Perfekt! Ich weiß jetzt ein wenig über dich.', '¡Perfecto! Ya sé algo sobre ti.', 'Parfait ! J’en sais un peu plus sur toi.', 'Perfetto! So già qualcosa su di te.', 'Perfeito! Já sei um pouco sobre ti.', 'Świetnie! Wiem już o tobie trochę.', 'Harika! Artık senin hakkında bir şeyler biliyorum.', 'Отлично! Теперь я кое-что знаю о тебе.', '完美！我已经对你有了一点了解。', '완벽해요! 이제 조금 알겠어요.', 'बढ़िया! अब मैं तुम्हारे बारे में कुछ जानता हूँ।'],
  "Now I’ll show you how MiGym works.": ['Jetzt zeige ich dir, wie MiGym funktioniert.', 'Ahora te enseñaré cómo funciona MiGym.', 'Maintenant je vais te montrer comment fonctionne MiGym.', 'Ora ti mostrerò come funziona MiGym.', 'Agora vou mostrar-te como o MiGym funciona.', 'Teraz pokażę ci, jak działa MiGym.', 'Şimdi MiGym’in nasıl çalıştığını göstereceğim.', 'Теперь покажу, как работает MiGym.', '现在我来教你 MiGym 怎么用。', '이제 MiGym 사용 방법을 보여드릴게요.', 'अब मैं दिखाऊँगा कि MiGym कैसे काम करता है।'],
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
