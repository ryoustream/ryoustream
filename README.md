# Ryounime — RS1 Core Streaming

Mobile-first anime streaming web app. GitHub Pages hosted. Zero backend.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS |
| Player | Plyr + HLS.js |
| Hosting | GitHub Pages |
| PWA | Service Worker + Web App Manifest |
| Storage | localStorage (user data) |

---

## Struktur

```
/
├── index.html          # Home — hero, trending, latest, popular
├── details.html        # Detail anime — info, action, rekomendasi
├── watch.html          # Player — Plyr + HLS, episode grid, source switcher
├── search.html         # Pencarian + filter genre/tipe/status
├── favorites.html      # Favorit + Watchlist + Riwayat
├── live.html           # Live TV — channel list + player
├── settings.html       # Tema, player, subtitle, data
├── 404.html
├── manifest.json       # PWA
├── sw.js               # Service Worker
│
├── assets/
│   ├── css/
│   │   ├── vars.css    # Design tokens + themes
│   │   ├── base.css    # Reset, utilities, skeleton
│   │   ├── nav.css     # Header + bottom nav + search overlay
│   │   ├── hero.css    # Banner slideshow
│   │   ├── card.css    # Poster card, wide card
│   │   ├── player.css  # Watch page, episode grid
│   │   └── details.css # Detail page
│   ├── js/
│   │   ├── utils.js    # Storage, History, Favorites, lazy load, helpers
│   │   ├── app.js      # Data loader, App core
│   │   └── player.js   # Plyr wrapper, HLS, fallback, auto-next
│   └── images/
│       └── placeholder.svg
│
└── data/
    ├── anime/
    │   ├── index.json          # Anime catalog index
    │   └── {id}.json           # Per-anime detail (optional)
    ├── episodes/
    │   └── {animeId}.json      # Episode list + sources
    ├── live/
    │   └── channels.json       # Live TV channels
    └── schedule/
        └── weekly.json         # Jadwal mingguan
```

---

## Data Format

### `data/anime/index.json`
Array of anime objects. Fields: `id`, `title`, `title_alt`, `type`, `status`, `year`, `total_eps`, `rating`, `popularity`, `trending`, `featured`, `studio`, `genres[]`, `poster`, `banner`, `synopsis`, `last_updated`, `air_date`

### `data/episodes/{animeId}.json`
Array of episode objects. Fields: `ep`, `title`, `duration`, `thumbnail`, `sources[]`, `subtitles[]`

Each source: `{ name, type: "hls"|"mp4", url }`

### `data/live/channels.json`
Array of channel objects: `{ id, name, category, logo, url, type, now_playing, quality }`

---

## Themes
`data-theme` attribute on `<html>`:
- `""` → Dark (default)
- `"amoled"` → AMOLED black
- `"light"` → Light mode
- `"purple"` → Purple accent
- `"blue"` → Blue accent

---

## RS Roadmap

- **RS1** ✅ Core Streaming (ini)
- **RS2** — Schedule, Notification, More filters
- **RS3** — User accounts, Comments, Ratings
- **RS4** — Admin panel, CMS data entry
