// fill 'You can redo this tour anytime from Settings.' ×11
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')
const KEY = 'You can redo this tour anytime from Settings.'
const T = {
  es: 'Puedes repetir este recorrido cuando quieras desde Ajustes.',
  pt: 'Você pode refazer este passeio quando quiser em Ajustes.',
  fr: 'Tu peux refaire cette visite à tout moment dans les Réglages.',
  de: 'Du kannst diese Tour jederzeit in den Einstellungen wiederholen.',
  it: 'Puoi rifare questo tour in qualsiasi momento dalle Impostazioni.',
  ru: 'Вы можете повторить это руководство в любой момент в Настройках.',
  tr: 'Bu turu Ayarlar’dan istediğin zaman tekrarlayabilirsin.',
  pl: 'Możesz powtórzyć ten samouczek w Ustawieniach w każdej chwili.',
  ko: '설정에서 언제든 이 투어를 다시 볼 수 있습니다.',
  zh: '你可以随时在设置中重新观看本引导。',
  hi: 'आप यह टूर कभी भी सेटिंग्स से दोबारा कर सकते हैं।',
}
let added = 0
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js') || f === 'index.js') continue
  const lang = f.replace('.js', '')
  if (!(lang in T)) continue
  const fp = path.join(dir, f)
  let src = fs.readFileSync(fp, 'utf8')
  if (src.includes("'" + KEY + "'") || src.includes('"' + KEY + '"')) continue
  const close = src.lastIndexOf('}')
  src = src.slice(0, close) + '  ' + JSON.stringify(KEY) + ': ' + JSON.stringify(T[lang]) + ',\n' + src.slice(close)
  fs.writeFileSync(fp, src)
  added++
}
console.log('packs updated:', added)
