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
- [x] Frontend reproduce inmediatamente desde red, IndexedDB check en paralelo, precarga

### Spotify Integration
- [x] Búsqueda con tabs, playlists mixtas, Web Playback SDK con transfer playback
- [x] Importar playlists de Spotify: GET /api/spotify/playlists + POST /api/spotify/playlists/{id}/import
- [x] OAuth scopes: playlist-read-private, playlist-read-collaborative
- [x] HomeView con grid de playlists Spotify importables (1-click)
- [x] Banner "Conecta tu Spotify" cuando no está conectado
- [x] Iframe embed real de Spotify como fallback cuando SDK no disponible
- [x] URI se construye desde spotify_id si falta

### Reproductor / Player Bar
- [x] Progress bar con rAF, getValidDuration(), seek, CSS custom

### Playlists
- [x] PlaylistResponse modelo flexible con campos opcionales
- [x] Playlists importadas de Spotify se pueden abrir y ver en detalle
- [x] Backwards compatibility: user_name, mix_ids, items rellenados automáticamente
- [x] Playlists compartibles, descarga offline

### Modo Clase
- [x] Renombrado inline, advancingRef anti-doble-avance
- [x] Progress bar sincronizada, transiciones Crossfade/Fade Out/Fade In/Cut
- [x] URI propagado en todos los playMix para Spotify tracks

### Perfil, UI
- [x] Edición nombre, conectar/desconectar Spotify, responsive

## Spotify Setup Required
Redirect URI en Spotify Developer Dashboard:
`https://fitmusic-platform.preview.emergentagent.com/spotify-callback`

## Backlog
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
