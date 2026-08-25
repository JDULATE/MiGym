// One-shot: hub segment labels for the Round 3 IA refactor.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

const T = {
  'Coaches': {
    es: 'Coaches', pt: 'Coaches', fr: 'Coaches', de: 'Coaches', it: 'Coach', ru: 'Тренеры',
    tr: 'Koçlar', pl: 'Trenerzy', ko: '코치', zh: '教练', hi: 'कोच',
  },
  'Directory': {
    es: 'Directorio', pt: 'Diretório', fr: 'Annuaire', de: 'Verzeichnis', it: 'Elenco',
    ru: 'Каталог', tr: 'Dizin', pl: 'Katalog', ko: '디렉터리', zh: '目录', hi: 'डायरेक्टरी',
  },
  'My profile': {
    es: 'Mi perfil', pt: 'Meu perfil', fr: 'Mon profil', de: 'Mein Profil', it: 'Il mio profilo',
    ru: 'Мой профиль', tr: 'Profilim', pl: 'Mój profil', ko: '내 프로필', zh: '我的资料', hi: 'मेरी प्रोफ़ाइल',
  },
  'My clients': {
    es: 'Mis clientes', pt: 'Meus alunos', fr: 'Mes élèves', de: 'Meine Klienten', it: 'I miei clienti',
    ru: 'Мои клиенты', tr: 'Danışanlarım', pl: 'Moi podopieczni', ko: '내 클라이언트', zh: '我的客户', hi: 'मेरे क्लाइंट',
  },
  'Publish your profile': {
    es: 'Publica tu perfil', pt: 'Publique seu perfil', fr: 'Publie ton profil', de: 'Profil veröffentlichen',
    it: 'Pubblica il profilo', ru: 'Опубликовать профиль', tr: 'Profilini yayınla', pl: 'Opublikuj profil',
    ko: '프로필 게시', zh: '发布资料', hi: 'प्रोफ़ाइल प्रकाशित करें',
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
