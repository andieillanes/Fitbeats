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
- [x] Fix P0: Transfer playback al device_id del Web SDK al inicializar y antes de cada play
- [x] Fix: SpotifyProvider re-checks conexión cuando el usuario se autentica
- [x] Fix: getOAuthToken del SDK siempre obtiene tokens frescos via API
- [x] Endpoint backend PUT /api/spotify/transfer como fallback server-side
- **NOTA**: Spotify eliminó preview_url. Reproducción completa SOLO con Premium SDK.

### Reproductor / Player Bar
- [x] Progress bar con requestAnimationFrame para tracking suave
- [x] getValidDuration() con fallback a metadata del mix si audio element da NaN/0/Infinity
- [x] Seek funcional (arrastrar barra salta a posición correcta)
- [x] Timer sincronizado con el audio real
- [x] CSS custom para range input (barra fina estilo Spotify con thumb hover)

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
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
- [ ] Crossfade real (Web Audio API) (P2)
