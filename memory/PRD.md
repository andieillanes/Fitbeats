# FitBeats - PRD

## Problema Original
Plataforma de música tipo Spotify para estudios de fitness. Admin sube mixes, instructores crean playlists combinando mixes + Spotify, con reproductor continuo, reproducción offline, playlists compartibles, roles y diseño móvil.

## Stack
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn/UI + Phosphor Icons
- Audio: Mutagen + Object Storage + HTTP Range Requests | Auth: JWT + Google OAuth
- Spotify: Client Credentials (búsqueda) + Authorization Code (SDK playback)
- Offline: IndexedDB para caché de audio

## Implementado

### Core
- [x] Auth JWT + roles + Google OAuth, CRUD Álbumes/Mixes/Studios, streaming Range Requests, panel admin

### Spotify Integration
- [x] Búsqueda con tabs (Todo/Mixes/Spotify)
- [x] Playlists mixtas (mixes locales + Spotify tracks)
- [x] Sin Premium: popup con "Conectar" que inicia OAuth directo
- [x] Con Premium (SDK): reproducción completa vía Web Playback SDK
- [x] Fix: redirect_uri usa URL pública (no URL interna del cluster)
- **NOTA**: Spotify eliminó preview_url. Reproducción completa SOLO con Premium SDK.

### Playlists Compartibles
- [x] Página pública `/shared/{id}`, botón compartir genera URL

### Reproducción Offline
- [x] Caché IndexedDB, botón "Guardar offline", reproductor usa caché primero

### Perfil
- [x] Edición nombre, conectar/desconectar Spotify, info cuenta/rol

### Modo Clase
- [x] Sesiones con secuencia, duración personalizada, 4 tipos de transición
- [x] Reproductor con timer, auto-avance, barra seekable, timeline clickeable
- [x] Audio reproduce correctamente al iniciar clase

### UI/UX Mobile
- [x] Layout flex responsivo, nombres completos en móvil, columnas ocultas en small

## Spotify Setup Required
El usuario debe agregar esta Redirect URI en Spotify Developer Dashboard:
`https://fitmusic-platform.preview.emergentagent.com/spotify-callback`

## Backlog
- [ ] Crossfade real (Web Audio API)
- [ ] Drag-and-drop reordenar tracks
- [ ] Estadísticas de uso
- [ ] Playlists colaborativas
