export const COVER_EMOJIS = [
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

export const SOURCE_TILES = [
  { id: "music", title: "Music Service", icon: "♫", live: true },
  { id: "images", title: "Image Collection", icon: "▧", live: false },
  { id: "text", title: "Text / CSV List", icon: "≡", live: false },
  { id: "web", title: "Web Page", icon: "⌁", live: false },
  { id: "file", title: "File Upload", icon: "↑", live: false },
];

export const MUSIC_SERVICE_TILES = [
  {
    id: "youtube",
    title: "YouTube / YouTube Music",
    icon: "▶",
    live: true,
  },
  { id: "spotify", title: "Spotify", icon: "●", live: true },
  { id: "yandex", title: "Yandex Music", icon: "Я", live: true },
] as const;

export type MusicSource = (typeof MUSIC_SERVICE_TILES)[number]["id"];
