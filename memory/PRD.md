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
- [x] Con Premium (SDK): reproducción completa vía Web Playback SDK
- [x] Transfer playback al device_id del Web SDK
- [x] SpotifyProvider re-checks conexión cuando el usuario se autentica
- [x] getOAuthToken del SDK siempre obtiene tokens frescos
- [x] Endpoint backend PUT /api/spotify/transfer como fallback

### Reproductor / Player Bar
- [x] Progress bar con requestAnimationFrame para tracking suave
- [x] getValidDuration() con fallback a metadata del mix
- [x] Seek funcional
- [x] CSS custom para range input (barra fina estilo Spotify con thumb hover)
- [x] Estado de audio compartido vía PlayerContext (audioRef, setVolume, getVolume, seekAudio)

### Modo Clase
- [x] Sesiones CRUD con renombrado inline desde la lista (ícono lápiz → input → confirmar/cancelar)
- [x] Editor de sesión con tracks, duración personalizada, controles de transición por track
- [x] Progress bar sincronizada con audio real (requestAnimationFrame leyendo audioRef.current.currentTime)
- [x] Sistema de transiciones real: Crossfade (fade out → switch → fade in), Fade Out (volumen 1→0), Fade In (switch a vol 0 → ramp 0→1), Cut (corte directo)
- [x] Selector de duración de transición (1s, 2s, 3s, 5s, 8s, 10s)
- [x] Auto-avance entre tracks con transiciones
- [x] Barra seekable y timeline clickeable
- [x] Controles: start, stop, pause, skip next

### Playlists Compartibles
- [x] Página pública `/shared/{id}`, botón compartir genera URL

### Reproducción Offline
- [x] Caché IndexedDB, botón "Guardar offline", reproductor usa caché primero

### Perfil
- [x] Edición nombre, conectar/desconectar Spotify, info cuenta/rol

### UI/UX
- [x] Layout responsivo, nombres completos en móvil
- [x] Login redirige a / correctamente (no /dashboard)

## Backlog
- [ ] Drag-and-drop reordenar tracks (P1)
- [ ] Estadísticas de uso por instructor (P2)
- [ ] Playlists colaborativas (P2)
- [ ] Crossfade real con Web Audio API (sobreposición de dos fuentes) (P2)
