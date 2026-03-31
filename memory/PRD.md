# FitBeats - PRD

## Problema Original
Plataforma de música tipo Spotify para estudios de fitness. Admin sube mixes, instructores crean playlists combinando mixes + Spotify, con reproductor continuo, reproducción offline, playlists compartibles, roles y diseño móvil.

## Stack
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn/UI + Phosphor Icons
- Audio: Mutagen + Object Storage + HTTP Range Requests + Disk Cache | Auth: JWT + Google OAuth
- Spotify: Client Credentials (búsqueda) + Authorization Code (SDK + server-side playback)

## Implementado

### Core
- [x] Auth JWT + roles + Google OAuth, CRUD Álbumes/Mixes/Studios, streaming, panel admin

### Audio Performance
- [x] Caché en disco backend, preload, Cache-Control 24h, IndexedDB paralelo

### Spotify Integration
- [x] Búsqueda, playlists mixtas, Web Playback SDK con transfer
- [x] Importar playlists (1-click, anti-duplicados)
- [x] playSpotifyTrack con 3 estrategias: SDK device → any device → server-side
- [x] POST /api/spotify/play server-side (descubre mejor device, transfer + play)
- [x] Iframe embed Spotify como fallback visual

### Playlists
- [x] Modelo flexible, conteo correcto items+mix_ids, cover art Spotify
- [x] Anti-duplicados en importación, sidebar se refresca al navegar

### Reproductor, Modo Clase, Offline, Perfil, UI
- [x] rAF progress, seek, transiciones, renombrado inline, responsive, IndexedDB

## Backlog
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
