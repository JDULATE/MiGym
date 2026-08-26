// One-shot: supplements feature strings.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'locales')

const T = {
  'Supplements': {
    es: 'Suplementos', pt: 'Suplementos', fr: 'Compléments', de: 'Nahrungsergänzung', it: 'Integratori',
    ru: 'Добавки', tr: 'Takviyeler', pl: 'Suplementy', ko: '보충제', zh: '补剂', hi: 'सप्लीमेंट',
  },
  'Daily checklist on Home. Pre-workout asks before a session; protein after it.': {
    es: 'Checklist diaria en Inicio. El preentreno pregunta antes de una sesión; la proteína después.',
    pt: 'Checklist diária no Início. O pré-treino pergunta antes da sessão; a proteína depois.',
    fr: 'Liste quotidienne sur l’accueil. Le pre-workout demande avant une séance ; les protéines après.',
    de: 'Tägliche Checkliste auf dem Startbildschirm. Pre-Workout fragt vor der Sitzung, Protein danach.',
    it: 'Checklist giornaliera in Home. Il pre-workout chiede prima della sessione; le proteine dopo.',
    ru: 'Ежедневный чек-лист на главном экране. Предтрен спрашивает до сессии, протеин — после.',
    tr: 'Ana sayfada günlük kontrol listesi. Pre-workout seansdan önce sorar; protein sonra.',
    pl: 'Codzienna checklista na Start. Przedtrener pyta przed sesją; białko po niej.',
    ko: '홈의 매일 체크리스트. 전에 프리워크아웃을 묻고 후에 단백질을 묻습니다.',
    zh: '首页的每日清单。训练前询问预锻炼补剂，训练后询问蛋白。',
    hi: 'होम पर दैनिक चेकलिस्ट। सत्र से पहले प्री-वर्कआउट पूछता है; बाद में प्रोटीन।',
  },
  'Add supplement': {
    es: 'Añadir suplemento', pt: 'Adicionar suplemento', fr: 'Ajouter un complément', de: 'Supplement hinzufügen',
    it: 'Aggiungi integratore', ru: 'Добавить добавку', tr: 'Takviye ekle', pl: 'Dodaj suplement',
    ko: '보충제 추가', zh: '添加补剂', hi: 'सप्लीमेंट जोड़ें',
  },
  'Edit supplement': {
    es: 'Editar suplemento', pt: 'Editar suplemento', fr: 'Modifier le complément', de: 'Supplement bearbeiten',
    it: 'Modifica integratore', ru: 'Изменить добавку', tr: 'Takviyeyi düzenle', pl: 'Edytuj suplement',
    ko: '보충제 편집', zh: '编辑补剂', hi: 'सप्लीमेंट संपादित करें',
  },
  'Name (e.g. Creatine)': {
    es: 'Nombre (ej. Creatina)', pt: 'Nome (ex. Creatina)', fr: 'Nom (ex. Créatine)', de: 'Name (z. B. Kreatin)',
    it: 'Nome (es. Creatina)', ru: 'Название (напр. Креатин)', tr: 'İsim (örn. Kreatin)', pl: 'Nazwa (np. Kreatyna)',
    ko: '이름 (예: 크레아틴)', zh: '名称（如肌酸）', hi: 'नाम (जैसे क्रिएटिन)',
  },
  'Dose (e.g. 5 g)': {
    es: 'Dosis (ej. 5 g)', pt: 'Dose (ex. 5 g)', fr: 'Dose (ex. 5 g)', de: 'Dosis (z. B. 5 g)',
    it: 'Dose (es. 5 g)', ru: 'Доза (напр. 5 г)', tr: 'Doz (örn. 5 g)', pl: 'Dawka (np. 5 g)',
    ko: '용량 (예: 5g)', zh: '剂量（如 5 克）', hi: 'खुराक (जैसे 5 ग्राम)',
  },
  'Schedule': {
    es: 'Horario', pt: 'Horário', fr: 'Horaires', de: 'Zeitplan', it: 'Programma',
    ru: 'График', tr: 'Program', pl: 'Harmonogram', ko: '일정', zh: '时间表', hi: 'शेड्यूल',
  },
  'Daily': {
    es: 'Todos los días', pt: 'Todos os dias', fr: 'Tous les jours', de: 'Täglich', it: 'Ogni giorno',
    ru: 'Ежедневно', tr: 'Her gün', pl: 'Codziennie', ko: '매일', zh: '每天', hi: 'प्रतिदिन',
  },
  'Training days': {
    es: 'Días de entreno', pt: 'Dias de treino', fr: 'Jours d’entraînement', de: 'Trainingstage',
    it: 'Giorni di allenamento', ru: 'Дни тренировок', tr: 'Antrenman günleri', pl: 'Dni treningu',
    ko: '운동하는 날', zh: '训练日', hi: 'ट्रेनिंग के दिन',
  },
  'Rest days': {
    es: 'Días de descanso', pt: 'Dias de descanso', fr: 'Jours de repos', de: 'Ruhetage',
    it: 'Giorni di riposo', ru: 'Дни отдыха', tr: 'Dinlenme günleri', pl: 'Dni odpoczynku',
    ko: '휴식일', zh: '休息日', hi: 'आराम के दिन',
  },
  'Custom days': {
    es: 'Días personalizados', pt: 'Dias personalizados', fr: 'Jours personnalisés', de: 'Eigene Tage',
    it: 'Giorni personalizzati', ru: 'Свои дни', tr: 'Özel günler', pl: 'Własne dni',
    ko: '직접 선택', zh: '自定义日期', hi: 'कस्टम दिन',
  },
  'Reminder time (optional)': {
    es: 'Hora del recordatorio (opcional)', pt: 'Hora do lembrete (opcional)', fr: 'Heure du rappel (optionnel)',
    de: 'Erinnerungszeit (optional)', it: 'Orario promemoria (opzionale)',
    ru: 'Время напоминания (необязательно)', tr: 'Hatırlatma saati (isteğe bağlı)', pl: 'Godzina przypomnienia (opcjonalnie)',
    ko: '알림 시간 (선택)', zh: '提醒时间（可选）', hi: 'रिमाइंडर समय (वैकल्पिक)',
  },
  'Delete': { es: 'Eliminar', pt: 'Excluir', fr: 'Supprimer', de: 'Löschen', it: 'Elimina', ru: 'Удалить', tr: 'Sil', pl: 'Usuń', ko: '삭제', zh: '删除', hi: 'हटाएँ' },
  'Give it a name': {
    es: 'Ponle un nombre', pt: 'Dê um nome', fr: 'Donne un nom', de: 'Gib ihm einen Namen', it: 'Dai un nome',
    ru: 'Дайте название', tr: 'Bir isim ver', pl: 'Podaj nazwę', ko: '이름을 입력하세요', zh: '给它起个名字', hi: 'एक नाम दें',
  },
  'Saved': { es: 'Guardado', pt: 'Salvo', fr: 'Enregistré', de: 'Gespeichert', it: 'Salvato', ru: 'Сохранено', tr: 'Kaydedildi', pl: 'Zapisano', ko: '저장됨', zh: '已保存', hi: 'सेव किया गया' },
  'Enable reminders': {
    es: 'Activar recordatorios', pt: 'Ativar lembretes', fr: 'Activer les rappels', de: 'Erinnerungen aktivieren',
    it: 'Attiva promemoria', ru: 'Включить напоминания', tr: 'Hatırlatmaları aç', pl: 'Włącz przypomnienia',
    ko: '알림 켜기', zh: '开启提醒', hi: 'रिमाइंडर चालू करें',
  },
  'Browser notification when a dose is due': {
    es: 'Notificación del navegador cuando toca una dosis',
    pt: 'Notificação do navegador quando for hora da dose',
    fr: 'Notification navigateur quand une dose est due',
    de: 'Browser-Benachrichtigung, wenn eine Dosis fällig ist',
    it: 'Notifica del browser quando è ora della dose',
    ru: 'Уведомление браузера, когда пора принимать',
    tr: 'Doz zamanı geldiğinde tarayıcı bildirimi',
    pl: 'Powiadomienie przeglądarki, gdy pora na dawkę',
    ko: '복용 시간에 브라우저 알림',
    zh: '到服药时间时发送浏览器通知',
    hi: 'खुराक के समय ब्राउज़र सूचना',
  },
  'Reminders enabled': {
    es: 'Recordatorios activados', pt: 'Lembretes ativados', fr: 'Rappels activés', de: 'Erinnerungen aktiviert',
    it: 'Promemoria attivati', ru: 'Напоминания включены', tr: 'Hatırlatmalar açık', pl: 'Przypomnienia włączone',
    ko: '알림이 활성화되었습니다', zh: '提醒已开启', hi: 'रिमाइंडर चालू',
  },
  'Custom…': {
    es: 'Personalizado…', pt: 'Personalizado…', fr: 'Personnalisé…', de: 'Benutzerdefiniert…', it: 'Personalizzato…',
    ru: 'Своё…', tr: 'Özel…', pl: 'Własny…', ko: '직접 입력…', zh: '自定义…', hi: 'कस्टम…',
  },
  'Do you take any supplements?': {
    es: '¿Tomas algún suplemento?', pt: 'Você toma algum suplemento?', fr: 'Prends-tu des compléments ?',
    de: 'Nimmst du Supplemente?', it: 'Prendi degli integratori?', ru: 'Принимаешь добавки?',
    tr: 'Takviye alıyor musun?', pl: 'Czy bierzesz suplementy?', ko: '보충제를 드시나요?',
    zh: '你服用补剂吗？', hi: 'क्या आप सप्लीमेंट लेते हैं?',
  },
  'None for now': {
    es: 'Ninguno por ahora', pt: 'Nenhum por agora', fr: 'Aucun pour le moment', de: 'Vorerst keiner',
    it: 'Nessuno per ora', ru: 'Пока никакие', tr: 'Şimdilik hayır', pl: 'Na razie żadne',
    ko: '지금은 없음', zh: '暂时不用', hi: 'अभी कोई नहीं',
  },
  'Which one? (e.g. Omega 3)': {
    es: '¿Cuál? (ej. Omega 3)', pt: 'Qual? (ex. Ômega 3)', fr: 'Lequel ? (ex. Oméga 3)',
    de: 'Welcher? (z. B. Omega 3)', it: 'Quale? (es. Omega 3)', ru: 'Какой? (напр. Омега 3)',
    tr: 'Hangisi? (örn. Omega 3)', pl: 'Który? (np. Omega 3)', ko: '무엇? (예: 오메가3)',
    zh: '哪一种？（如鱼油）', hi: 'कौन सा? (जैसे ओमेगा 3)',
  },
  'Supplements for today': {
    es: 'Suplementos de hoy', pt: 'Suplementos de hoje', fr: 'Compléments du jour', de: 'Supplemente für heute',
    it: 'Integratori di oggi', ru: 'Добавки на сегодня', tr: 'Bugünün takviyeleri', pl: 'Suplementy na dziś',
    ko: '오늘의 보충제', zh: '今日补剂', hi: 'आज के सप्लीमेंट',
  },
  'All supplements logged — nice': {
    es: 'Todos los suplementos registrados — genial',
    pt: 'Todos os suplementos registrados — ótimo',
    fr: 'Tous les compléments pris — super',
    de: 'Alle Supplemente eingetragen — stark',
    it: 'Tutti gli integratori registrati — ottimo',
    ru: 'Все добавки приняты — отлично',
    tr: 'Tüm takviyeler kaydedildi — harika',
    pl: 'Wszystkie suplementy zapisane — super',
    ko: '모든 보충제 기록 완료 — 좋아요',
    zh: '所有补剂已记录——真棒',
    hi: 'सभी सप्लीमेंट दर्ज — बढ़िया',
  },
  'Taken': { es: 'Tomado', pt: 'Tomado', fr: 'Pris', de: 'Genommen', it: 'Preso', ru: 'Принято', tr: 'Alındı', pl: 'Wzięte', ko: '복용함', zh: '已服用', hi: 'लिया' },
  'Take your {0}': {
    es: 'Toma tu {0}', pt: 'Tome seu {0}', fr: 'Prends ton {0}', de: 'Nimm dein {0}', it: 'Prendi il tuo {0}',
    ru: 'Прими свой {0}', tr: '{0} almayı unutma', pl: 'Weź swój {0}', ko: '{0} 복용하세요', zh: '该服用你的{0}了', hi: 'अपना {0} लें',
  },
  'Pre-workout check': {
    es: 'Chequeo de preentreno', pt: 'Checagem de pré-treino', fr: 'Vérif pré-workout', de: 'Pre-Workout-Check',
    it: 'Controllo pre-workout', ru: 'Проверка предтрена', tr: 'Pre-workout kontrolü', pl: 'Kontrola przedtreningu',
    ko: '프리워크아웃 확인', zh: '预锻炼检查', hi: 'प्री-वर्कआउट जाँच',
  },
  'Did you already take your {0}?': {
    es: '¿Ya te tomaste el {0}?', pt: 'Já tomou o seu {0}?', fr: 'As-tu déjà pris ton {0} ?',
    de: 'Hast du dein {0} schon genommen?', it: 'Hai già preso il tuo {0}?',
    ru: 'Ты уже принял {0}?', tr: '{0} aldın mı?', pl: 'Czy już wziąłeś {0}?',
    ko: '이미 {0}을 드셨나요?', zh: '你已经服用{0}了吗？', hi: 'क्या आपने अपना {0} ले लिया?',
  },
  'pre-workout': {
    es: 'preentreno', pt: 'pré-treino', fr: 'pre-workout', de: 'Pre-Workout', it: 'pre-workout',
    ru: 'предтрен', tr: 'pre-workout', pl: 'przedtrening', ko: '프리워크아웃', zh: '预锻炼补剂', hi: 'प्री-वर्कआउट',
  },
  'protein': {
    es: 'proteína', pt: 'proteína', fr: 'protéine', de: 'Protein', it: 'proteina',
    ru: 'протеин', tr: 'protein', pl: 'białko', ko: '단백질', zh: '蛋白粉', hi: 'प्रोटीन',
  },
  'Yes — logged': {
    es: 'Sí — registrado', pt: 'Sim — registrado', fr: 'Oui — enregistré', de: 'Ja — eingetragen',
    it: 'Sì — registrato', ru: 'Да — записано', tr: 'Evet — kaydedildi', pl: 'Tak — zapisane',
    ko: '네 — 기록됨', zh: '是的——已记录', hi: 'हाँ — दर्ज किया',
  },
  'Not yet': {
    es: 'Todavía no', pt: 'Ainda não', fr: 'Pas encore', de: 'Noch nicht', it: 'Non ancora',
    ru: 'Ещё нет', tr: 'Henüz değil', pl: 'Jeszcze nie', ko: '아직요', zh: '还没有', hi: 'अभी नहीं',
  },
  'Log {0}': {
    es: 'Registrar {0}', pt: 'Registrar {0}', fr: 'Enregistrer {0}', de: '{0} eintragen', it: 'Registra {0}',
    ru: 'Записать {0}', tr: '{0} kaydet', pl: 'Zapisz {0}', ko: '{0} 기록', zh: '记录{0}', hi: '{0} दर्ज करें',
  },
  'Protein logged': {
    es: 'Proteína registrada', pt: 'Proteína registrada', fr: 'Protéine enregistrée', de: 'Protein eingetragen',
    it: 'Proteina registrata', ru: 'Протеин записан', tr: 'Protein kaydedildi', pl: 'Białko zapisane',
    ko: '단백질 기록됨', zh: '蛋白已记录', hi: 'प्रोटीन दर्ज',
  },
  'Creatine': { es: 'Creatina', pt: 'Creatina', fr: 'Créatine', de: 'Kreatin', it: 'Creatina', ru: 'Креатин', tr: 'Kreatin', pl: 'Kreatyna', ko: '크레아틴', zh: '肌酸', hi: 'क्रिएटिन' },
  'Amino acids': { es: 'Aminoácidos', pt: 'Aminoácidos', fr: 'Acides aminés', de: 'Aminosäuren', it: 'Aminoacidi', ru: 'Аминокислоты', tr: 'Aminoasitler', pl: 'Aminokwasy', ko: '아미노산', zh: '氨基酸', hi: 'अमीनो एसिड' },
  'Other': { es: 'Otro', pt: 'Outro', fr: 'Autre', de: 'Andere', it: 'Altro', ru: 'Другое', tr: 'Diğer', pl: 'Inne', ko: '기타', zh: '其他', hi: 'अन्य' },
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
