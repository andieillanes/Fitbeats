# FitBeats - PRD

## Problema Original
Plataforma de música tipo Spotify para estudios de fitness. Admin sube mixes, instructores crean playlists combinando mixes + Spotify, con reproductor continuo, reproducción offline, playlists compartibles, roles y diseño móvil.

## Stack
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn/UI + Phosphor Icons
- Audio: Mutagen + Object Storage + HTTP Range Requests + Disk Cache | Auth: JWT + Google OAuth
- Spotify: Client Credentials (búsqueda) + Authorization Code (SDK playback)
- Offline: IndexedDB para caché de audio en el navegador

## Implementado

### Core
- [x] Auth JWT + roles + Google OAuth, CRUD Álbumes/Mixes/Studios, streaming Range Requests, panel admin

### Audio Performance (Optimizado)
- [x] Caché en disco del backend (/tmp/fitbeats_audio_cache/) - primera descarga ~2.5s, siguientes ~0.6s
- [x] POST /api/mixes/preload - pre-cachea los siguientes tracks en background
- [x] Frontend reproduce inmediatamente desde red (no espera a IndexedDB)
- [x] IndexedDB check en paralelo - si hay caché local, switch a blob
- [x] Precarga automática de los siguientes 2 tracks en la cola
- [x] Cache-Control: 86400s para navegador

### Spotify Integration
- [x] Búsqueda con tabs (Todo/Mixes/Spotify)
- [x] Playlists mixtas (mixes locales + Spotify tracks)
- [x] Web Playback SDK con transfer playback, token refresh, re-check post-login
- [x] Endpoint PUT /api/spotify/transfer como fallback

### Reproductor / Player Bar
- [x] Progress bar con requestAnimationFrame
- [x] getValidDuration() con fallback a metadata
- [x] Seek funcional, CSS custom range input

### Modo Clase
- [x] Renombrado inline de sesiones desde la lista
- [x] Progress bar sincronizada con audio real (rAF)
- [x] Transiciones: Crossfade, Fade Out, Fade In, Cut con duración configurable

### Playlists, Offline, Perfil, UI
- [x] Playlists compartibles, caché offline IndexedDB, perfil editable, responsive

## Backlog
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
