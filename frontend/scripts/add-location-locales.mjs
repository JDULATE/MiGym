// One-shot: location strings for ADR-0008 marketplace (country/province/place + filters).
// Run: node add-location-locales.mjs   (from frontend/scripts)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

const PLACE = 'Gym / training place (e.g. Gold\u2019s Gym La Sabana)'
const T = {
  'Location': {
    es: 'Ubicación', pt: 'Localização', fr: 'Localisation', de: 'Standort', it: 'Posizione',
    ru: 'Расположение', tr: 'Konum', pl: 'Lokalizacja', ko: '위치', zh: '所在地', hi: 'स्थान',
  },
  'Select country': {
    es: 'Selecciona país', pt: 'Selecione o país', fr: 'Choisis le pays', de: 'Land wählen', it: 'Scegli paese',
    ru: 'Выберите страну', tr: 'Ülke seç', pl: 'Wybierz kraj', ko: '국가 선택', zh: '选择国家', hi: 'देश चुनें',
  },
  'Select province': {
    es: 'Selecciona provincia', pt: 'Selecione a província', fr: 'Choisis la province', de: 'Provinz wählen',
    it: 'Scegli provincia', ru: 'Выберите провинцию', tr: 'İl seç', pl: 'Wybierz prowincję',
    ko: '주 선택', zh: '选择省份', hi: 'प्रांत चुनें',
  },
  'Province / state': {
    es: 'Provincia / estado', pt: 'Província / estado', fr: 'Province / état', de: 'Provinz / Bundesland',
    it: 'Provincia / stato', ru: 'Провинция / штат', tr: 'Eyalet / il', pl: 'Prowincja / stan',
    ko: '주/도', zh: '省/州', hi: 'प्रांत / राज्य',
  },
  [PLACE]: {
    es: 'Gimnasio / lugar de entrenamiento (ej. Gold\u2019s Gym La Sabana)',
    pt: 'Academia / local de treino (ex. Gold\u2019s Gym La Sabana)',
    fr: 'Salle / lieu d\u2019entraînement (ex. Gold\u2019s Gym La Sabana)',
    de: 'Studio / Trainingsort (z. B. Gold\u2019s Gym La Sabana)',
    it: 'Palestra / luogo di allenamento (es. Gold\u2019s Gym La Sabana)',
    ru: 'Зал / место тренировок (напр. Gold\u2019s Gym La Sabana)',
    tr: 'Spor salonu / antrenman yeri (örn. Gold\u2019s Gym La Sabana)',
    pl: 'Siłownia / miejsce treningów (np. Gold\u2019s Gym La Sabana)',
    ko: '헬스장 / 훈련 장소 (예: Gold\u2019s Gym La Sabana)',
    zh: '健身房/训练地点（如 Gold\u2019s Gym La Sabana）',
    hi: 'जिम / प्रशिक्षण स्थान (जैसे Gold\u2019s Gym La Sabana)',
  },
  'All countries': {
    es: 'Todos los países', pt: 'Todos os países', fr: 'Tous les pays', de: 'Alle Länder', it: 'Tutti i paesi',
    ru: 'Все страны', tr: 'Tüm ülkeler', pl: 'Wszystkie kraje', ko: '모든 국가', zh: '所有国家', hi: 'सभी देश',
  },
  'All provinces': {
    es: 'Todas las provincias', pt: 'Todas as províncias', fr: 'Toutes les provinces', de: 'Alle Provinzen',
    it: 'Tutte le province', ru: 'Все провинции', tr: 'Tüm iller', pl: 'Wszystkie prowincje',
    ko: '모든 주', zh: '所有省份', hi: 'सभी प्रांत',
  },
  '{0} coaches': {
    es: '{0} coaches', pt: '{0} coaches', fr: '{0} coaches', de: '{0} Coaches', it: '{0} coach',
    ru: '{0} тренеров', tr: '{0} koç', pl: '{0} trenerów', ko: '코치 {0}명', zh: '{0} 位教练', hi: '{0} कोच',
  },
  'Approved listing': {
    es: 'Ficha aprobada', pt: 'Anúncio aprovado', fr: 'Fiche approuvée', de: 'Genehmigter Eintrag',
    it: 'Inserzione approvata', ru: 'Одобренная анкета', tr: 'Onaylı liste', pl: 'Zatwierdzone ogłoszenie',
    ko: '승인된 등록', zh: '已批准的资料', hi: 'स्वीकृत लिस्टिंग',
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
  console.log(f + ': +' + lines.length)
}
console.log('total:', added)
