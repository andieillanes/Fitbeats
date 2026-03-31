# FitBeats - PRD

## Problema Original
Plataforma de música tipo Spotify para estudios de fitness. Admin sube mixes, instructores crean playlists combinando mixes + Spotify, con reproductor continuo, reproducción offline, playlists compartibles, roles y diseño móvil.

## Stack
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn/UI + Phosphor Icons
- Audio: Mutagen + Object Storage + HTTP Range Requests + Disk Cache | Auth: JWT + Google OAuth
- Spotify: Client Credentials (búsqueda) + Authorization Code (SDK playback + playlist import)
- Offline: IndexedDB para caché de audio en el navegador

## Implementado

### Core
- [x] Auth JWT + roles + Google OAuth, CRUD Álbumes/Mixes/Studios, streaming Range Requests, panel admin

### Audio Performance
- [x] Caché en disco backend, POST /api/mixes/preload, Cache-Control 24h
- [x] Frontend reproduce inmediatamente desde red, IndexedDB check en paralelo
- [x] Precarga automática de siguientes 2 tracks

### Spotify Integration
- [x] Búsqueda con tabs, playlists mixtas, Web Playback SDK con transfer playback
- [x] **Importar playlists de Spotify**: GET /api/spotify/playlists + POST /api/spotify/playlists/{id}/import
- [x] OAuth scopes incluyen playlist-read-private, playlist-read-collaborative
- [x] HomeView muestra grid de playlists Spotify con botón de importar (1-click)
- [x] Banner "Conecta tu Spotify" cuando no está conectado

### Reproductor / Player Bar
- [x] Progress bar con rAF, getValidDuration(), seek, CSS custom

### Modo Clase
- [x] Renombrado inline, CRUD sesiones
- [x] Progress bar sincronizada con audio real (rAF leyendo audioRef.current.currentTime)
- [x] Transiciones corregidas: advancingRef previene doble-avance, uri propagado en todos los playMix
- [x] Crossfade (fade out → switch → fade in), Fade Out, Fade In, Cut con duración configurable
- [x] Spotify tracks en clase: uri se pasa correctamente, MainLayout detecta tipo y usa SDK

### Playlists, Offline, Perfil, UI
- [x] Playlists compartibles, caché offline IndexedDB, perfil editable, responsive

## Spotify Setup Required
Redirect URI en Spotify Developer Dashboard:
`https://fitmusic-platform.preview.emergentagent.com/spotify-callback`

## Backlog
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
