"use client";

import {
  ChangeEvent,
  FormEvent,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ActiveRun,
  AdminUser,
  Pack,
  PackItem,
  PlaylistImportIssue,
  ProfilePlaylistPreview,
  SavedResult,
  Session,
  SourceType,
  UndoSnapshot,
  User,
  YouTubeImportResult,
  YouTubeProfilePreview,
} from "../lib/types";

type View = "home" | "packs" | "modes" | "hill" | "admin";
type Language = "en" | "ru" | "uk";
type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
type EditablePack = {
  id?: string;
  name: string;
  sourceType: SourceType;
  sourceUrl: string;
  coverType: "thumbnail" | "emoji";
  coverValue: string;
  skipped: number;
  duplicates: number;
  issues: PlaylistImportIssue[];
  selectedVideoIds: string[];
  items: Array<Omit<PackItem, "id" | "position">>;
};

const LANG_KEY = "mranking-language-v1";
const COVER_EMOJIS = [
  "🎧",
  "🎸",
  "🛹",
  "⚡",
  "🔥",
  "👾",
  "💿",
  "🧃",
  "🏆",
  "♛",
];
const PROFILE_EMOJIS = [
  "🎧",
  "🎸",
  "👾",
  "🧠",
  "🐸",
  "🦝",
  "🪩",
  "⚡",
  "🛹",
  "♛",
];

const TRANSLATIONS: Record<Exclude<Language, "en">, Record<string, string>> = {
  ru: {
    "Upload pack": "Загрузить пак",
    Packs: "Паки",
    Modes: "Режимы",
    "King of the Hill": "Король горы",
    Admin: "Админ",
    "Sign in": "Войти",
    "Sign out": "Выйти",
    "Choose language": "Выбрать язык",
    "Main navigation": "Основная навигация",
    "MRanking home": "Главная MRanking",
    UPLOAD: "ЗАГРУЗИ",
    SPLIT: "РАЗДЕЛИ",
    COMPARE: "СРАВНИ",
    CROWN: "КОРОНУЙ",
    "Rate it. Run it. Crown it.": "Оцени. Столкни. Коронуй.",
    "Rate it.": "Оцени.",
    "Run it.": "Столкни.",
    "Crown it.": "Коронуй.",
    "Start a tournament": "Начать турнир",
    "TOURNAMENT ENGINE": "ТУРНИРНЫЙ ДВИЖОК",
    "ONE SOURCE": "ОДИН ИСТОЧНИК",
    "MANY CONTENDERS": "МНОГО УЧАСТНИКОВ",
    "ONE WINNER": "ОДИН ПОБЕДИТЕЛЬ",
    "Choose a source": "Выбери источник",
    "Turn a link, file or collection into something you can rank.":
      "Преврати ссылку, файл или коллекцию в то, что можно оценивать.",
    "WORKS NOW": "РАБОТАЕТ",
    "COMING SOON": "СКОРО",
    "YouTube Playlist": "Плейлист YouTube",
    "YouTube Music": "YouTube Music",
    "Music Service": "Музыкальный сервис",
    "Choose a music service": "Выбери музыкальный сервис",
    "Select where your playlist lives.": "Выбери, где находится твой плейлист.",
    "YouTube / YouTube Music": "YouTube / YouTube Music",
    "Yandex Music": "Яндекс Музыка",
    "Image Collection": "Коллекция изображений",
    "Text / CSV List": "Текст / CSV",
    "Spotify Playlist": "Плейлист Spotify",
    "Web Page": "Веб-страница",
    "File Upload": "Загрузка файла",
    "Paste playlist link": "Вставь ссылку на плейлист",
    "Paste playlist or profile link": "Вставь ссылку на плейлист или профиль",
    "Use a public playlist or profile from YouTube or YouTube Music.":
      "Используй публичный плейлист или профиль YouTube либо YouTube Music.",
    "Use a public Spotify playlist.": "Используй публичный плейлист Spotify.",
    "Use a public Yandex Music playlist.":
      "Используй публичный плейлист Яндекс Музыки.",
    "Read link": "Прочитать ссылку",
    "Back to link": "Назад к ссылке",
    "Back to playlists": "Назад к плейлистам",
    "Back to music services": "Назад к музыкальным сервисам",
    Back: "Назад",
    "PUBLIC PROFILE": "ПУБЛИЧНЫЙ ПРОФИЛЬ",
    "public playlists": "публичных плейлистов",
    "No profile picture": "Нет фотографии профиля",
    "No public playlists found": "Публичные плейлисты не найдены",
    "Only public playlists can be imported.":
      "Импортировать можно только публичные плейлисты.",
    "Try again": "Попробовать снова",
    Playlist: "Плейлист",
    "Reading link": "Читаем ссылку",
    "Looking for a playlist or public profile.":
      "Ищем плейлист или публичный профиль.",
    "Public and unlisted playlists are supported.":
      "Поддерживаются публичные плейлисты и доступные по ссылке.",
    "Read playlist": "Прочитать плейлист",
    "Back to sources": "Назад к источникам",
    "Reading playlist": "Читаем плейлист",
    "Finding every available video and removing duplicates.":
      "Ищем все доступные видео и убираем повторы.",
    "Cancel import": "Отменить импорт",
    "Edit imported pack": "Редактировать импортированный пак",
    "Pack name": "Название пака",
    Cover: "Обложка",
    "Playlist thumbnail": "Превью плейлиста",
    "Videos ready": "Видео готово",
    "Tracks ready": "Треков готово",
    tracks: "треков",
    Skipped: "Пропущено",
    Duplicates: "Повторы",
    Selected: "Выбрано",
    "Random selection": "Случайный выбор",
    "Choose how many tracks stay in the pack.":
      "Выберите, сколько треков останется в паке.",
    All: "Все",
    Excluded: "Исключено",
    Duplicate: "Дубликат",
    "Unavailable tracks": "Недоступные треки",
    "Unavailable track": "Недоступный трек",
    "Repeated tracks": "Повторяющиеся треки",
    "Playlist tracks": "Треки плейлиста",
    "Duplicates are unchecked automatically; one copy stays selected.":
      "Повторы исключены автоматически — одна копия остаётся выбранной.",
    "Skipped tracks are hidden from public imports — usually private, deleted, region-restricted or unavailable in the music service.":
      "Пропущенные треки скрыты от публичного импорта — обычно они приватные, удалённые, недоступны в регионе или в самом сервисе.",
    Remove: "Удалить",
    "Save and choose mode": "Сохранить и выбрать режим",
    "Save pack": "Сохранить пак",
    "A pack needs at least 16 videos":
      "В паке должно остаться минимум 16 видео",
    "Choose a mode": "Выбери режим",
    "One pack. Several ways to settle it.":
      "Один пак. Несколько способов определить победителя.",
    "PLAY NOW": "ИГРАТЬ",
    "Tier List": "Тир-лист",
    "Blind Ranking": "Слепой рейтинг",
    "Score Everything": "Оценить всё",
    "Keep or Drop": "Оставить или выбросить",
    "Single Elimination": "Олимпийская сетка",
    "Pick one of two until only one remains.":
      "Выбирай одного из двух, пока не останется победитель.",
    "Build tiers and drag every contender into place.":
      "Создавай тиры и расставляй участников.",
    "Rank without seeing what comes next.":
      "Ранжируй, не зная, что появится дальше.",
    "Give every item an independent score.":
      "Поставь каждому участнику отдельную оценку.",
    "Make one brutal yes-or-no decision at a time.":
      "Принимай по одному жестокому решению да или нет.",
    "Classic fixed tournament bracket.":
      "Классическая фиксированная турнирная сетка.",
    "Your recent packs": "Твои недавние паки",
    "Import a playlist": "Импортировать плейлист",
    "No packs yet": "Паков пока нет",
    "Your imported playlists will appear here.":
      "Загруженные плейлисты появятся здесь.",
    Continue: "Продолжить",
    Play: "Играть",
    Edit: "Изменить",
    Export: "Экспорт",
    Delete: "Удалить",
    "Recent crowns": "Недавние победители",
    "Tournament history": "История турниров",
    "Open any completed run and inspect every battle.":
      "Открой любой завершённый турнир и просмотри каждую битву.",
    "View bracket": "Смотреть сетку",
    "Delete history": "Удалить историю",
    "Delete saved tournament “{name}”?":
      "Удалить сохранённый турнир «{name}»?",
    videos: "видео",
    "ROUND {count}": "РАУНД {count}",
    "Choose the one that stays": "Выбери того, кто останется",
    "Play video": "Включить видео",
    "Close player": "Закрыть плеер",
    "Open on YouTube": "Открыть на YouTube",
    "Open in music service": "Открыть в музыкальном сервисе",
    "Play track": "Включить трек",
    "Choose this": "Выбрать",
    Undo: "Отменить",
    "Skip pair": "Отложить пару",
    Exit: "Выйти",
    "We have a winner": "У нас есть победитель",
    "Archived result": "Сохранённый результат",
    Completed: "Завершено",
    "Long live the champion.": "Да здравствует чемпион.",
    "Full ranking": "Полный рейтинг",
    "Play again": "Играть снова",
    "Back to packs": "К пакам",
    "Sign in to continue": "Войди, чтобы продолжить",
    Nickname: "Никнейм",
    Password: "Пароль",
    "Invalid nickname or password": "Неверный никнейм или пароль",
    Profile: "Профиль",
    "Upload avatar": "Загрузить аватар",
    "Avatar must be smaller than 2 MB": "Аватар должен быть меньше 2 МБ",
    "User control": "Управление пользователями",
    "Create accounts, reset passwords and preserve their packs.":
      "Создавай аккаунты, сбрасывай пароли и сохраняй их паки.",
    "All private packs": "Все приватные паки",
    "Every imported pack and its owner.":
      "Все импортированные паки и их владельцы.",
    "No packs have been imported yet.": "Пока не импортировано ни одного пака.",
    "Create user": "Создать пользователя",
    "New password": "Новый пароль",
    "Reset password": "Сбросить пароль",
    "Delete user": "Удалить пользователя",
    Active: "Активен",
    Deleted: "Удалён",
    packs: "паков",
    "Local prototype": "Локальный прототип",
    "Pack saved": "Пак сохранён",
    "Pack deleted": "Пак удалён",
    "Playlist imported": "Плейлист импортирован",
    "Result saved": "Результат сохранён",
    "Tournament deleted": "Турнир удалён",
    "User created": "Пользователь создан",
    "Password reset": "Пароль сброшен",
    "User deleted; their packs were preserved":
      "Пользователь удалён; его паки сохранены",
    "Something went wrong": "Что-то пошло не так",
    "LOADING ARENA": "ЗАГРУЗКА АРЕНЫ",
    ITEMS: "ПОЗИЦИЙ",
    "THE ONE": "ПОБЕДИТЕЛЬ",
    INPUT: "ИСТОЧНИК",
    IMPORTING: "ИМПОРТ",
    REVIEW: "ПРОВЕРКА",
    READY: "ГОТОВО",
    FORMAT: "ФОРМАТ",
    "YOUR LIBRARY": "ТВОЯ БИБЛИОТЕКА",
    PLAYOFF: "ПЛЕЙ-ОФФ",
    "Tournament bracket": "Турнирная сетка",
    "Every battle leads to one champion.":
      "Каждая битва ведёт к одному чемпиону.",
    "Follow every winner through an unbroken path to the final.":
      "Проследи непрерывный путь каждого победителя до финала.",
    "Scroll sideways and vertically to inspect the full run.":
      "Прокручивай по горизонтали и вертикали, чтобы увидеть весь турнир.",
    "Full tournament bracket": "Полная турнирная сетка",
    BATTLES: "БИТВ",
    BATTLE: "БИТВА",
    ROUNDS: "РАУНДОВ",
    CONTENDERS: "УЧАСТНИКОВ",
    FINAL: "ФИНАЛ",
    WIN: "ПОБЕДА",
    "Deleted track": "Удалённый трек",
    "{count} LEFT": "ОСТАЛОСЬ ПАР: {count}",
    "PRIVATE ARENA": "ПРИВАТНАЯ АРЕНА",
    "ADMIN ONLY": "ТОЛЬКО АДМИН",
    User: "Пользователь",
    "Animated tournament bracket": "Анимированная турнирная сетка",
    "LIVE BRACKET / 64 ENTRIES": "ЖИВАЯ СЕТКА / 64 УЧАСТНИКА",
    "Choose how you want to rate your private packs.":
      "Выбери, как оценивать свои приватные паки.",
    "Your packs": "Твои паки",
    "Only you can see the packs uploaded to this account.":
      "Загруженные в этот аккаунт паки видишь только ты.",
    "Back to modes": "Назад к режимам",
    "Choose a pack": "Выбери пак",
    "Select one of your private packs to start the tournament.":
      "Выбери один из своих приватных паков, чтобы начать турнир.",
    "Upload a pack before starting a mode.":
      "Сначала загрузи пак, а затем запускай режим.",
    "Go to packs": "Перейти к пакам",
    Champion: "Победитель",
    "Deleted pack": "Удалённый пак",
    "Paste a valid YouTube or YouTube Music URL":
      "Вставь корректную ссылку YouTube или YouTube Music",
    "Paste a YouTube URL": "Вставь ссылку YouTube",
    "This link does not contain a YouTube profile":
      "В этой ссылке нет профиля YouTube",
    "The YouTube page was not found": "Страница YouTube не найдена",
    "YouTube did not return this page": "YouTube не отдал эту страницу",
    "Paste a valid YouTube playlist URL":
      "Вставь корректную ссылку на плейлист YouTube",
    "Only YouTube and YouTube Music links are supported":
      "Поддерживаются только ссылки YouTube и YouTube Music",
    "Paste a valid Spotify playlist URL":
      "Вставь корректную ссылку на плейлист Spotify",
    "Only Spotify links are supported here":
      "Здесь поддерживаются только ссылки Spotify",
    "This link does not contain a Spotify playlist":
      "В этой ссылке нет плейлиста Spotify",
    "The Spotify playlist was not found": "Плейлист Spotify не найден",
    "Spotify did not return this playlist": "Spotify не отдал этот плейлист",
    "Spotify did not return playlist tracks": "Spotify не отдал треки плейлиста",
    "Spotify returned an unreadable playlist":
      "Spotify вернул нечитаемый плейлист",
    "The Spotify playlist is private, unavailable or contains no playable tracks":
      "Плейлист Spotify приватный, недоступен или не содержит доступных треков",
    "Paste a valid Yandex Music playlist URL":
      "Вставь корректную ссылку на плейлист Яндекс Музыки",
    "Only Yandex Music links are supported here":
      "Здесь поддерживаются только ссылки Яндекс Музыки",
    "This link does not contain a Yandex Music playlist":
      "В этой ссылке нет плейлиста Яндекс Музыки",
    "The Yandex Music playlist was not found":
      "Плейлист Яндекс Музыки не найден",
    "Yandex Music did not return this playlist":
      "Яндекс Музыка не отдала этот плейлист",
    "Yandex Music is unavailable in this region (451)":
      "Яндекс Музыка недоступна в этом регионе (451)",
    "The Yandex Music playlist is private, unavailable or contains no playable tracks":
      "Плейлист Яндекс Музыки приватный, недоступен или не содержит доступных треков",
    "This link does not contain a playlist": "В этой ссылке нет плейлиста",
    "The playlist was not found": "Плейлист не найден",
    "YouTube did not return this playlist": "YouTube не отдал этот плейлист",
    "The playlist is private, unavailable or contains no playable videos":
      "Плейлист приватный, недоступный или не содержит доступных видео",
    "A pack needs at least 16 items": "В паке должно быть минимум 16 позиций",
    "Pack name is required": "Нужно название пака",
    "Authentication required": "Нужно войти в аккаунт",
    "Nickname is too short": "Никнейм слишком короткий",
    "Password needs at least 6 characters":
      "Пароль должен содержать минимум 6 символов",
    "Nickname is already taken": "Этот никнейм уже занят",
    "Delete “{name}”?": "Удалить «{name}»?",
    "Delete {name}?": "Удалить {name}?",
  },
  uk: {
    "Upload pack": "Завантажити пак",
    Packs: "Паки",
    Modes: "Режими",
    "King of the Hill": "Король гори",
    Admin: "Адмін",
    "Sign in": "Увійти",
    "Sign out": "Вийти",
    "Choose language": "Обрати мову",
    "Main navigation": "Основна навігація",
    "MRanking home": "Головна MRanking",
    UPLOAD: "ЗАВАНТАЖ",
    SPLIT: "РОЗДІЛИ",
    COMPARE: "ПОРІВНЯЙ",
    CROWN: "КОРОНУЙ",
    "Rate it. Run it. Crown it.": "Оціни. Зіткни. Короную.",
    "Rate it.": "Оціни.",
    "Run it.": "Зіткни.",
    "Crown it.": "Короную.",
    "Start a tournament": "Почати турнір",
    "TOURNAMENT ENGINE": "ТУРНІРНИЙ ДВИГУН",
    "ONE SOURCE": "ОДНЕ ДЖЕРЕЛО",
    "MANY CONTENDERS": "БАГАТО УЧАСНИКІВ",
    "ONE WINNER": "ОДИН ПЕРЕМОЖЕЦЬ",
    "Choose a source": "Обери джерело",
    "Turn a link, file or collection into something you can rank.":
      "Перетвори посилання, файл або колекцію на те, що можна оцінювати.",
    "WORKS NOW": "ПРАЦЮЄ",
    "COMING SOON": "НЕЗАБАРОМ",
    "YouTube Playlist": "Плейлист YouTube",
    "YouTube Music": "YouTube Music",
    "Music Service": "Музичний сервіс",
    "Choose a music service": "Обери музичний сервіс",
    "Select where your playlist lives.": "Обери, де знаходиться твій плейлист.",
    "YouTube / YouTube Music": "YouTube / YouTube Music",
    "Yandex Music": "Яндекс Музика",
    "Image Collection": "Колекція зображень",
    "Text / CSV List": "Текст / CSV",
    "Spotify Playlist": "Плейлист Spotify",
    "Web Page": "Вебсторінка",
    "File Upload": "Завантаження файлу",
    "Paste playlist link": "Встав посилання на плейлист",
    "Paste playlist or profile link": "Встав посилання на плейлист або профіль",
    "Use a public playlist or profile from YouTube or YouTube Music.":
      "Використовуй публічний плейлист або профіль YouTube чи YouTube Music.",
    "Use a public Spotify playlist.": "Використовуй публічний плейлист Spotify.",
    "Use a public Yandex Music playlist.":
      "Використовуй публічний плейлист Яндекс Музики.",
    "Read link": "Прочитати посилання",
    "Back to link": "Назад до посилання",
    "Back to playlists": "Назад до плейлистів",
    "Back to music services": "Назад до музичних сервісів",
    Back: "Назад",
    "PUBLIC PROFILE": "ПУБЛІЧНИЙ ПРОФІЛЬ",
    "public playlists": "публічних плейлистів",
    "No profile picture": "Немає фотографії профілю",
    "No public playlists found": "Публічних плейлистів не знайдено",
    "Only public playlists can be imported.":
      "Імпортувати можна лише публічні плейлисти.",
    "Try again": "Спробувати знову",
    Playlist: "Плейлист",
    "Reading link": "Читаємо посилання",
    "Looking for a playlist or public profile.":
      "Шукаємо плейлист або публічний профіль.",
    "Public and unlisted playlists are supported.":
      "Підтримуються публічні плейлисти та доступні за посиланням.",
    "Read playlist": "Прочитати плейлист",
    "Back to sources": "Назад до джерел",
    "Reading playlist": "Читаємо плейлист",
    "Finding every available video and removing duplicates.":
      "Шукаємо всі доступні відео та прибираємо дублікати.",
    "Cancel import": "Скасувати імпорт",
    "Edit imported pack": "Редагувати імпортований пак",
    "Pack name": "Назва паку",
    Cover: "Обкладинка",
    "Playlist thumbnail": "Прев'ю плейлиста",
    "Videos ready": "Відео готово",
    "Tracks ready": "Треків готово",
    tracks: "треків",
    Skipped: "Пропущено",
    Duplicates: "Дублікати",
    Selected: "Обрано",
    "Random selection": "Випадковий вибір",
    "Choose how many tracks stay in the pack.":
      "Оберіть, скільки треків залишиться в паку.",
    All: "Усі",
    Excluded: "Виключено",
    Duplicate: "Дублікат",
    "Unavailable tracks": "Недоступні треки",
    "Unavailable track": "Недоступний трек",
    "Repeated tracks": "Треки, що повторюються",
    "Playlist tracks": "Треки плейлиста",
    "Duplicates are unchecked automatically; one copy stays selected.":
      "Дублікати виключені автоматично — одна копія залишається обраною.",
    "Skipped tracks are hidden from public imports — usually private, deleted, region-restricted or unavailable in the music service.":
      "Пропущені треки приховані від публічного імпорту — зазвичай вони приватні, видалені, недоступні в регіоні або в самому сервісі.",
    Remove: "Видалити",
    "Save and choose mode": "Зберегти й обрати режим",
    "Save pack": "Зберегти пак",
    "A pack needs at least 16 videos":
      "У паку має залишитися щонайменше 16 відео",
    "Choose a mode": "Обери режим",
    "One pack. Several ways to settle it.":
      "Один пак. Кілька способів визначити переможця.",
    "PLAY NOW": "ГРАТИ",
    "Tier List": "Тир-лист",
    "Blind Ranking": "Сліпий рейтинг",
    "Score Everything": "Оцінити все",
    "Keep or Drop": "Залишити чи викинути",
    "Single Elimination": "Олімпійська сітка",
    "Pick one of two until only one remains.":
      "Обирай одного з двох, доки не залишиться переможець.",
    "Build tiers and drag every contender into place.":
      "Створюй тири та розставляй учасників.",
    "Rank without seeing what comes next.": "Ранжуй, не знаючи, що буде далі.",
    "Give every item an independent score.":
      "Постав кожному учаснику окрему оцінку.",
    "Make one brutal yes-or-no decision at a time.":
      "Приймай по одному жорсткому рішенню так чи ні.",
    "Classic fixed tournament bracket.": "Класична фіксована турнірна сітка.",
    "Your recent packs": "Твої недавні паки",
    "Import a playlist": "Імпортувати плейлист",
    "No packs yet": "Паків поки немає",
    "Your imported playlists will appear here.":
      "Імпортовані плейлисти з'являться тут.",
    Continue: "Продовжити",
    Play: "Грати",
    Edit: "Змінити",
    Export: "Експорт",
    Delete: "Видалити",
    "Recent crowns": "Недавні переможці",
    "Tournament history": "Історія турнірів",
    "Open any completed run and inspect every battle.":
      "Відкрий будь-який завершений турнір і переглянь кожну битву.",
    "View bracket": "Дивитися сітку",
    "Delete history": "Видалити історію",
    "Delete saved tournament “{name}”?":
      "Видалити збережений турнір «{name}»?",
    videos: "відео",
    "ROUND {count}": "РАУНД {count}",
    "Choose the one that stays": "Обери того, хто залишиться",
    "Play video": "Увімкнути відео",
    "Close player": "Закрити плеєр",
    "Open on YouTube": "Відкрити на YouTube",
    "Open in music service": "Відкрити в музичному сервісі",
    "Play track": "Увімкнути трек",
    "Choose this": "Обрати",
    Undo: "Скасувати",
    "Skip pair": "Відкласти пару",
    Exit: "Вийти",
    "We have a winner": "У нас є переможець",
    "Archived result": "Збережений результат",
    Completed: "Завершено",
    "Long live the champion.": "Хай живе чемпіон.",
    "Full ranking": "Повний рейтинг",
    "Play again": "Грати знову",
    "Back to packs": "До паків",
    "Sign in to continue": "Увійди, щоб продовжити",
    Nickname: "Нікнейм",
    Password: "Пароль",
    "Invalid nickname or password": "Невірний нікнейм або пароль",
    Profile: "Профіль",
    "Upload avatar": "Завантажити аватар",
    "Avatar must be smaller than 2 MB": "Аватар має бути меншим за 2 МБ",
    "User control": "Керування користувачами",
    "Create accounts, reset passwords and preserve their packs.":
      "Створюй акаунти, скидай паролі та зберігай їхні паки.",
    "All private packs": "Усі приватні паки",
    "Every imported pack and its owner.":
      "Усі імпортовані паки та їхні власники.",
    "No packs have been imported yet.": "Ще не імпортовано жодного пака.",
    "Create user": "Створити користувача",
    "New password": "Новий пароль",
    "Reset password": "Скинути пароль",
    "Delete user": "Видалити користувача",
    Active: "Активний",
    Deleted: "Видалений",
    packs: "паків",
    "Local prototype": "Локальний прототип",
    "Pack saved": "Пак збережено",
    "Pack deleted": "Пак видалено",
    "Playlist imported": "Плейлист імпортовано",
    "Result saved": "Результат збережено",
    "Tournament deleted": "Турнір видалено",
    "User created": "Користувача створено",
    "Password reset": "Пароль скинуто",
    "User deleted; their packs were preserved":
      "Користувача видалено; його паки збережено",
    "Something went wrong": "Щось пішло не так",
    "LOADING ARENA": "ЗАВАНТАЖЕННЯ АРЕНИ",
    ITEMS: "ПОЗИЦІЙ",
    "THE ONE": "ПЕРЕМОЖЕЦЬ",
    INPUT: "ДЖЕРЕЛО",
    IMPORTING: "ІМПОРТ",
    REVIEW: "ПЕРЕВІРКА",
    READY: "ГОТОВО",
    FORMAT: "ФОРМАТ",
    "YOUR LIBRARY": "ТВОЯ БІБЛІОТЕКА",
    PLAYOFF: "ПЛЕЙ-ОФФ",
    "Tournament bracket": "Турнірна сітка",
    "Every battle leads to one champion.":
      "Кожна битва веде до одного чемпіона.",
    "Follow every winner through an unbroken path to the final.":
      "Простеж безперервний шлях кожного переможця до фіналу.",
    "Scroll sideways and vertically to inspect the full run.":
      "Прокручуй горизонтально й вертикально, щоб побачити весь турнір.",
    "Full tournament bracket": "Повна турнірна сітка",
    BATTLES: "БИТВ",
    BATTLE: "БИТВА",
    ROUNDS: "РАУНДІВ",
    CONTENDERS: "УЧАСНИКІВ",
    FINAL: "ФІНАЛ",
    WIN: "ПЕРЕМОГА",
    "Deleted track": "Видалений трек",
    "{count} LEFT": "ЗАЛИШИЛОСЯ ПАР: {count}",
    "PRIVATE ARENA": "ПРИВАТНА АРЕНА",
    "ADMIN ONLY": "ЛИШЕ АДМІН",
    User: "Користувач",
    "Animated tournament bracket": "Анімована турнірна сітка",
    "LIVE BRACKET / 64 ENTRIES": "ЖИВА СІТКА / 64 УЧАСНИКИ",
    "Choose how you want to rate your private packs.":
      "Обери, як оцінювати свої приватні паки.",
    "Your packs": "Твої паки",
    "Only you can see the packs uploaded to this account.":
      "Паки, завантажені в цей акаунт, бачиш лише ти.",
    "Back to modes": "Назад до режимів",
    "Choose a pack": "Обери пак",
    "Select one of your private packs to start the tournament.":
      "Обери один зі своїх приватних паків, щоб почати турнір.",
    "Upload a pack before starting a mode.":
      "Спочатку завантаж пак, а потім запускай режим.",
    "Go to packs": "Перейти до паків",
    Champion: "Переможець",
    "Deleted pack": "Видалений пак",
    "Paste a valid YouTube or YouTube Music URL":
      "Встав коректне посилання YouTube або YouTube Music",
    "Paste a YouTube URL": "Встав посилання YouTube",
    "This link does not contain a YouTube profile":
      "Це посилання не містить профілю YouTube",
    "The YouTube page was not found": "Сторінку YouTube не знайдено",
    "YouTube did not return this page": "YouTube не повернув цю сторінку",
    "Paste a valid YouTube playlist URL":
      "Встав коректне посилання на плейлист YouTube",
    "Only YouTube and YouTube Music links are supported":
      "Підтримуються лише посилання YouTube та YouTube Music",
    "Paste a valid Spotify playlist URL":
      "Встав коректне посилання на плейлист Spotify",
    "Only Spotify links are supported here":
      "Тут підтримуються лише посилання Spotify",
    "This link does not contain a Spotify playlist":
      "Це посилання не містить плейлиста Spotify",
    "The Spotify playlist was not found": "Плейлист Spotify не знайдено",
    "Spotify did not return this playlist": "Spotify не повернув цей плейлист",
    "Spotify did not return playlist tracks": "Spotify не повернув треки плейлиста",
    "Spotify returned an unreadable playlist":
      "Spotify повернув нечитабельний плейлист",
    "The Spotify playlist is private, unavailable or contains no playable tracks":
      "Плейлист Spotify приватний, недоступний або не містить доступних треків",
    "Paste a valid Yandex Music playlist URL":
      "Встав коректне посилання на плейлист Яндекс Музики",
    "Only Yandex Music links are supported here":
      "Тут підтримуються лише посилання Яндекс Музики",
    "This link does not contain a Yandex Music playlist":
      "Це посилання не містить плейлиста Яндекс Музики",
    "The Yandex Music playlist was not found":
      "Плейлист Яндекс Музики не знайдено",
    "Yandex Music did not return this playlist":
      "Яндекс Музика не повернула цей плейлист",
    "Yandex Music is unavailable in this region (451)":
      "Яндекс Музика недоступна в цьому регіоні (451)",
    "The Yandex Music playlist is private, unavailable or contains no playable tracks":
      "Плейлист Яндекс Музики приватний, недоступний або не містить доступних треків",
    "This link does not contain a playlist":
      "Це посилання не містить плейлиста",
    "The playlist was not found": "Плейлист не знайдено",
    "YouTube did not return this playlist": "YouTube не повернув цей плейлист",
    "The playlist is private, unavailable or contains no playable videos":
      "Плейлист приватний, недоступний або не містить доступних відео",
    "A pack needs at least 16 items": "У паку має бути щонайменше 16 позицій",
    "Pack name is required": "Потрібна назва паку",
    "Authentication required": "Потрібно увійти в акаунт",
    "Nickname is too short": "Нікнейм надто короткий",
    "Password needs at least 6 characters":
      "Пароль має містити щонайменше 6 символів",
    "Nickname is already taken": "Цей нікнейм уже зайнятий",
    "Delete “{name}”?": "Видалити «{name}»?",
    "Delete {name}?": "Видалити {name}?",
  },
};

const I18nContext = createContext<{ language: Language; t: Translate }>({
  language: "en",
  t: (key) => key,
});
const useI18n = () => useContext(I18nContext);

function translate(
  language: Language,
  key: string,
  values?: Record<string, string | number>,
) {
  let output = language === "en" ? key : (TRANSLATIONS[language][key] ?? key);
  for (const [name, value] of Object.entries(values ?? {}))
    output = output.replaceAll(`{${name}}`, String(value));
  return output;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function createRound(
  ids: string[],
  packId: string,
  round = 1,
  base?: Pick<Session, "id" | "matches" | "eliminated" | "startedAt">,
): Session {
  const shuffled = shuffle(ids);
  const carryId = shuffled.length % 2 === 1 ? (shuffled.pop() ?? null) : null;
  const pairs: [string, string][] = [];
  for (let index = 0; index < shuffled.length; index += 2)
    pairs.push([shuffled[index], shuffled[index + 1]]);
  const activePair = pairs.shift();
  if (!activePair) throw new Error("A round needs at least two items");
  return {
    id: base?.id ?? `run-${crypto.randomUUID()}`,
    packId,
    round,
    roundStartCount: ids.length,
    activePair,
    pendingPairs: pairs,
    roundWinners: [],
    carryId,
    isCarryMatch: false,
    matches: base?.matches ?? [],
    eliminated: base?.eliminated ?? [],
    startedAt: base?.startedAt ?? new Date().toISOString(),
    status: "active",
    championId: null,
  };
}

function snapshot(session: Session): UndoSnapshot {
  return {
    round: session.round,
    roundStartCount: session.roundStartCount,
    activePair: [...session.activePair],
    pendingPairs: session.pendingPairs.map(
      (pair) => [...pair] as [string, string],
    ),
    roundWinners: [...session.roundWinners],
    carryId: session.carryId,
    isCarryMatch: session.isCarryMatch,
    matchCount: session.matches.length,
    eliminationCount: session.eliminated.length,
    status: session.status,
    championId: session.championId,
  };
}

function restore(session: Session, state: UndoSnapshot): Session {
  return {
    ...session,
    round: state.round,
    roundStartCount: state.roundStartCount,
    activePair: [...state.activePair],
    pendingPairs: state.pendingPairs.map(
      (pair) => [...pair] as [string, string],
    ),
    roundWinners: [...state.roundWinners],
    carryId: state.carryId,
    isCarryMatch: state.isCarryMatch,
    matches: session.matches.slice(0, state.matchCount),
    eliminated: session.eliminated.slice(0, state.eliminationCount),
    status: state.status,
    championId: state.championId,
  };
}

function cloneSession(session: Session): Session {
  return JSON.parse(JSON.stringify(session)) as Session;
}

function packToEditable(pack: Pack): EditablePack {
  return {
    id: pack.id,
    name: pack.name,
    sourceType: pack.sourceType,
    sourceUrl: pack.sourceUrl,
    coverType: pack.coverType,
    coverValue: pack.coverValue,
    skipped: 0,
    duplicates: 0,
    issues: [],
    selectedVideoIds: pack.items.map((item) => item.videoId),
    items: pack.items.map(
      ({ title, channel, videoId, thumbnailUrl, youtubeUrl, duration }) => ({
        title,
        channel,
        videoId,
        thumbnailUrl,
        youtubeUrl,
        duration,
      }),
    ),
  };
}

function pickRandomVideoIds(
  items: EditablePack["items"],
  count: number,
) {
  const shuffled = items.map((item) => item.videoId);
  const randomBuffer = new Uint32Array(1);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    crypto.getRandomValues(randomBuffer);
    const swapIndex = randomBuffer[0] % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled.slice(0, count);
}

export function MRankingApp() {
  const [language, setLanguage] = useState<Language>("en");
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [results, setResults] = useState<SavedResult[]>([]);
  const [viewedResult, setViewedResult] = useState<SavedResult | null>(null);
  const [savedRuns, setSavedRuns] = useState<Record<string, ActiveRun>>({});
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [modePack, setModePack] = useState<Pack | null>(null);
  const [editable, setEditable] = useState<EditablePack | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [toast, setToast] = useState("");
  const resultSaving = useRef(new Set<string>());

  const i18n = useMemo(
    () => ({
      language,
      t: (key: string, values?: Record<string, string | number>) =>
        translate(language, key, values),
    }),
    [language],
  );
  const { t } = i18n;

  useEffect(() => {
    api<{ user: User | null }>("/api/auth")
      .then(async ({ user: sessionUser }) => {
        setUser(sessionUser);
        if (sessionUser) await loadPrivateData();
      })
      .finally(() => setBooting(false));
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY) as Language | null;
    const savedLanguage =
      stored && ["en", "ru", "uk"].includes(stored) ? stored : "en";

    document.documentElement.lang = savedLanguage;
    const frame = window.requestAnimationFrame(() => {
      setLanguage(savedLanguage);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!activeRun || activeRun.session.status !== "active" || !user) return;
    const timer = window.setTimeout(() => {
      void api("/api/runs", {
        method: "PUT",
        body: JSON.stringify({ run: activeRun }),
      }).catch(() => undefined);
      setSavedRuns((current) => ({
        ...current,
        [activeRun.session.packId]: activeRun,
      }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [activeRun, user]);

  useEffect(() => {
    if (
      !activeRun ||
      activeRun.session.status !== "complete" ||
      !activeRun.session.championId ||
      resultSaving.current.has(activeRun.session.id)
    )
      return;
    if (results.some((result) => result.id === activeRun.session.id)) return;
    resultSaving.current.add(activeRun.session.id);
    api<{ result: SavedResult }>("/api/results", {
      method: "POST",
      body: JSON.stringify({ session: activeRun.session }),
    })
      .then(({ result }) => {
        setResults((current) => [result, ...current]);
        setSavedRuns((current) => {
          const next = { ...current };
          delete next[activeRun.session.packId];
          return next;
        });
        setToast(t("Result saved"));
      })
      .catch((error) => setToast(error.message));
  }, [activeRun, results, t]);

  async function loadPrivateData() {
    const [packData, resultData, runData] = await Promise.all([
      api<{ packs: Pack[] }>("/api/packs"),
      api<{ results: SavedResult[] }>("/api/results"),
      api<{ runs: Array<{ packId: string; run: ActiveRun }> }>("/api/runs"),
    ]);
    setPacks(packData.packs);
    setResults(resultData.results);
    setSavedRuns(
      Object.fromEntries(
        runData.runs.map((entry) => [entry.packId, entry.run]),
      ),
    );
  }

  function protectedNavigate(next: Exclude<View, "home">) {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    setViewedResult(null);
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function login(nickname: string, password: string) {
    const data = await api<{ user: User }>("/api/auth", {
      method: "POST",
      body: JSON.stringify({ nickname, password }),
    });
    setUser(data.user);
    setLoginOpen(false);
    await loadPrivateData();
  }

  async function logout() {
    await api("/api/auth", { method: "DELETE" });
    setUser(null);
    setPacks([]);
    setResults([]);
    setSavedRuns({});
    setActiveRun(null);
    setViewedResult(null);
    setEditable(null);
    setProfileOpen(false);
    setView("home");
  }

  async function savePack(draft: EditablePack) {
    const data = await api<{ pack: Pack }>("/api/packs", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    setPacks((current) =>
      draft.id
        ? current.map((pack) => (pack.id === data.pack.id ? data.pack : pack))
        : [data.pack, ...current],
    );
    setEditable(null);
    setViewedResult(null);
    setView("packs");
    setToast(t("Pack saved"));
  }

  async function deletePack(pack: Pack) {
    if (!window.confirm(t("Delete “{name}”?", { name: pack.name }))) return;
    await api(`/api/packs?id=${encodeURIComponent(pack.id)}`, {
      method: "DELETE",
    });
    setPacks((current) => current.filter((item) => item.id !== pack.id));
    setSavedRuns((current) => {
      const next = { ...current };
      delete next[pack.id];
      return next;
    });
    setToast(t("Pack deleted"));
  }

  async function deleteResult(result: SavedResult) {
    const pack =
      result.pack ??
      packs.find((item) => item.id === result.packId) ??
      null;
    const name = pack?.name ?? t("Archived result");
    if (!window.confirm(t("Delete saved tournament “{name}”?", { name })))
      return;

    try {
      await api(`/api/results?id=${encodeURIComponent(result.id)}`, {
        method: "DELETE",
      });
      setResults((current) =>
        current.filter((item) => item.id !== result.id),
      );
      setViewedResult((current) =>
        current?.id === result.id ? null : current,
      );
      setToast(t("Tournament deleted"));
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : t("Something went wrong"),
      );
    }
  }

  function startPack(pack: Pack, resume = false) {
    const run =
      resume && savedRuns[pack.id]
        ? savedRuns[pack.id]
        : {
            session: createRound(
              pack.items.map((item) => item.id),
              pack.id,
            ),
            undoStack: [],
          };
    setModePack(pack);
    setViewedResult(null);
    setActiveRun(run);
    setView("hill");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseWinner(winnerId: string) {
    setActiveRun((run) => {
      if (!run || run.session.status !== "active") return run;
      const previous = snapshot(run.session);
      const session = cloneSession(run.session);
      const [first, second] = session.activePair;
      const loserId = first === winnerId ? second : first;
      const order = session.matches.length + 1;
      session.matches.push({
        id: `match-${crypto.randomUUID()}`,
        round: session.round,
        winnerId,
        loserId,
        order,
        carryMatch: session.isCarryMatch,
      });
      session.eliminated.push({ cardId: loserId, round: session.round, order });
      if (session.isCarryMatch) {
        const nextIds = [...session.roundWinners, winnerId];
        if (nextIds.length === 1) {
          session.status = "complete";
          session.championId = nextIds[0];
          return { session, undoStack: [...run.undoStack, previous] };
        }
        return {
          session: createRound(
            nextIds,
            session.packId,
            session.round + 1,
            session,
          ),
          undoStack: [...run.undoStack, previous],
        };
      }
      session.roundWinners.push(winnerId);
      if (session.pendingPairs.length) {
        session.activePair = session.pendingPairs.shift()!;
        return { session, undoStack: [...run.undoStack, previous] };
      }
      if (session.carryId) {
        const opponentIndex = Math.floor(
          Math.random() * session.roundWinners.length,
        );
        const [opponent] = session.roundWinners.splice(opponentIndex, 1);
        session.activePair = shuffle([opponent, session.carryId]) as [
          string,
          string,
        ];
        session.carryId = null;
        session.isCarryMatch = true;
        return { session, undoStack: [...run.undoStack, previous] };
      }
      if (session.roundWinners.length === 1) {
        session.status = "complete";
        session.championId = session.roundWinners[0];
        return { session, undoStack: [...run.undoStack, previous] };
      }
      return {
        session: createRound(
          session.roundWinners,
          session.packId,
          session.round + 1,
          session,
        ),
        undoStack: [...run.undoStack, previous],
      };
    });
  }

  function undo() {
    setActiveRun((run) => {
      if (!run || !run.undoStack.length || run.session.status === "complete")
        return run;
      const stack = [...run.undoStack];
      return { session: restore(run.session, stack.pop()!), undoStack: stack };
    });
  }

  function skip() {
    setActiveRun((run) => {
      if (!run || run.session.status !== "active") return run;
      const session = cloneSession(run.session);
      if (session.isCarryMatch || !session.pendingPairs.length)
        session.activePair = [session.activePair[1], session.activePair[0]];
      else {
        session.pendingPairs.push(session.activePair);
        session.activePair = session.pendingPairs.shift()!;
      }
      return { session, undoStack: [...run.undoStack, snapshot(run.session)] };
    });
  }

  function exportPack(pack: Pack) {
    const blob = new Blob([JSON.stringify(pack, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${pack.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "mranking-pack"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function goHome() {
    setView("home");
    setActiveRun(null);
    setModePack(null);
    setEditable(null);
    setViewedResult(null);
    setLoginOpen(false);
    setProfileOpen(false);
    setLanguageOpen(false);
    setToast("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const selectedPack = activeRun
    ? (packs.find((pack) => pack.id === activeRun.session.packId) ?? modePack)
    : modePack;
  const viewedResultPack = viewedResult
    ? (viewedResult.pack ??
      packs.find((pack) => pack.id === viewedResult.packId) ??
      null)
    : null;

  if (booting)
    return (
      <div className="boot-screen">
        <LogoMark />
        <span>{t("LOADING ARENA")}</span>
      </div>
    );

  return (
    <I18nContext.Provider value={i18n}>
      <main className="app-shell">
        <div className="noise" aria-hidden="true" />
        <Header
          view={view}
          user={user}
          language={language}
          languageOpen={languageOpen}
          profileOpen={profileOpen}
          onHome={goHome}
          onNavigate={protectedNavigate}
          onLanguageOpen={() => setLanguageOpen((open) => !open)}
          onLanguage={(next) => {
            setLanguage(next);
            localStorage.setItem(LANG_KEY, next);
            document.documentElement.lang = next;
            setLanguageOpen(false);
          }}
          onProfile={() =>
            user ? setProfileOpen((open) => !open) : setLoginOpen(true)
          }
          onAdmin={() => {
            setProfileOpen(false);
            protectedNavigate("admin");
          }}
          onLogout={logout}
          onAvatar={(next) =>
            setUser((current) =>
              current ? { ...current, avatarUrl: next } : current,
            )
          }
        />

        {view === "home" && (
          <HomeView onStart={() => protectedNavigate("modes")} />
        )}
        {view === "packs" && user && (
          <>
            <UploadView
              key={editable?.id ?? "pack-uploader"}
              editable={editable}
              onEditable={setEditable}
              onSave={savePack}
              onBack={goHome}
            />
            <PackLibraryView
              packs={packs}
              onEdit={(pack) => {
                setEditable(packToEditable(pack));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onDelete={deletePack}
              onExport={exportPack}
            />
          </>
        )}
        {view === "modes" && user && (
          <ModeView
            onBack={goHome}
            onKing={() => {
              setActiveRun(null);
              setModePack(null);
              setView("hill");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
        {view === "hill" &&
          user &&
          !activeRun &&
          viewedResult &&
          viewedResultPack && (
            <ResultView
              pack={viewedResultPack}
              run={{ session: viewedResult.session, undoStack: [] }}
              completedAt={viewedResult.completedAt}
              archived
              onAgain={
                packs.some((pack) => pack.id === viewedResult.packId)
                  ? () =>
                    startPack(
                      packs.find((pack) => pack.id === viewedResult.packId)!,
                    )
                  : undefined
              }
              onBack={() => setViewedResult(null)}
              onDelete={() => void deleteResult(viewedResult)}
            />
          )}
        {view === "hill" && user && !activeRun && !viewedResult && (
          <KingLibraryView
            packs={packs}
            results={results}
            runs={savedRuns}
            onBack={() => setView("modes")}
            onPacks={() => {
              setEditable(null);
              protectedNavigate("packs");
            }}
            onStart={(pack) => startPack(pack)}
            onContinue={(pack) => startPack(pack, true)}
            onOpenResult={(result) => {
              setViewedResult(result);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onDeleteResult={(result) => void deleteResult(result)}
          />
        )}
        {view === "hill" &&
          user &&
          activeRun &&
          selectedPack &&
          activeRun.session.status === "active" && (
            <BattleView
              pack={selectedPack}
              run={activeRun}
              onPick={chooseWinner}
              onUndo={undo}
              onSkip={skip}
              onExit={() => setActiveRun(null)}
            />
          )}
        {view === "hill" &&
          user &&
          activeRun &&
          selectedPack &&
          activeRun.session.status === "complete" && (
            <ResultView
              pack={selectedPack}
              run={activeRun}
              onAgain={() => startPack(selectedPack)}
              onBack={() => setActiveRun(null)}
            />
          )}
        {view === "admin" && user?.role === "admin" && (
          <AdminView onBack={goHome} />
        )}

        <footer>
          <span>MRanking / {t("Local prototype")}</span>
          <span>
            {t("UPLOAD")} → {t("COMPARE")} → {t("CROWN")}
          </span>
          <span>© 2026</span>
        </footer>
        {loginOpen && (
          <LoginModal onClose={() => setLoginOpen(false)} onLogin={login} />
        )}
        {toast && (
          <div className="toast" role="status">
            <span>✓</span>
            {toast}
          </div>
        )}
      </main>
    </I18nContext.Provider>
  );
}

function Header({
  view,
  user,
  language,
  languageOpen,
  profileOpen,
  onHome,
  onNavigate,
  onLanguageOpen,
  onLanguage,
  onProfile,
  onAdmin,
  onLogout,
  onAvatar,
}: {
  view: View;
  user: User | null;
  language: Language;
  languageOpen: boolean;
  profileOpen: boolean;
  onHome: () => void;
  onNavigate: (view: Exclude<View, "home">) => void;
  onLanguageOpen: () => void;
  onLanguage: (language: Language) => void;
  onProfile: () => void;
  onAdmin: () => void;
  onLogout: () => void;
  onAvatar: (url: string) => void;
}) {
  const { t } = useI18n();
  return (
    <header className="topbar">
      <Logo onClick={onHome} />
      <nav className="main-nav" aria-label={t("Main navigation")}>
        <button
          className={view === "packs" ? "active" : ""}
          onClick={() => onNavigate("packs")}
        >
          <span>01</span>
          {t("Packs")}
        </button>
        <button
          className={view === "modes" || view === "hill" ? "active" : ""}
          onClick={() => onNavigate("modes")}
        >
          <span>02</span>
          {t("Modes")}
        </button>
      </nav>
      <div className="top-actions">
        <div className="language-picker">
          <button
            className="icon-button"
            onClick={onLanguageOpen}
            aria-label={t("Choose language")}
          >
            {language === "en" ? "EN" : language === "ru" ? "РУ" : "УК"}⌄
          </button>
          {languageOpen && (
            <div className="language-menu">
              <button
                className={language === "en" ? "active" : ""}
                onClick={() => onLanguage("en")}
              >
                English
              </button>
              <button
                className={language === "ru" ? "active" : ""}
                onClick={() => onLanguage("ru")}
              >
                рузкий
              </button>
              <button
                className={language === "uk" ? "active" : ""}
                onClick={() => onLanguage("uk")}
              >
                УкрАинский
              </button>
            </div>
          )}
        </div>
        <div className="profile-menu-wrap">
          <button className="profile-chip" onClick={onProfile}>
            <UserAvatar user={user} />
            <span>{user?.nickname ?? t("Sign in")}</span>
          </button>
          {user && profileOpen && (
            <ProfileMenu
              user={user}
              onAdmin={onAdmin}
              onLogout={onLogout}
              onAvatar={onAvatar}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function Logo({ onClick }: { onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      className="brand"
      onClick={onClick}
      aria-label={t("MRanking home")}
    >
      <LogoMark />
      <span className="brand-name">
        M
        <br />
        <strong>Ranking</strong>
      </span>
    </button>
  );
}

function LogoMark() {
  return (
    <span className="brand-mark">
      <i>MR</i>
      <b>♛</b>
    </span>
  );
}

function UserAvatar({ user }: { user: User | null }) {
  return (
    <span className="avatar">
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt="" />
      ) : (
        (user?.avatarEmoji ?? "?")
      )}
    </span>
  );
}

function ProfileMenu({
  user,
  onAdmin,
  onLogout,
  onAvatar,
}: {
  user: User;
  onAdmin: () => void;
  onLogout: () => void;
  onAvatar: (url: string) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError(t("Avatar must be smaller than 2 MB"));
      event.target.value = "";
      return;
    }
    setBusy(true);
    setAvatarError("");
    try {
      const form = new FormData();
      form.append("avatar", file);
      const data = await api<{ avatarUrl: string }>("/api/avatar", {
        method: "POST",
        body: form,
      });
      onAvatar(data.avatarUrl);
    } catch (error) {
      setAvatarError(t((error as Error).message));
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }
  return (
    <div className="profile-menu">
      <div className="profile-menu-head">
        <UserAvatar user={user} />
        <div>
          <b>{user.nickname}</b>
          <span>{t(user.role === "admin" ? "Admin" : "User")}</span>
        </div>
      </div>
      <label className="menu-action upload-action">
        {busy ? "…" : t("Upload avatar")}
        <input type="file" accept="image/*" onChange={upload} />
      </label>
      {avatarError && <span className="profile-menu-error">{avatarError}</span>}
      {user.role === "admin" && (
        <button className="menu-action" onClick={onAdmin}>
          {t("Admin")}
        </button>
      )}
      <button className="menu-action danger" onClick={onLogout}>
        {t("Sign out")}
      </button>
    </div>
  );
}

function HomeView({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <section className="new-home">
      <div className="home-copy">
        <div className="eyebrow">
          <span>●</span>
          {t("TOURNAMENT ENGINE")}
        </div>
        <h1>
          {t("Rate it.")}
          <br />
          {t("Run it.")}
          <br />
          <em>{t("Crown it.")}</em>
        </h1>
        <button className="button primary jumbo" onClick={onStart}>
          {t("Start a tournament")}
          <span>↗</span>
        </button>
        <div className="home-theses">
          <span>{t("ONE SOURCE")}</span>
          <span>{t("MANY CONTENDERS")}</span>
          <span>{t("ONE WINNER")}</span>
        </div>
      </div>
      <TournamentVisual />
      <div className="home-flow">
        <span>01 {t("UPLOAD")}</span>
        <i>→</i>
        <span>02 {t("SPLIT")}</span>
        <i>→</i>
        <span>03 {t("COMPARE")}</span>
        <i>→</i>
        <span>04 {t("CROWN")}</span>
      </div>
    </section>
  );
}

function TournamentVisual() {
  const { t } = useI18n();
  const labels = [
    "NIGHT DRIVE",
    "B-SIDE",
    "FAVOURITE",
    "DEEP CUT",
    "WILDCARD",
    "ANTHEM",
    "CLASSIC",
    "NEW ONE",
  ];
  return (
    <div
      className="tournament-visual"
      aria-label={t("Animated tournament bracket")}
    >
      <span className="visual-caption">{t("LIVE BRACKET / 64 ENTRIES")}</span>
      <div className="source-disc">
        <span>64</span>
        <small>{t("ITEMS")}</small>
      </div>
      <div className="visual-round round-a">
        {labels.map((label, index) => (
          <div
            key={label}
            style={{ "--delay": `${index * 60}ms` } as React.CSSProperties}
          >
            <i className={`neutral-thumb neutral-${index % 4}`} />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="visual-connectors one" />
      <div className="visual-round round-b">
        {["NIGHT DRIVE", "FAVOURITE", "ANTHEM", "CLASSIC"].map(
          (label, index) => (
            <div key={label}>
              <i className={`neutral-thumb neutral-${index}`} />
              <span>{label}</span>
            </div>
          ),
        )}
      </div>
      <div className="visual-connectors two" />
      <div className="visual-final">
        <span>♛</span>
        <b>{t("THE ONE")}</b>
      </div>
    </div>
  );
}

const SOURCE_TILES = [
  { id: "music", title: "Music Service", icon: "♫", live: true },
  { id: "images", title: "Image Collection", icon: "▧", live: false },
  { id: "text", title: "Text / CSV List", icon: "≡", live: false },
  { id: "web", title: "Web Page", icon: "⌁", live: false },
  { id: "file", title: "File Upload", icon: "↑", live: false },
];

const MUSIC_SERVICE_TILES = [
  {
    id: "youtube",
    title: "YouTube / YouTube Music",
    icon: "▶",
    live: true,
  },
  { id: "spotify", title: "Spotify", icon: "●", live: true },
  { id: "yandex", title: "Yandex Music", icon: "Я", live: true },
] as const;

type MusicSource = (typeof MUSIC_SERVICE_TILES)[number]["id"];

function FlowBack({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="flow-back"
      onClick={onClick}
    >
      <span aria-hidden="true">←</span>
      {t(label)}
    </button>
  );
}

function UploadView({
  editable,
  onEditable,
  onSave,
  onBack,
}: {
  editable: EditablePack | null;
  onEditable: (value: EditablePack | null) => void;
  onSave: (value: EditablePack) => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<"music" | null>(
    editable ? "music" : null,
  );
  const [source, setSource] = useState<MusicSource | null>(
    editable
      ? editable.sourceType === "spotify"
        ? "spotify"
        : editable.sourceType === "yandexMusic"
          ? "yandex"
          : "youtube"
      : null,
  );
  const [url, setUrl] = useState(editable?.sourceUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<YouTubeProfilePreview | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const isEditing = editable !== null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      controller.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  async function loadMusicUrl(nextUrl: string, preserveProfile = false) {
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setLoading(true);
    setError("");
    try {
      const endpoint =
        source === "spotify"
          ? "/api/spotify"
          : source === "yandex"
            ? "/api/yandex-music"
            : "/api/youtube";
      const data = await api<YouTubeImportResult>(endpoint, {
        method: "POST",
        body: JSON.stringify({ url: nextUrl }),
        signal: requestController.signal,
      });
      if (!mounted.current || controller.current !== requestController) return;
      if (data.kind === "profile") {
        setProfile(data.profile);
        return;
      }
      if (!preserveProfile) setProfile(null);
      onEditable({
        name: data.playlist.title,
        sourceType: data.playlist.sourceType,
        sourceUrl: data.playlist.sourceUrl,
        coverType: "thumbnail",
        coverValue: data.playlist.cover,
        skipped: data.playlist.skipped,
        duplicates: data.playlist.duplicates,
        issues: data.playlist.issues ?? [],
        selectedVideoIds: data.playlist.items.map((item) => item.videoId),
        items: data.playlist.items,
      });
    } catch (nextError) {
      if (
        mounted.current &&
        controller.current === requestController &&
        (nextError as Error).name !== "AbortError"
      )
        setError((nextError as Error).message);
    } finally {
      if (mounted.current && controller.current === requestController) {
        controller.current = null;
        setLoading(false);
      }
    }
  }

  async function readPlaylist(event: FormEvent) {
    event.preventDefault();
    await loadMusicUrl(url);
  }

  const serviceTitle =
    source === "spotify"
      ? "Spotify"
      : source === "yandex"
        ? "Yandex Music"
        : "YouTube / YouTube Music";
  const serviceIcon = source === "spotify" ? "●" : source === "yandex" ? "Я" : "▶";
  const servicePrompt =
    source === "youtube" ? "Paste playlist or profile link" : "Paste playlist link";
  const serviceCopy =
    source === "spotify"
      ? "Use a public Spotify playlist."
      : source === "yandex"
        ? "Use a public Yandex Music playlist."
        : "Use a public playlist or profile from YouTube or YouTube Music.";
  const servicePlaceholder =
    source === "spotify"
      ? "https://open.spotify.com/playlist/..."
      : source === "yandex"
        ? "https://music.yandex.ru/users/.../playlists/..."
        : "https://youtube.com/@profile or https://music.youtube.com/@profile";

  if (editable)
    return (
      <PackEditor
        value={editable}
        onChange={onEditable}
        onBack={() => {
          const editingExistingPack = Boolean(editable.id);
          onEditable(null);
          setError("");
          setUrl("");
          if (editingExistingPack) {
            setCategory(null);
            setSource(null);
            setProfile(null);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onSave={async () => {
          setSaving(true);
          try {
            const editingExistingPack = Boolean(editable.id);
            const selected = new Set(editable.selectedVideoIds);
            const selectedItems = editable.items.filter((item) =>
              selected.has(item.videoId),
            );
            await onSave({
              ...editable,
              selectedVideoIds: selectedItems.map((item) => item.videoId),
              items: selectedItems,
            });
            if (!editingExistingPack) {
              setCategory(null);
              setSource(null);
              setUrl("");
              setProfile(null);
            }
          } catch (nextError) {
            setError((nextError as Error).message);
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
        error={error}
      />
    );

  return (
    <section className="page-wrap upload-view">
      {!category && <FlowBack label="Back" onClick={onBack} />}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>01 / {t("INPUT")}
          </div>
          <h2>{t("Choose a source")}</h2>
          <p>
            {t("Turn a link, file or collection into something you can rank.")}
          </p>
        </div>
      </div>
      {!category && (
        <div className="source-grid">
          {SOURCE_TILES.map((tile) => (
            <button
              key={tile.id}
              className={`source-tile ${tile.live ? "live" : "locked"}`}
              onClick={() => tile.live && setCategory("music")}
              disabled={!tile.live}
            >
              <span className="source-status">
                {t(tile.live ? "WORKS NOW" : "COMING SOON")}
              </span>
              <i>{tile.icon}</i>
              <h3>{t(tile.title)}</h3>
              <b>{tile.live ? "↗" : "· · ·"}</b>
            </button>
          ))}
        </div>
      )}
      {category === "music" && !source && (
        <div className="music-service-stage">
          <FlowBack
            label="Back"
            onClick={() => {
              setCategory(null);
              setSource(null);
              setUrl("");
              setProfile(null);
              setError("");
            }}
          />
          <div className="service-heading">
            <span className="modal-kicker">02 / {t("Music Service")}</span>
            <h3>{t("Choose a music service")}</h3>
            <p>{t("Select where your playlist lives.")}</p>
          </div>
          <div className="source-grid music-service-grid">
            {MUSIC_SERVICE_TILES.map((tile) => (
              <button
                key={tile.id}
                className={`source-tile ${tile.live ? "live" : "locked"}`}
                onClick={() => tile.live && setSource(tile.id)}
                disabled={!tile.live}
              >
                <span className="source-status">
                  {t(tile.live ? "WORKS NOW" : "COMING SOON")}
                </span>
                <i>{tile.icon}</i>
                <h3>{t(tile.title)}</h3>
                <b>{tile.live ? "↗" : "· · ·"}</b>
              </button>
            ))}
          </div>
        </div>
      )}
      {source && !loading && !profile && (
        <form className="playlist-form" onSubmit={readPlaylist}>
          <FlowBack
            label="Back"
            onClick={() => {
              setSource(null);
              setUrl("");
              setProfile(null);
              setError("");
            }}
          />
          <div className="playlist-form-icon">{serviceIcon}</div>
          <span className="modal-kicker">{t(serviceTitle)}</span>
          <h3>{t(servicePrompt)}</h3>
          <p>{t(serviceCopy)}</p>
          <div className="url-entry">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={servicePlaceholder}
              autoComplete="off"
              required
            />
            <button className="button primary" type="submit">
              {t("Read link")}
              <span>↗</span>
            </button>
          </div>
          {error && <div className="form-error">{t(error)}</div>}
        </form>
      )}
      {profile && !loading && (
        <>
          <ProfilePlaylistPicker
            profile={profile}
            onBack={() => {
              setProfile(null);
              setUrl("");
              setError("");
            }}
            onRetry={() => loadMusicUrl(profile.sourceUrl)}
            onChoose={(playlist) => loadMusicUrl(playlist.url, true)}
          />
          {error && (
            <div className="form-error profile-import-error">{t(error)}</div>
          )}
        </>
      )}
      {loading && (
        <div className="import-loader">
          <div className="loader-orbit">
            <span>▶</span>
            <i />
            <i />
            <i />
          </div>
          <div>
            <span className="modal-kicker">{t("IMPORTING")}</span>
            <h3>{t("Reading link")}</h3>
            <p>{t("Looking for a playlist or public profile.")}</p>
            <div className="loading-bar">
              <i />
            </div>
            <FlowBack
              label="Back"
              onClick={() => {
                controller.current?.abort();
                setUrl("");
                setError("");
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ProfilePlaylistPicker({
  profile,
  onBack,
  onRetry,
  onChoose,
}: {
  profile: YouTubeProfilePreview;
  onBack: () => void;
  onRetry: () => void;
  onChoose: (playlist: ProfilePlaylistPreview) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="profile-playlist-picker">
      <FlowBack
        label="Back"
        onClick={onBack}
      />
      <div className="profile-import-head">
        <div className="profile-import-avatar">
          <span className="profile-avatar-placeholder" aria-hidden="true" />
          {profile.avatarUrl && (
            <img
              src={profile.avatarUrl}
              alt=""
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
        </div>
        <div>
          <span className="modal-kicker">{t("PUBLIC PROFILE")}</span>
          <h3>{profile.title}</h3>
          <p>
            {profile.playlists.length} {t("public playlists")}
          </p>
        </div>
      </div>
      {profile.playlists.length === 0 ? (
        <div className="profile-playlist-empty">
          <span>∅</span>
          <h4>{t("No public playlists found")}</h4>
          <p>{t("Only public playlists can be imported.")}</p>
          <button className="button ghost" onClick={onRetry}>
            {t("Try again")}
          </button>
        </div>
      ) : (
        <div className="profile-playlist-grid">
          {profile.playlists.map((playlist) => (
            <button
              key={playlist.playlistId}
              onClick={() => onChoose(playlist)}
            >
              <span className="profile-playlist-art">
                {playlist.thumbnailUrl ? (
                  <img
                    src={playlist.thumbnailUrl}
                    alt=""
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      const ratio = image.naturalHeight
                        ? image.naturalWidth / image.naturalHeight
                        : 1;
                      image.dataset.artShape =
                        Math.abs(ratio - 1) <= 0.08 ? "square" : "wide";
                    }}
                  />
                ) : (
                  <i>♫</i>
                )}
                <b>↗</b>
              </span>
              <span className="profile-playlist-copy">
                <strong>{playlist.title}</strong>
                <small>
                  {playlist.itemCount === null
                    ? t("Playlist")
                    : `${playlist.itemCount} ${t("videos")}`}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PackEditor({
  value,
  onChange,
  onBack,
  onSave,
  saving,
  error,
}: {
  value: EditablePack;
  onChange: (value: EditablePack) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  error: string;
}) {
  const { t } = useI18n();
  const selectedIds = new Set(value.selectedVideoIds);
  const selectedCount = value.items.reduce(
    (count, item) => count + Number(selectedIds.has(item.videoId)),
    0,
  );
  const valid = selectedCount >= 16 && value.name.trim().length > 0;
  const issueTotal = value.issues.reduce(
    (count, issue) => count + issue.count,
    0,
  );

  function selectRandom(count: number | "all") {
    if (count === "all") {
      onChange({
        ...value,
        selectedVideoIds: value.items.map((item) => item.videoId),
      });
      return;
    }
    onChange({
      ...value,
      selectedVideoIds: pickRandomVideoIds(value.items, count),
    });
  }

  function toggleItem(videoId: string, checked: boolean) {
    onChange({
      ...value,
      selectedVideoIds: checked
        ? [...new Set([...value.selectedVideoIds, videoId])]
        : value.selectedVideoIds.filter((id) => id !== videoId),
    });
  }

  return (
    <section className="page-wrap editor-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading editor-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>02 / {t("REVIEW")}
          </div>
          <h2>{t("Edit imported pack")}</h2>
        </div>
      </div>
      <div className="editor-setup">
        <div className="editor-cover-block">
          <span className="aside-label">{t("Cover")}</span>
          <div
            className={`pack-cover-preview ${value.coverType === "emoji" ? "emoji-cover" : ""}`}
          >
            {value.coverType === "thumbnail" ? (
              <img src={value.coverValue} alt="" />
            ) : (
              <span>{value.coverValue}</span>
            )}
            <b>{value.name || "UNTITLED"}</b>
            <small>
              {selectedCount} {t(isYouTubeSource(value.sourceType) ? "videos" : "tracks")}
            </small>
          </div>
          <button
            className={`cover-choice ${value.coverType === "thumbnail" ? "selected" : ""}`}
            onClick={() =>
              onChange({
                ...value,
                coverType: "thumbnail",
                coverValue: value.items[0]?.thumbnailUrl ?? value.coverValue,
              })
            }
          >
            {t("Playlist thumbnail")}
          </button>
          <div className="emoji-cover-grid">
            {COVER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className={
                  value.coverType === "emoji" && value.coverValue === emoji
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  onChange({ ...value, coverType: "emoji", coverValue: emoji })
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <label className="large-field editor-name-field">
          <span>{t("Pack name")}</span>
          <input
            value={value.name}
            maxLength={120}
            onChange={(event) =>
              onChange({ ...value, name: event.target.value })
            }
          />
        </label>
        <div className="editor-save-block">
          <span>{t("Selected")}</span>
          <b>{selectedCount}</b>
          <small>
            {t(isYouTubeSource(value.sourceType) ? "videos" : "tracks")}
          </small>
          {!valid && (
            <div className="minimum-note">
              {t("A pack needs at least 16 items")} · {selectedCount}/16
            </div>
          )}
          {error && <div className="form-error">{t(error)}</div>}
          <button
            className="button primary save-pack"
            disabled={!valid || saving}
            onClick={onSave}
          >
            <strong>{saving ? "…" : t("Save pack")}</strong>
            <span>↗</span>
          </button>
        </div>
      </div>
      <div className="editor-layout">
        <div className="editor-main">
          <div className="track-list-heading">
            <span>{t("Playlist tracks")}</span>
            <b>{value.items.length}</b>
          </div>
          <div className="video-review-list">
            {value.items.map((item, index) => {
              const checked = selectedIds.has(item.videoId);
              return (
              <article key={item.videoId} className={checked ? "selected" : "unchecked"}>
                <label className="review-checkbox">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) =>
                      toggleItem(item.videoId, event.target.checked)
                    }
                    aria-label={`${checked ? "Unselect" : "Select"} ${item.title}`}
                  />
                  <span aria-hidden="true" />
                </label>
                <span className="review-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <img src={item.thumbnailUrl} alt="" />
                <div>
                  <b>{item.title}</b>
                  <small>
                    {item.channel}
                    {item.duration ? ` · ${item.duration}` : ""}
                  </small>
                </div>
                <a href={item.youtubeUrl} target="_blank" rel="noreferrer">
                  ↗
                </a>
              </article>
            )})}
          </div>
        </div>
        <aside className="selection-sidebar">
          <section className="selection-panel">
            <span className="aside-label">{t("Random selection")}</span>
            <h3>{selectedCount}</h3>
            <p>{t("Choose how many tracks stay in the pack.")}</p>
            <div className="selection-size-grid">
              {[16, 32, 64, 128, 256, 512].map((size) => (
                <button
                  key={size}
                  className={selectedCount === size ? "selected" : ""}
                  disabled={size > value.items.length}
                  onClick={() => selectRandom(size)}
                >
                  {size}
                </button>
              ))}
              <button
                className={selectedCount === value.items.length ? "selected" : ""}
                onClick={() => selectRandom("all")}
              >
                {t("All")}
              </button>
            </div>
          </section>
          {issueTotal > 0 && (
            <section className="import-issues">
              <header>
                <span>{t("Excluded")}</span>
                <b>{issueTotal}</b>
              </header>
              <div>
                {value.issues.map((issue, index) => (
                  <article key={`${issue.reason}-${issue.title}-${index}`}>
                    <span className={`issue-mark ${issue.reason}`}>×</span>
                    <p>
                      <strong>
                        {t(issue.title)}
                        {issue.count > 1 ? ` ×${issue.count}` : ""}
                      </strong>
                      <small>{issue.channel}</small>
                    </p>
                    <em>
                      {t(issue.reason === "duplicate" ? "Duplicate" : "Skipped")}
                    </em>
                  </article>
                ))}
              </div>
              {value.duplicates > 0 && (
                <p className="duplicate-note">
                  {t("Duplicates are unchecked automatically; one copy stays selected.")}
                </p>
              )}
            </section>
          )}
          {value.skipped > 0 && value.issues.length === 0 && (
            <section className="import-issues compact">
              <header>
                <span>{t("Skipped")}</span>
                <b>{value.skipped}</b>
              </header>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

const MODES = [
  {
    id: "king",
    title: "King of the Hill",
    icon: "♛",
    copy: "Pick one of two until only one remains.",
    live: true,
  },
  {
    id: "tier",
    title: "Tier List",
    icon: "▤",
    copy: "Build tiers and drag every contender into place.",
    live: false,
  },
  {
    id: "blind",
    title: "Blind Ranking",
    icon: "?",
    copy: "Rank without seeing what comes next.",
    live: false,
  },
  {
    id: "score",
    title: "Score Everything",
    icon: "★",
    copy: "Give every item an independent score.",
    live: false,
  },
  {
    id: "drop",
    title: "Keep or Drop",
    icon: "±",
    copy: "Make one brutal yes-or-no decision at a time.",
    live: false,
  },
  {
    id: "bracket",
    title: "Single Elimination",
    icon: "⌘",
    copy: "Classic fixed tournament bracket.",
    live: false,
  },
];

function ModeView({
  onBack,
  onKing,
}: {
  onBack: () => void;
  onKing: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="page-wrap mode-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>02 / {t("FORMAT")}
          </div>
          <h2>{t("Choose a mode")}</h2>
          <p>{t("Choose how you want to rate your private packs.")}</p>
        </div>
      </div>
      <div className="mode-grid">
        {MODES.map((mode, index) => (
          <button
            key={mode.id}
            className={`mode-tile ${mode.live ? "live" : "locked"}`}
            disabled={!mode.live}
            onClick={mode.live ? onKing : undefined}
          >
            <span className="mode-number">0{index + 1}</span>
            <i>{mode.icon}</i>
            <div>
              <h3>{t(mode.title)}</h3>
              <p>{t(mode.copy)}</p>
            </div>
            <b>{t(mode.live ? "PLAY NOW" : "COMING SOON")}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function PackLibraryView({
  packs,
  onEdit,
  onDelete,
  onExport,
}: {
  packs: Pack[];
  onEdit: (pack: Pack) => void;
  onDelete: (pack: Pack) => void;
  onExport: (pack: Pack) => void;
}) {
  const { t } = useI18n();
  return (
    <section className="page-wrap library-view">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>
            {t("YOUR LIBRARY")}
          </div>
          <h2>{t("Your packs")}</h2>
          <p>{t("Only you can see the packs uploaded to this account.")}</p>
        </div>
      </div>
      {packs.length === 0 ? (
        <div className="empty-library">
          <span>＋</span>
          <h3>{t("No packs yet")}</h3>
          <p>{t("Your imported playlists will appear here.")}</p>
        </div>
      ) : (
        <div className="pack-grid">
          {packs.map((pack) => (
            <article className="pack-tile" key={pack.id}>
              <div className="pack-art">
                <PackCover pack={pack} />
              </div>
              <div className="pack-tile-body">
                <div className="pack-meta">
                  <span>{t(sourceName(pack.sourceType))}</span>
                  <span>
                    {pack.itemCount}{" "}
                    {t(isYouTubeSource(pack.sourceType) ? "videos" : "tracks")}
                  </span>
                </div>
                <h3>{pack.name}</h3>
                <div className="pack-owner">
                  <span>by {pack.ownerNickname}</span>
                  <b>{new Date(pack.updatedAt).toLocaleDateString()}</b>
                </div>
                <div className="pack-actions">
                  <button onClick={() => onEdit(pack)}>{t("Edit")}</button>
                  <button onClick={() => onExport(pack)}>{t("Export")}</button>
                  <button className="danger" onClick={() => onDelete(pack)}>
                    {t("Delete")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function KingLibraryView({
  packs,
  results,
  runs,
  onBack,
  onPacks,
  onStart,
  onContinue,
  onOpenResult,
  onDeleteResult,
}: {
  packs: Pack[];
  results: SavedResult[];
  runs: Record<string, ActiveRun>;
  onBack: () => void;
  onPacks: () => void;
  onStart: (pack: Pack) => void;
  onContinue: (pack: Pack) => void;
  onOpenResult: (result: SavedResult) => void;
  onDeleteResult: (result: SavedResult) => void;
}) {
  const { t, language } = useI18n();
  return (
    <section className="page-wrap library-view king-library-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>
            {t("King of the Hill")}
          </div>
          <h2>{t("Choose a pack")}</h2>
          <p>
            {t("Select one of your private packs to start the tournament.")}
          </p>
        </div>
      </div>
      {packs.length === 0 ? (
        <div className="empty-library">
          <span>＋</span>
          <h3>{t("No packs yet")}</h3>
          <p>{t("Upload a pack before starting a mode.")}</p>
          <button className="button primary" onClick={onPacks}>
            {t("Go to packs")}
          </button>
        </div>
      ) : (
        <div className="pack-grid mode-pack-grid">
          {packs.map((pack) => (
            <article className="pack-tile" key={pack.id}>
              <button
                className="pack-art"
                onClick={() =>
                  runs[pack.id] ? onContinue(pack) : onStart(pack)
                }
              >
                <PackCover pack={pack} />
                <div className="pack-play-overlay">
                  <span>{t(runs[pack.id] ? "Continue" : "PLAY NOW")}</span>
                  <b>↗</b>
                </div>
              </button>
              <div className="pack-tile-body">
                <div className="pack-meta">
                  <span>{t(sourceName(pack.sourceType))}</span>
                  <span>
                    {pack.itemCount}{" "}
                    {t(isYouTubeSource(pack.sourceType) ? "videos" : "tracks")}
                  </span>
                </div>
                <h3>{pack.name}</h3>
                <div className="pack-owner">
                  <span>by {pack.ownerNickname}</span>
                  <b>{new Date(pack.updatedAt).toLocaleDateString()}</b>
                </div>
                <div className="pack-actions mode-pack-actions">
                  {runs[pack.id] ? (
                    <button
                      className="continue"
                      onClick={() => onContinue(pack)}
                    >
                      {t("Continue")}
                    </button>
                  ) : (
                    <button onClick={() => onStart(pack)}>{t("Play")}</button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {results.length > 0 && (
        <div className="result-history">
          <div className="section-line">
            <div>
              <h3>{t("Tournament history")}</h3>
              <p>{t("Open any completed run and inspect every battle.")}</p>
            </div>
            <span>{results.length}</span>
          </div>
          <div className="result-history-grid">
            {results.map((result) => {
              const pack =
                result.pack ??
                packs.find((item) => item.id === result.packId) ??
                null;
              const champion = pack?.items.find(
                (item) => item.id === result.championItemId,
              );
              if (!pack || !champion) return null;
              return (
                <article className="result-history-card" key={result.id}>
                  <button
                    className="result-history-open"
                    onClick={() => onOpenResult(result)}
                    aria-label={`${t("View bracket")}: ${pack.name}`}
                  >
                    <span className="result-history-art">
                      <img src={champion.thumbnailUrl} alt="" />
                      <i>♛</i>
                    </span>
                    <span className="result-history-copy">
                      <small>
                        {new Date(result.completedAt).toLocaleDateString(
                          language === "ru"
                            ? "ru-RU"
                            : language === "uk"
                              ? "uk-UA"
                              : "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </small>
                      <strong>{pack.name}</strong>
                      <span>{champion.title}</span>
                      <b>{t("View bracket")} ↗</b>
                    </span>
                  </button>
                  <button
                    className="result-history-delete"
                    onClick={() => onDeleteResult(result)}
                    aria-label={`${t("Delete history")}: ${pack.name}`}
                    title={t("Delete history")}
                  >
                    ×
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function PackCover({ pack }: { pack: Pack }) {
  return pack.coverType === "thumbnail" ? (
    <img src={pack.coverValue} alt="" />
  ) : (
    <span className="emoji-pack-cover">{pack.coverValue}</span>
  );
}

function isYouTubeSource(sourceType: SourceType) {
  return sourceType === "youtube" || sourceType === "youtubeMusic";
}

function sourceName(sourceType: SourceType) {
  if (sourceType === "youtubeMusic") return "YouTube Music";
  if (sourceType === "spotify") return "Spotify";
  if (sourceType === "yandexMusic") return "Yandex Music";
  return "YouTube";
}

function mediaEmbedUrl(sourceType: SourceType, item: PackItem) {
  if (sourceType === "spotify")
    return `https://open.spotify.com/embed/track/${encodeURIComponent(item.videoId)}?utm_source=generator`;
  if (sourceType === "yandexMusic")
    return `https://music.yandex.ru/iframe/track/${encodeURIComponent(item.videoId)}`;
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(item.videoId)}?autoplay=1&rel=0`;
}

function BattleView({
  pack,
  run,
  onPick,
  onUndo,
  onSkip,
  onExit,
}: {
  pack: Pack;
  run: ActiveRun;
  onPick: (id: string) => void;
  onUndo: () => void;
  onSkip: () => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState<string | null>(null);
  const left = pack.items.find(
    (item) => item.id === run.session.activePair[0],
  )!;
  const right = pack.items.find(
    (item) => item.id === run.session.activePair[1],
  )!;
  const decided =
    run.session.roundWinners.length +
    run.session.matches.filter((match) => match.round === run.session.round)
      .length;
  const total = Math.max(1, Math.ceil(run.session.roundStartCount / 2));
  const progress = Math.min(100, (decided / total) * 100);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      )
        return;
      if (event.key.toLowerCase() === "a") onPick(left.id);
      if (event.key.toLowerCase() === "b") onPick(right.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [left.id, right.id, onPick]);
  return (
    <section className="battle-view">
      <FlowBack label="Back" onClick={onExit} />
      <div className="battle-topline">
        <span aria-hidden="true" />
        <div>
          <span>{t("ROUND {count}", { count: run.session.round })}</span>
          <b>
            {run.session.roundStartCount} →{" "}
            {Math.floor(run.session.roundStartCount / 2)}
          </b>
        </div>
        <span>{pack.name}</span>
      </div>
      <div className="round-meter">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="battle-title">
        <h2>{t("Choose the one that stays")}</h2>
      </div>
      <div className="duel-board">
        <TrackChoice
          item={left}
          sourceType={pack.sourceType}
          keyName="A"
          playing={playing === left.id}
          onPlay={() => setPlaying(playing === left.id ? null : left.id)}
          onPick={() => {
            setPlaying(null);
            onPick(left.id);
          }}
        />
        <div className="duel-vs">
          <span>VS</span>
          <i>
            {run.session.isCarryMatch
              ? t("PLAYOFF")
              : t("{count} LEFT", {
                  count: run.session.pendingPairs.length + 1,
                })}
          </i>
        </div>
        <TrackChoice
          item={right}
          sourceType={pack.sourceType}
          keyName="B"
          playing={playing === right.id}
          onPlay={() => setPlaying(playing === right.id ? null : right.id)}
          onPick={() => {
            setPlaying(null);
            onPick(right.id);
          }}
        />
      </div>
      <div className="battle-controls">
        <button disabled={!run.undoStack.length} onClick={onUndo}>
          {t("Undo")}
        </button>
        <button onClick={onSkip}>{t("Skip pair")}</button>
      </div>
    </section>
  );
}

function TrackChoice({
  item,
  sourceType,
  keyName,
  playing,
  onPlay,
  onPick,
}: {
  item: PackItem;
  sourceType: SourceType;
  keyName: string;
  playing: boolean;
  onPlay: () => void;
  onPick: () => void;
}) {
  const { t } = useI18n();
  return (
    <article className="track-choice">
      <span className="choice-key">{keyName}</span>
      <div className="track-media">
        {playing ? (
          <iframe
            src={mediaEmbedUrl(sourceType, item)}
            title={item.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <img src={item.thumbnailUrl} alt="" />
        )}
        <button className="media-play" onClick={onPlay}>
          {playing ? t("Close player") : t("Play track")}
          <span>{playing ? "×" : "▶"}</span>
        </button>
      </div>
      <div className="track-info">
        <div>
          <h3>{item.title}</h3>
          <p>
            {item.channel}
            {item.duration ? ` · ${item.duration}` : ""}
          </p>
        </div>
        <a
          href={item.youtubeUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t("Open in music service")}
        >
          ↗
        </a>
      </div>
      <button className="choose-track" onClick={onPick}>
        {t("Choose this")}
        <span>↗</span>
      </button>
    </article>
  );
}

function ResultView({
  pack,
  run,
  onAgain,
  onBack,
  onDelete,
  archived = false,
  completedAt,
}: {
  pack: Pack;
  run: ActiveRun;
  onAgain?: () => void;
  onBack: () => void;
  onDelete?: () => void;
  archived?: boolean;
  completedAt?: string;
}) {
  const { t, language } = useI18n();
  const champion = pack.items.find(
    (item) => item.id === run.session.championId,
  )!;
  const rankingIds = [
    champion.id,
    ...[...run.session.eliminated]
      .sort((a, b) => b.round - a.round || b.order - a.order)
      .map((item) => item.cardId),
  ];
  return (
    <section className="page-wrap result-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="result-stage">
        <div className="winner-copy">
          <div className="eyebrow">
            <span>●</span>
            {t(archived ? "Archived result" : "We have a winner")}
          </div>
          <h2>{t("Long live the champion.")}</h2>
          {completedAt && (
            <p className="result-completed">
              {t("Completed")} ·{" "}
              {new Date(completedAt).toLocaleString(
                language === "ru"
                  ? "ru-RU"
                  : language === "uk"
                    ? "uk-UA"
                    : "en-GB",
                { dateStyle: "long", timeStyle: "short" },
              )}
            </p>
          )}
          <div className="result-actions">
            {onAgain && (
              <button className="button primary" onClick={onAgain}>
                {t("Play again")}
              </button>
            )}
            {archived && onDelete && (
              <button className="button danger" onClick={onDelete}>
                {t("Delete history")}
              </button>
            )}
          </div>
        </div>
        <article className="winner-card">
          <span className="winner-crown">♛</span>
          <img src={champion.thumbnailUrl} alt="" />
          <div>
            <b>{champion.title}</b>
            <small>{champion.channel}</small>
          </div>
          <a href={champion.youtubeUrl} target="_blank" rel="noreferrer">
            {t(sourceName(pack.sourceType))} ↗
          </a>
        </article>
      </div>
      <TournamentBracket pack={pack} session={run.session} />
      <div className="ranking-panel">
        <div className="section-line">
          <h3>{t("Full ranking")}</h3>
          <span>{rankingIds.length}</span>
        </div>
        {rankingIds.map((id, index) => {
          const item = pack.items.find((entry) => entry.id === id);
          if (!item) return null;
          return (
            <div className={`rank-row ${index === 0 ? "winner" : ""}`} key={id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <img src={item.thumbnailUrl} alt="" />
              <p>
                <b>{item.title}</b>
                <small>{item.channel}</small>
              </p>
              {index === 0 && <i>♛</i>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type BracketGraphNode = {
  match: Session["matches"][number];
  parents: [BracketGraphNode | null, BracketGraphNode | null];
  stage: number;
  y: number;
};

function TournamentBracket({
  pack,
  session,
}: {
  pack: Pack;
  session: Session;
}) {
  const { t } = useI18n();
  const itemById = new Map(pack.items.map((item) => [item.id, item]));
  const orderedMatches = [...session.matches].sort(
    (left, right) => left.order - right.order,
  );
  const producerByWinner = new Map<string, BracketGraphNode>();
  const nodes: BracketGraphNode[] = [];
  for (const match of orderedMatches) {
    const winnerParent = producerByWinner.get(match.winnerId) ?? null;
    const loserParent = producerByWinner.get(match.loserId) ?? null;
    const node: BracketGraphNode = {
      match,
      parents: [winnerParent, loserParent],
      stage: Math.max(winnerParent?.stage ?? -1, loserParent?.stage ?? -1) + 1,
      y: 0,
    };
    nodes.push(node);
    producerByWinner.set(match.winnerId, node);
  }

  const root = session.championId
    ? (producerByWinner.get(session.championId) ?? nodes.at(-1) ?? null)
    : (nodes.at(-1) ?? null);
  const leafGap = 124;
  const boardTop = 118;
  let leafSlot = 0;
  const positioned = new Set<BracketGraphNode>();
  const positionNode = (node: BracketGraphNode): number => {
    if (positioned.has(node)) return node.y;
    const inputY = node.parents.map((parent) =>
      parent
        ? positionNode(parent)
        : boardTop + (leafSlot++ + 0.5) * leafGap,
    );
    node.y = (inputY[0] + inputY[1]) / 2;
    positioned.add(node);
    return node.y;
  };
  if (root) positionNode(root);
  for (const node of nodes) if (!positioned.has(node)) positionNode(node);

  const cardWidth = 276;
  const cardHeight = 194;
  const columnStep = 326;
  const boardLeft = 42;
  const maxStage = Math.max(0, ...nodes.map((node) => node.stage));
  const championX = boardLeft + (maxStage + 1) * columnStep;
  const boardWidth = championX + cardWidth + 42;
  const boardHeight = Math.max(720, boardTop + leafSlot * leafGap + 70);
  const fitRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(1);

  useEffect(() => {
    const element = fitRef.current;
    if (!element) return;
    const updateScale = () =>
      setFitScale(Math.min(1, Math.max(0.2, (element.clientWidth - 28) / boardWidth)));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [boardWidth]);

  const champion = session.championId
    ? itemById.get(session.championId)
    : null;
  const arrowMarkerId = `bracket-arrow-${session.id.replace(/[^a-z0-9-]/gi, "")}`;
  const edges = nodes.flatMap((node) =>
    node.parents.flatMap((parent, inputIndex) => {
      if (!parent) return [];
      const startX = boardLeft + parent.stage * columnStep + cardWidth;
      const startY = parent.y;
      const endX = boardLeft + node.stage * columnStep;
      const endY = node.y + (inputIndex === 0 ? -38 : 43);
      const middleX = startX + (endX - startX) / 2;
      return [{
        id: `${parent.match.id}-${node.match.id}-${inputIndex}`,
        path: `M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}`,
      }];
    }),
  );
  if (root) {
    const startX = boardLeft + root.stage * columnStep + cardWidth;
    const middleX = startX + (championX - startX) / 2;
    edges.push({
      id: `${root.match.id}-champion`,
      path: `M ${startX} ${root.y} H ${middleX} V ${root.y} H ${championX}`,
    });
  }

  return (
    <section className="tournament-bracket-section">
      <div className="bracket-heading">
        <div>
          <span className="modal-kicker">{t("Tournament bracket")}</span>
          <h3>{t("Every battle leads to one champion.")}</h3>
          <p>{t("Follow every winner through an unbroken path to the final.")}</p>
        </div>
        <div className="bracket-summary">
          <span>
            <b>{session.matches.length}</b>
            {t("BATTLES")}
          </span>
          <span>
            <b>{maxStage + 1}</b>
            {t("ROUNDS")}
          </span>
        </div>
      </div>
      <div className="bracket-fit" ref={fitRef} aria-label={t("Full tournament bracket")}>
        <div
          className="bracket-fit-height"
          style={{ height: `${boardHeight * fitScale}px` }}
        >
          <div
            className="bracket-canvas"
            style={{
              width: `${boardWidth}px`,
              height: `${boardHeight}px`,
              transform: `scale(${fitScale})`,
            }}
          >
            <svg
              className="bracket-lines"
              width={boardWidth}
              height={boardHeight}
              viewBox={`0 0 ${boardWidth} ${boardHeight}`}
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={arrowMarkerId}
                  markerWidth="9"
                  markerHeight="9"
                  refX="8"
                  refY="4.5"
                  orient="auto"
                >
                  <path className="bracket-arrow-head" d="M 0 0 L 9 4.5 L 0 9 z" />
                </marker>
              </defs>
              {edges.map((edge) => (
                <path
                  d={edge.path}
                  key={edge.id}
                  markerEnd={`url(#${arrowMarkerId})`}
                />
              ))}
            </svg>
            {Array.from({ length: maxStage + 1 }, (_, stage) => {
              const matchCount = nodes.filter((node) => node.stage === stage).length;
              return (
                <div
                  className="bracket-stage-label"
                  key={stage}
                  style={{ left: `${boardLeft + stage * columnStep}px` }}
                >
                  <span>{t("ROUND {count}", { count: stage + 1 })}</span>
                  <small>{matchCount} {t("BATTLES")}</small>
                </div>
              );
            })}
            <div
              className="bracket-stage-label champion-label"
              style={{ left: `${championX}px` }}
            >
              <span>{t("FINAL")}</span>
              <small>{t("THE ONE")}</small>
            </div>
            {nodes.map((node) => (
              <article
                className={`bracket-match ${node.match.carryMatch ? "carry" : ""}`}
                key={node.match.id}
                style={{
                  left: `${boardLeft + node.stage * columnStep}px`,
                  top: `${node.y - cardHeight / 2}px`,
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                }}
              >
                <div className="bracket-match-meta">
                  <span>
                    {t("BATTLE")} {String(node.match.order).padStart(2, "0")}
                  </span>
                  {node.match.carryMatch && <b>{t("PLAYOFF")}</b>}
                </div>
                <BracketTrack
                  item={itemById.get(node.match.winnerId)}
                  winner
                />
                <div className="bracket-versus">VS</div>
                <BracketTrack item={itemById.get(node.match.loserId)} />
              </article>
            ))}
            {root && (
              <article
                className="bracket-champion-card"
                style={{ left: `${championX}px`, top: `${root.y - 132}px` }}
              >
                <span>♛</span>
                {champion && <img src={champion.thumbnailUrl} alt="" />}
                <div>
                  <small>{t("Champion")}</small>
                  <strong>{champion?.title ?? t("Champion")}</strong>
                  <p>{champion?.channel}</p>
                </div>
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BracketTrack({
  item,
  winner = false,
}: {
  item: PackItem | undefined;
  winner?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`bracket-track ${winner ? "winner" : "loser"}`}>
      {item ? <img src={item.thumbnailUrl} alt="" /> : <span className="missing-track">?</span>}
      <div>
        <strong>{item?.title ?? t("Deleted track")}</strong>
        <small>{item?.channel}</small>
      </div>
      {winner && <b>{t("WIN")}</b>}
    </div>
  );
}

function LoginModal({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (nickname: string, password: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onLogin(nickname, password);
    } catch (nextError) {
      setError(t((nextError as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <form className="login-modal" onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose}>
          ×
        </button>
        <LogoMark />
        <span className="modal-kicker">{t("PRIVATE ARENA")}</span>
        <h2>{t("Sign in to continue")}</h2>
        <label className="field">
          <span>{t("Nickname")}</span>
          <input
            autoFocus
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="field">
          <span>{t("Password")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary" disabled={busy}>
          {busy ? "…" : t("Sign in")}
          <span>↗</span>
        </button>
      </form>
    </div>
  );
}

function AdminView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allPacks, setAllPacks] = useState<Pack[]>([]);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🎧");
  const [resetValues, setResetValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () =>
    Promise.all([
      api<{ users: AdminUser[] }>("/api/admin/users"),
      api<{ packs: Pack[] }>("/api/packs?scope=all"),
    ])
      .then(([userData, packData]) => {
        setUsers(userData.users);
        setAllPacks(packData.packs);
      })
      .catch((nextError) => setError(nextError.message));
  useEffect(() => {
    void load();
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ nickname, password, avatarEmoji }),
      });
      setNickname("");
      setPassword("");
      setNotice(t("User created"));
      await load();
    } catch (nextError) {
      setError((nextError as Error).message);
    }
  }

  async function reset(user: AdminUser) {
    const nextPassword = resetValues[user.id] ?? "";
    if (!nextPassword) return;
    try {
      await api("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ id: user.id, password: nextPassword }),
      });
      setResetValues((current) => ({ ...current, [user.id]: "" }));
      setNotice(t("Password reset"));
    } catch (nextError) {
      setError((nextError as Error).message);
    }
  }

  async function remove(user: AdminUser) {
    if (!window.confirm(t("Delete {name}?", { name: user.nickname }))) return;
    try {
      await api(`/api/admin/users?id=${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      setNotice(t("User deleted; their packs were preserved"));
      await load();
    } catch (nextError) {
      setError((nextError as Error).message);
    }
  }

  return (
    <section className="page-wrap admin-view">
      <FlowBack label="Back" onClick={onBack} />
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span>●</span>
            {t("ADMIN ONLY")}
          </div>
          <h2>{t("User control")}</h2>
          <p>
            {t("Create accounts, reset passwords and preserve their packs.")}
          </p>
        </div>
      </div>
      <div className="admin-layout">
        <form className="create-user-panel" onSubmit={create}>
          <span className="aside-label">{t("Create user")}</span>
          <label className="field">
            <span>{t("Nickname")}</span>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>{t("Password")}</span>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <div className="profile-emoji-grid">
            {PROFILE_EMOJIS.map((emoji) => (
              <button
                type="button"
                className={avatarEmoji === emoji ? "selected" : ""}
                key={emoji}
                onClick={() => setAvatarEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button className="button primary">
            {t("Create user")}
            <span>＋</span>
          </button>
          {error && <div className="form-error">{t(error)}</div>}
          {notice && <div className="form-success">{notice}</div>}
        </form>
        <div className="user-table">
          {users.map((item) => (
            <article className={item.deletedAt ? "deleted" : ""} key={item.id}>
              <span className="admin-avatar">
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt="" />
                ) : (
                  item.avatarEmoji
                )}
              </span>
              <div className="user-identity">
                <b>{item.nickname}</b>
                <small>
                  {item.role} · {item.packCount} {t("packs")}
                </small>
              </div>
              <span className={`user-status ${item.deletedAt ? "off" : ""}`}>
                {t(item.deletedAt ? "Deleted" : "Active")}
              </span>
              {!item.deletedAt && (
                <div className="reset-password">
                  <input
                    type="password"
                    placeholder={t("New password")}
                    value={resetValues[item.id] ?? ""}
                    onChange={(event) =>
                      setResetValues((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                  <button onClick={() => reset(item)}>
                    {t("Reset password")}
                  </button>
                </div>
              )}
              {!item.deletedAt && item.role !== "admin" && (
                <button className="delete-user" onClick={() => remove(item)}>
                  {t("Delete user")}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="admin-pack-audit">
        <div className="section-line">
          <div>
            <h3>{t("All private packs")}</h3>
            <p>{t("Every imported pack and its owner.")}</p>
          </div>
          <span>{allPacks.length}</span>
        </div>
        {allPacks.length === 0 ? (
          <div className="admin-pack-empty">
            {t("No packs have been imported yet.")}
          </div>
        ) : (
          <div className="admin-pack-grid">
            {allPacks.map((pack) => {
              const owner = users.find((item) => item.id === pack.ownerId);
              return (
                <article key={pack.id}>
                  <div className="admin-pack-cover">
                    <PackCover pack={pack} />
                  </div>
                  <div>
                    <b>{pack.name}</b>
                    <small>
                      {pack.itemCount}{" "}
                      {t(isYouTubeSource(pack.sourceType) ? "videos" : "tracks")}{" "}
                      · {t(sourceName(pack.sourceType))}
                    </small>
                  </div>
                  <span className={owner?.deletedAt ? "owner-deleted" : ""}>
                    {pack.ownerNickname}
                    {owner?.deletedAt ? ` · ${t("Deleted")}` : ""}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
