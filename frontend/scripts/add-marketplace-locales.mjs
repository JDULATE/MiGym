// One-shot: insert ADR-0008 marketplace strings into the 11 locale packs.
// Keys are the English source strings used with t() in Coaches/CoachEdit/Settings.
// Run: node scripts/add-marketplace-locales.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'src', 'locales')

const T = {
  'Find a coach': {
    es: 'Buscar coach', pt: 'Encontrar um coach', fr: 'Trouver un coach', de: 'Coach finden',
    it: 'Trova un coach', ru: 'Найти тренера', tr: 'Koç bul', pl: 'Znajdź trenera',
    ko: '코치 찾기', zh: '寻找教练', hi: 'कोच खोजें',
  },
  'Browse coach profiles and reach out directly — training happens outside the app.': {
    es: 'Explora perfiles de coaches y contacta directamente — el entrenamiento ocurre fuera de la app.',
    pt: 'Explore perfis de coaches e entre em contato diretamente — o treino acontece fora do app.',
    fr: 'Parcourez les profils de coaches et contactez-les directement — l’entraînement se passe en dehors de l’app.',
    de: 'Stöbere in Coach-Profilen und kontaktiere direkt — das Training findet außerhalb der App statt.',
    it: 'Sfoglia i profili dei coach e contattali direttamente — l’allenamento avviene fuori dall’app.',
    ru: 'Просматривайте профили тренеров и связывайтесь напрямую — тренировки проходят вне приложения.',
    tr: 'Koç profillerine göz at ve doğrudan iletişime geç — antrenman uygulamanın dışında gerçekleşir.',
    pl: 'Przeglądaj profile trenerów i kontaktuj się bezpośrednio — trening odbywa się poza aplikacją.',
    ko: '코치 프로필을 둘러보고 직접 연락하세요 — 운동은 앱 밖에서 진행됩니다.',
    zh: '浏览教练资料并直接联系——训练在应用外进行。',
    hi: 'कोच प्रोफ़ाइल देखें और सीधे संपर्क करें — ट्रेनिंग ऐप के बाहर होती है।',
  },
  'Search coaches': {
    es: 'Buscar coaches', pt: 'Pesquisar coaches', fr: 'Rechercher des coaches', de: 'Coaches suchen',
    it: 'Cerca coach', ru: 'Поиск тренеров', tr: 'Koç ara', pl: 'Szukaj trenerów',
    ko: '코치 검색', zh: '搜索教练', hi: 'कोच खोजें',
  },
  'Any modality': {
    es: 'Cualquier modalidad', pt: 'Qualquer modalidade', fr: 'Toutes modalités', de: 'Jede Art',
    it: 'Qualsiasi modalità', ru: 'Любой формат', tr: 'Her tür', pl: 'Każda forma',
    ko: '모든 형태', zh: '任何方式', hi: 'कोई भी प्रकार',
  },
  'Online': {
    es: 'En línea', pt: 'On-line', fr: 'En ligne', de: 'Online',
    it: 'Online', ru: 'Онлайн', tr: 'Çevrimiçi', pl: 'Online',
    ko: '온라인', zh: '线上', hi: 'ऑनलाइन',
  },
  'In person': {
    es: 'Presencial', pt: 'Presencial', fr: 'En personne', de: 'Vor Ort',
    it: 'Di persona', ru: 'Лично', tr: 'Yüz yüze', pl: 'Stacjonarnie',
    ko: '대면', zh: '线下', hi: 'व्यक्तिगत',
  },
  'Online + in person': {
    es: 'En línea + presencial', pt: 'On-line + presencial', fr: 'En ligne + en personne', de: 'Online + vor Ort',
    it: 'Online + di persona', ru: 'Онлайн + лично', tr: 'Çevrimiçi + yüz yüze', pl: 'Online + stacjonarnie',
    ko: '온라인 + 대면', zh: '线上 + 线下', hi: 'ऑनलाइन + व्यक्तिगत',
  },
  'No coaches listed yet — be the first.': {
    es: 'Aún no hay coaches publicados — sé el primero.',
    pt: 'Ainda não há coaches listados — seja o primeiro.',
    fr: 'Aucun coach pour le moment — sois le premier.',
    de: 'Noch keine Coaches gelistet — sei der Erste.',
    it: 'Nessun coach ancora — sii il primo.',
    ru: 'Тренеров пока нет — будь первым.',
    tr: 'Henüz koç yok — ilk sen ol.',
    pl: 'Nie ma jeszcze trenerów — bądź pierwszy.',
    ko: '아직 등록된 코치가 없습니다 — 첫 번째가 되어 보세요.',
    zh: '还没有教练——来做第一个吧。',
    hi: 'अभी कोई कोच नहीं है — पहले आप बनें।',
  },
  'Become a coach': {
    es: 'Conviértete en coach', pt: 'Torne-se um coach', fr: 'Devenir coach', de: 'Coach werden',
    it: 'Diventa un coach', ru: 'Стать тренером', tr: 'Koç ol', pl: 'Zostań trenerem',
    ko: '코치 되기', zh: '成为教练', hi: 'कोच बनें',
  },
  'Sign in from the app first — then publish your profile from here.': {
    es: 'Primero inicia sesión desde la app — luego publica tu perfil desde aquí.',
    pt: 'Primeiro entre pela app — depois publique seu perfil daqui.',
    fr: 'Connecte-toi d’abord depuis l’app — publie ensuite ton profil ici.',
    de: 'Melde dich zuerst in der App an — veröffentliche dein Profil dann von hier.',
    it: 'Primo accedi dall’app — poi pubblica il tuo profilo da qui.',
    ru: 'Сначала войдите в приложении — затем опубликуйте профиль отсюда.',
    tr: 'Önce uygulamadan giriş yap — sonra profilini buradan yayınla.',
    pl: 'Najpierw zaloguj się w aplikacji — potem opublikuj profil tutaj.',
    ko: '먼저 앱에서 로그인하세요 — 그런 다음 여기서 프로필을 게시하세요.',
    zh: '请先在应用中登录——然后在这里发布你的资料。',
    hi: 'पहले ऐप से साइन इन करें — फिर यहाँ से अपनी प्रोफ़ाइल प्रकाशित करें।',
  },
  'Open MiGym': {
    es: 'Abrir MiGym', pt: 'Abrir MiGym', fr: 'Ouvrir MiGym', de: 'MiGym öffnen',
    it: 'Apri MiGym', ru: 'Открыть MiGym', tr: 'MiGym’i aç', pl: 'Otwórz MiGym',
    ko: 'MiGym 열기', zh: '打开 MiGym', hi: 'MiGym खोलें',
  },
  'My coach profile': {
    es: 'Mi perfil de coach', pt: 'Meu perfil de coach', fr: 'Mon profil de coach', de: 'Mein Coach-Profil',
    it: 'Il mio profilo coach', ru: 'Мой профиль тренера', tr: 'Koç profilim', pl: 'Mój profil trenera',
    ko: '내 코치 프로필', zh: '我的教练资料', hi: 'मेरी कोच प्रोफ़ाइल',
  },
  'Email': {
    es: 'Correo', pt: 'E-mail', fr: 'E-mail', de: 'E-Mail',
    it: 'Email', ru: 'Почта', tr: 'E-posta', pl: 'E-mail',
    ko: '이메일', zh: '邮箱', hi: 'ईमेल',
  },
  'Website': {
    es: 'Sitio web', pt: 'Site', fr: 'Site web', de: 'Webseite',
    it: 'Sito web', ru: 'Сайт', tr: 'Web sitesi', pl: 'Strona www',
    ko: '웹사이트', zh: '网站', hi: 'वेबसाइट',
  },
  'Certifications': {
    es: 'Certificaciones', pt: 'Certificações', fr: 'Certifications', de: 'Zertifikate',
    it: 'Certificazioni', ru: 'Сертификаты', tr: 'Sertifikalar', pl: 'Certyfikaty',
    ko: '자격증', zh: '认证', hi: 'प्रमाणपत्र',
  },
  'Coach marketplace': {
    es: 'Mercado de coaches', pt: 'Mercado de coaches', fr: 'Place de marché des coaches', de: 'Coach-Marktplatz',
    it: 'Marketplace di coach', ru: 'Биржа тренеров', tr: 'Koç pazarı', pl: 'Rynek trenerów',
    ko: '코치 마켓', zh: '教练市场', hi: 'कोच मार्केट',
  },
  'Coaches publish a public profile; contact happens outside the app.': {
    es: 'Los coaches publican un perfil visible; el contacto ocurre fuera de la app.',
    pt: 'Coaches publicam um perfil visível; o contato acontece fora do app.',
    fr: 'Les coaches publient un profil visible ; le contact se fait en dehors de l’app.',
    de: 'Coaches veröffentlichen ein sichtbares Profil; der Kontakt läuft außerhalb der App.',
    it: 'I coach pubblicano un profilo visibile; il contatto avviene fuori dall’app.',
    ru: 'Тренеры публикуют открытый профиль; связь происходит вне приложения.',
    tr: 'Koçlar herkese açık profil yayınlıyor; iletişim uygulamanın dışında olur.',
    pl: 'Trenerzy publikują widoczny profil; kontakt odbywa się poza aplikacją.',
    ko: '코치는 공개 프로필을 게시하고 연락은 앱 밖에서 이루어집니다.',
    zh: '教练发布公开资料；联系在应用外进行。',
    hi: 'कोच सार्वजनिक प्रोफ़ाइल प्रकाशित करते हैं; संपर्क ऐप के बाहर होता है।',
  },
  'Browse the public directory — no account needed.': {
    es: 'Explora el directorio público — sin necesidad de cuenta.',
    pt: 'Explore o diretório público — sem precisa de conta.',
    fr: 'Parcourez l’annuaire public — sans compte.',
    de: 'Durchsichtige öffentliches Verzeichnis — ohne Konto.',
    it: 'Sfoglia l’elenco pubblico — senza account.',
    ru: 'Открытый каталог — аккаунт не нужен.',
    tr: 'Herkese açık dizine göz at — hesap gerekmez.',
    pl: 'Przeglądaj publiczny katalog — bez konta.',
    ko: '공개 디렉터리 탐색 — 계정이 필요 없습니다.',
    zh: '浏览公开目录——无需账号。',
    hi: 'सार्वजनिक डायरेक्टरी देखें — खाता ज़रूरी नहीं।',
  },
  'Publish your profile for students. An admin approves every listing.': {
    es: 'Publica tu perfil para estudiantes. Un administrador aprueba cada ficha.',
    pt: 'Publique seu perfil para alunos. Um admin aprova cada anúncio.',
    fr: 'Publie ton profil pour les élèves. Un admin approuve chaque fiche.',
    de: 'Veröffentliche dein Profil für Schüler. Ein Admin genehmigt jeden Eintrag.',
    it: 'Pubblica il tuo profilo per gli studenti. Un admin approva ogni inserzione.',
    ru: 'Опубликуйте профиль для учеников. Админ одобряет каждую анкету.',
    tr: 'Öğrenciler için profilini yayınla. Her liste bir yönetici tarafından onaylanır.',
    pl: 'Opublikuj profil dla uczniów. Administrator zatwierdza każde ogłoszenie.',
    ko: '학생들을 위해 프로필을 게시하세요. 모든 등록은 관리자가 승인합니다.',
    zh: '向学生公开你的资料。每条列表都需管理员审核。',
    hi: 'छात्रों के लिए अपनी प्रोफ़ाइल प्रकाशित करें। हर लिस्टिंग को एडमिन मंज़ूरी देता है।',
  },
  'Coach profile': {
    es: 'Perfil de coach', pt: 'Perfil de coach', fr: 'Profil de coach', de: 'Coach-Profil',
    it: 'Profilo coach', ru: 'Профиль тренера', tr: 'Koç profili', pl: 'Profil trenera',
    ko: '코치 프로필', zh: '教练资料', hi: 'कोच प्रोफ़ाइल',
  },
  'View directory': {
    es: 'Ver directorio', pt: 'Ver diretório', fr: 'Voir l’annuaire', de: 'Verzeichnis ansehen',
    it: 'Vedi elenco', ru: 'Открыть каталог', tr: 'Dizini gör', pl: 'Zobacz katalog',
    ko: '디렉터리 보기', zh: '查看目录', hi: 'डायरेक्टरी देखें',
  },
  'Students will see this in the public directory and will contact you outside the app.': {
    es: 'Los estudiantes verán esto en el directorio público y te contactarán fuera de la app.',
    pt: 'Os alunos verão isso no diretório público e entrarão em contato fora do app.',
    fr: 'Les élèves verront cela dans l’annuaire public et te contacteront en dehors de l’app.',
    de: 'Schüler sehen dies im öffentlichen Verzeichnis und kontaktieren dich außerhalb der App.',
    it: 'Gli studenti vedranno questo nell’elenco pubblico e ti contatteranno fuori dall’app.',
    ru: 'Ученики увидят это в открытом каталоге и свяжутся вне приложения.',
    tr: 'Öğrenciler bunu herkese açık dizinde görecek ve uygulama dışından iletişime geçecek.',
    pl: 'Uczniowie zobaczą to w publicznym katalogu i skontaktują się poza aplikacją.',
    ko: '학생들이 공개 디렉터리에서 이를 보고 앱 밖에서 연락할 것입니다.',
    zh: '学生将在公开目录中看到这些信息，并在应用外与你联系。',
    hi: 'छात्र इसे सार्वजनिक डायरेक्टरी में देखेंगे और ऐप के बाहर संपर्क करेंगे।',
  },
  'Add photo': {
    es: 'Agregar foto', pt: 'Adicionar foto', fr: 'Ajouter une photo', de: 'Foto hinzufügen',
    it: 'Aggiungi foto', ru: 'Добавить фото', tr: 'Fotoğraf ekle', pl: 'Dodaj zdjęcie',
    ko: '사진 추가', zh: '添加照片', hi: 'फ़ोटो जोड़ें',
  },
  'Remove photo': {
    es: 'Quitar foto', pt: 'Remover foto', fr: 'Retirer la photo', de: 'Foto entfernen',
    it: 'Rimuovi foto', ru: 'Убрать фото', tr: 'Fotoğrafı kaldır', pl: 'Usuń zdjęcie',
    ko: '사진 삭제', zh: '移除照片', hi: 'फ़ोटो हटाएँ',
  },
  'Photo updated': {
    es: 'Foto actualizada', pt: 'Foto atualizada', fr: 'Photo mise à jour', de: 'Foto aktualisiert',
    it: 'Foto aggiornata', ru: 'Фото обновлено', tr: 'Fotoğraf güncellendi', pl: 'Zdjęcie zaktualizowane',
    ko: '사진이 업데이트되었습니다', zh: '照片已更新', hi: 'फ़ोटो अपडेट हुई',
  },
  'Pending review': {
    es: 'Pendiente de revisión', pt: 'Aguardando análise', fr: 'En attente de validation', de: 'In Prüfung',
    it: 'In attesa di revisione', ru: 'На рассмотрении', tr: 'İncelemede', pl: 'Oczekuje na sprawdzenie',
    ko: '검토 대기 중', zh: '待审核', hi: 'समीक्षा लंबित',
  },
  'Approved — live in the directory': {
    es: 'Aprobado — visible en el directorio', pt: 'Aprovado — visível no diretório', fr: 'Approuvé — visible dans l’annuaire',
    de: 'Genehmigt — im Verzeichnis sichtbar', it: 'Approvato — visibile nell’elenco',
    ru: 'Одобрено — виден в каталоге', tr: 'Onaylandı — dizinde görünüyor', pl: 'Zatwierdzono — widoczny w katalogu',
    ko: '승인됨 — 디렉터리에 표시됩니다', zh: '已批准——已在目录中显示', hi: 'स्वीकृत — डायरेक्टरी में दिख रहा है',
  },
  'Rejected': {
    es: 'Rechazado', pt: 'Rejeitado', fr: 'Refusé', de: 'Abgelehnt',
    it: 'Rifiutato', ru: 'Отклонено', tr: 'Reddedildi', pl: 'Odrzucono',
    ko: '거부됨', zh: '已拒绝', hi: 'अस्वीकृत',
  },
  'Hidden': {
    es: 'Oculto', pt: 'Oculto', fr: 'Masqué', de: 'Ausgeblendet',
    it: 'Nascosto', ru: 'Скрыто', tr: 'Gizli', pl: 'Ukryto',
    ko: '숨김', zh: '已隐藏', hi: 'छिपा हुआ',
  },
  'Modality': {
    es: 'Modalidad', pt: 'Modalidade', fr: 'Modalité', de: 'Art',
    it: 'Modalità', ru: 'Формат', tr: 'Tür', pl: 'Forma',
    ko: '형태', zh: '方式', hi: 'प्रकार',
  },
  'Languages': {
    es: 'Idiomas', pt: 'Idiomas', fr: 'Langues', de: 'Sprachen',
    it: 'Lingue', ru: 'Языки', tr: 'Diller', pl: 'Języki',
    ko: '언어', zh: '语言', hi: 'भाषाएँ',
  },
  'Specialties': {
    es: 'Especialidades', pt: 'Especialidades', fr: 'Spécialités', de: 'Spezialgebiete',
    it: 'Specializzazioni', ru: 'Специализации', tr: 'Uzmanlıklar', pl: 'Specjalizacje',
    ko: '전문 분야', zh: '专长', hi: 'विशेषज्ञता',
  },
  'Add': {
    es: 'Agregar', pt: 'Adicionar', fr: 'Ajouter', de: 'Hinzufügen',
    it: 'Aggiungi', ru: 'Добавить', tr: 'Ekle', pl: 'Dodaj',
    ko: '추가', zh: '添加', hi: 'जोड़ें',
  },
  'Bio': {
    es: 'Biografía', pt: 'Bio', fr: 'Bio', de: 'Bio',
    it: 'Bio', ru: 'О себе', tr: 'Hakkında', pl: 'Bio',
    ko: '소개', zh: '简介', hi: 'परिचय',
  },
  'Rate (optional)': {
    es: 'Tarifa (opcional)', pt: 'Preço (opcional)', fr: 'Tarif (optionnel)', de: 'Preis (optional)',
    it: 'Tariffa (opzionale)', ru: 'Ставка (необязательно)', tr: 'Ücret (isteğe bağlı)', pl: 'Stawka (opcjonalnie)',
    ko: '요금 (선택)', zh: '收费（可选）', hi: 'शुल्क (वैकल्पिक)',
  },
  'Contact (shown publicly)': {
    es: 'Contacto (visible públicamente)', pt: 'Contato (visível publicamente)', fr: 'Contact (affiché publiquement)',
    de: 'Kontakt (öffentlich sichtbar)', it: 'Contatto (visibile pubblicamente)',
    ru: 'Контакты (видны всем)', tr: 'İletişim (herkese açık)', pl: 'Kontakt (widoczny publicznie)',
    ko: '연락처 (공개 표시됨)', zh: '联系方式（公开展示）', hi: 'संपर्क (सार्वजनिक दिखाया गया)',
  },
  'WhatsApp number': {
    es: 'Número de WhatsApp', pt: 'Número do WhatsApp', fr: 'Numéro WhatsApp', de: 'WhatsApp-Nummer',
    it: 'Numero WhatsApp', ru: 'Номер WhatsApp', tr: 'WhatsApp numarası', pl: 'Numer WhatsApp',
    ko: 'WhatsApp 번호', zh: 'WhatsApp 号码', hi: 'WhatsApp नंबर',
  },
  'Instagram username': {
    es: 'Usuario de Instagram', pt: 'Usuário do Instagram', fr: 'Pseudo Instagram', de: 'Instagram-Benutzername',
    it: 'Nome utente Instagram', ru: 'Имя в Instagram', tr: 'Instagram kullanıcı adı', pl: 'Nazwa na Instagramie',
    ko: 'Instagram 사용자 이름', zh: 'Instagram 用户名', hi: 'Instagram यूज़रनेम',
  },
  'Website URL': {
    es: 'URL del sitio web', pt: 'URL do site', fr: 'URL du site', de: 'Webseiten-URL',
    it: 'URL del sito', ru: 'URL сайта', tr: 'Web sitesi URL’si', pl: 'Adres strony',
    ko: '웹사이트 URL', zh: '网站链接', hi: 'वेबसाइट URL',
  },
  'Sent for review — an admin will approve your listing.': {
    es: 'Enviado a revisión — un administrador aprobará tu ficha.',
    pt: 'Enviado para análise — um admin aprovará seu anúncio.',
    fr: 'Envoyé pour validation — un admin approuvera ta fiche.',
    de: 'Zur Prüfung eingereicht — ein Admin genehmigt deinen Eintrag.',
    it: 'Inviato per revisione — un admin approverà la tua inserzione.',
    ru: 'Отправлено на проверку — админ одобрит вашу анкету.',
    tr: 'İncelemeye gönderildi — bir yönetici listenizi onaylayacak.',
    pl: 'Wysłano do sprawdzenia — administrator zatwierdzi Twoje ogłoszenie.',
    ko: '검토 요청됨 — 관리자가 등록을 승인할 것입니다.',
    zh: '已提交审核——管理员将批准你的列表。',
    hi: 'समीक्षा के लिए भेजा गया — एडमिन आपकी लिस्टिंग मंज़ूर करेगा।',
  },
  'Tell students who you help and how.': {
    es: 'Cuenta a quién ayudas y cómo.', pt: 'Diga a quem você ajuda e como.', fr: 'Dis à qui tu aides et comment.',
    de: 'Sag, wem du hilfst und wie.', it: 'Dì a chi aiuti e come.', ru: 'Расскажите, кому и как вы помогаете.',
    tr: 'Kime ve nasıl yardım ettiğini anlat.', pl: 'Powiedz, komu i jak pomagasz.',
    ko: '누구를 어떻게 돕는지 알려주세요.', zh: '说明你帮助谁以及如何帮助。', hi: 'बताएं आप किसे और कैसे मदद करते हैं।',
  },
  'e.g. powerlifting': {
    es: 'ej. powerlifting', pt: 'ex. powerlifting', fr: 'ex. powerlifting', de: 'z. B. Powerlifting',
    it: 'es. powerlifting', ru: 'напр. пауэрлифтинг', tr: 'örn. powerlifting', pl: 'np. powerlifting',
    ko: '예: 파워리프팅', zh: '例如力量举', hi: 'जैसे पावरलिफ्टिंग',
  },
  'NSCA-CSCS, ISSA…': {
    es: 'NSCA-CSCS, ISSA…', pt: 'NSCA-CSCS, ISSA…', fr: 'NSCA-CSCS, ISSA…', de: 'NSCA-CSCS, ISSA…',
    it: 'NSCA-CSCS, ISSA…', ru: 'NSCA-CSCS, ISSA…', tr: 'NSCA-CSCS, ISSA…', pl: 'NSCA-CSCS, ISSA…',
    ko: 'NSCA-CSCS, ISSA…', zh: 'NSCA-CSCS、ISSA…', hi: 'NSCA-CSCS, ISSA…',
  },
}

const packs = fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'index.js')
let added = 0
for (const file of packs) {
  const lang = file.replace('.js', '')
  if (!(lang in { es: 1, pt: 1, fr: 1, de: 1, it: 1, ru: 1, tr: 1, pl: 1, ko: 1, zh: 1, hi: 1 })) continue
  const fp = path.join(dir, file)
  let src = fs.readFileSync(fp, 'utf8')
  const lines = []
  for (const [key, langs] of Object.entries(T)) {
    if (src.includes(JSON.stringify(key))) continue          // already translated — skip
    const val = langs[lang] ?? key
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(val)},`)
    added++
  }
  if (!lines.length) continue
  const close = src.lastIndexOf('}')
  src = src.slice(0, close) + lines.join('\n') + '\n' + src.slice(close)
  fs.writeFileSync(fp, src)
  console.log(file + ': +' + lines.length)
}
console.log('total added:', added)
