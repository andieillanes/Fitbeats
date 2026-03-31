# FitBeats - PRD (Product Requirements Document)

## Problema Original
Plataforma de música tipo Spotify enfocada en estudios de fitness ("FitBeats"). Admin sube mixes, instructores crean playlists combinando mixes + Spotify, con reproductor continuo, reproducción offline, playlists compartibles, roles y diseño móvil.

## Stack
- Backend: FastAPI + MongoDB | Frontend: React + Tailwind + Shadcn/UI + Phosphor Icons
- Audio: Mutagen + Object Storage + HTTP Range Requests | Auth: JWT + Google OAuth
- Spotify: Client Credentials (búsqueda) + Authorization Code (SDK playback)
- Offline: IndexedDB para caché de audio

## Implementado

### Core (Completado)
- [x] Auth JWT + roles (admin, instructor, studio) + Google OAuth
- [x] CRUD Álbumes, Mixes (batch upload, metadatos auto BPM/duración)
- [x] Streaming optimizado HTTP Range Requests
- [x] Panel admin completo

### Spotify Integration (31 Mar 2026)
- [x] Búsqueda con tabs (Todo/Mixes/Spotify)
- [x] Playlists mixtas (mixes locales + Spotify tracks)
- [x] Reproductor unificado con preview_url + SDK Premium

### Playlists Compartibles (31 Mar 2026)
- [x] Página pública `/shared/{id}` sin autenticación
- [x] Botón compartir genera URL `/shared/{id}`

### Reproducción Offline (31 Mar 2026)
- [x] Caché de audio en IndexedDB (botón "Guardar offline" en playlists)
- [x] Reproductor usa caché local primero, luego red

### Página de Perfil (31 Mar 2026)
- [x] Edición de nombre, info de cuenta, badge de rol
- [x] Conectar/desconectar Spotify Premium

### Modo Clase (31 Mar 2026)
- [x] Crear sesiones con secuencia de canciones (mixes + Spotify)
- [x] Duración personalizada por track (segundos)
- [x] Tipo de transición: crossfade, corte, fade out, fade in
- [x] Reproductor clase: start/stop/skip, timer auto-avance
- [x] Barra de progreso seekable + timeline de tracks clickeable
- [x] Audio se reproduce correctamente (sync timer + reproductor)

### UI/UX Mobile (31 Mar 2026)
- [x] Layout flex responsivo para listas de canciones
- [x] Agregar canciones desde vista de playlist (dialog con búsqueda)

## DB Schema
- `users`: user_id, email, password_hash, name, role, studio_id, spotify_*
- `albums`: album_id, name, artist, year, cover_path, is_active
- `mixes`: mix_id, name, artist, bpm, duration, genre, album_id, audio_path, cover_path
- `playlists`: playlist_id, name, description, is_public, user_id, items[], mix_ids
- `class_sessions`: session_id, name, user_id, tracks[], transition_duration
- `studios`: studio_id, name, address, phone, is_active

## Backlog
- [ ] Crossfade real (Web Audio API) entre tracks en modo clase
- [ ] Drag-and-drop reordenar tracks
- [ ] Gestión cuentas Premium Spotify por instructor
- [ ] Estadísticas de uso
- [ ] Playlists colaborativas
