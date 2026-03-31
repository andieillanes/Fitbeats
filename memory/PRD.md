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
- [x] Auth JWT + roles + Google OAuth, CRUD Álbumes/Mixes/Studios, streaming, panel admin

### Audio Performance
- [x] Caché en disco backend, preload, Cache-Control 24h, IndexedDB paralelo

### Spotify Integration
- [x] Búsqueda con tabs, playlists mixtas, Web Playback SDK con transfer playback
- [x] Importar playlists de Spotify con 1-click desde HomeView
- [x] Iframe embed real de Spotify como fallback cuando SDK no disponible
- [x] URI se construye desde spotify_id si falta

### Playlists
- [x] PlaylistResponse modelo flexible con campos opcionales (items, mix_ids, spotify_source)
- [x] Vista muestra conteo correcto: items.length + mix_ids.length
- [x] Cover art de primera canción Spotify como thumbnail
- [x] SpotifyLogo en playlists importadas
- [x] Sidebar se refresca al navegar
- [x] Backwards compatibility: campos faltantes se rellenan automáticamente

### Reproductor / Player Bar
- [x] Progress bar con rAF, getValidDuration(), seek, CSS custom

### Modo Clase
- [x] Renombrado inline, advancingRef anti-doble-avance
- [x] Progress bar sincronizada, transiciones Crossfade/Fade Out/Fade In/Cut

### Perfil, UI, Offline
- [x] Edición, Spotify connect/disconnect, responsive, caché offline IndexedDB

## Backlog
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
