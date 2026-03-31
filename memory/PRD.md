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
- [x] Búsqueda con tabs (Todo/Mixes/Spotify), playlists mixtas
- [x] Sin Premium: popup con botón "Abrir en Spotify" + link a conectar Premium
- [x] Con Premium conectado: reproducción completa vía Web Playback SDK
- **NOTA**: Spotify eliminó preview_url de su API. Reproducción completa SOLO con Premium SDK.

### Playlists Compartibles
- [x] Página pública `/shared/{id}`, botón compartir genera URL

### Reproducción Offline
- [x] Caché IndexedDB, botón "Guardar offline" en playlists, reproductor usa caché primero

### Perfil
- [x] Edición nombre, conectar/desconectar Spotify, info cuenta/rol

### Modo Clase
- [x] Sesiones con secuencia de canciones, duración personalizada por track
- [x] Transiciones: crossfade, corte, fade out, fade in
- [x] Reproductor: start/stop/skip, timer auto-avance, barra seekable, timeline clickeable

### UI/UX Mobile
- [x] Layout flex responsivo, nombres de canciones completos en móvil
- [x] Columnas álbum/acciones ocultas en pantallas pequeñas

## Backlog
- [ ] Crossfade real (Web Audio API)
- [ ] Drag-and-drop reordenar tracks
- [ ] Estadísticas de uso
- [ ] Playlists colaborativas
