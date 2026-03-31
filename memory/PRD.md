# FitBeats - PRD (Product Requirements Document)

## Problema Original
Plataforma de música tipo Spotify enfocada en estudios de fitness ("FitBeats"). El administrador sube mixes propios que puede agrupar en álbumes. Los instructores crean playlists seleccionando mixes del catálogo y combinándolos con canciones de Spotify para las transiciones. Se requiere reproductor continuo, descarga offline, playlists compartibles, roles (Admin, Instructores, Estudios), diseño responsivo móvil y autenticación.

## User Personas
- **Admin**: Sube mixes de audio, gestiona álbumes, estudios e instructores
- **Instructor**: Crea playlists y sesiones de clase, reproduce música durante sesiones de fitness
- **Studio**: Administra instructores asociados

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB (Motor)
- **Frontend**: React + Tailwind CSS + Shadcn/UI + Phosphor Icons
- **Audio**: Mutagen (metadata), Object Storage, HTTP Range Requests (streaming)
- **Auth**: JWT + Google OAuth (Emergent)
- **Spotify**: Client Credentials (búsqueda) + Authorization Code (SDK playback)

## Arquitectura
```
/app/
├── backend/
│   ├── server.py (all endpoints)
│   ├── requirements.txt
│   └── .env (MONGO_URL, JWT_SECRET, SPOTIFY_CLIENT_ID/SECRET, EMERGENT_LLM_KEY)
├── frontend/
│   ├── src/
│   │   ├── App.js (AuthProvider, SpotifyProvider, PlayerProvider, routes)
│   │   ├── pages/
│   │   │   ├── MainLayout.js (Spotify-style layout + player bar)
│   │   │   ├── AdminPage.js (admin dashboard)
│   │   │   ├── SharedPlaylistPage.js (public playlist view - no auth)
│   │   │   ├── SpotifyCallbackPage.js (Spotify OAuth return)
│   │   │   └── views/
│   │   │       ├── AlbumsView.js, AlbumDetailView.js
│   │   │       ├── SongsView.js (mobile-responsive flex layout)
│   │   │       ├── PlaylistsView.js, PlaylistDetailView.js (add songs dialog)
│   │   │       ├── SearchView.js (Spotify search tabs)
│   │   │       ├── ProfileView.js (Spotify connect, edit name)
│   │   │       └── ClassModeView.js (class session editor/player)
│   │   └── components/ui/ (Shadcn components)
│   └── .env (REACT_APP_BACKEND_URL)
```

## Implementado

### Core
- [x] Setup FastAPI + MongoDB + React
- [x] Autenticación JWT con roles (admin, instructor)
- [x] Google OAuth vía Emergent Auth
- [x] CRUD Álbumes con portadas
- [x] CRUD Mixes con subida de audio y auto-detección de metadatos (BPM, duración, género)
- [x] Subida de mixes en lote (batch upload)
- [x] Streaming de audio optimizado con HTTP Range Requests (206 Partial Content)
- [x] CRUD Studios e Instructores
- [x] Panel de administración completo

### Spotify Integration (31 Mar 2026)
- [x] Búsqueda de canciones en Spotify (Client Credentials flow)
- [x] Tabs de búsqueda: Todo / Mixes / Spotify
- [x] Agregar tracks de Spotify a playlists
- [x] Reproductor unificado: mixes locales + tracks Spotify (preview + SDK Premium)
- [x] Spotify OAuth connect para Web Playback SDK
- [x] Cola de reproducción soporta ambos tipos

### Playlists Compartibles (31 Mar 2026)
- [x] Endpoint público `/api/public/playlists/{id}` sin autenticación
- [x] Página `/shared/{playlist_id}` con CTA de registro

### Descarga Offline (31 Mar 2026)
- [x] Descarga de playlist completa como ZIP (`/api/playlists/{id}/download`)

### Página de Perfil (31 Mar 2026)
- [x] Edición de nombre
- [x] Botón conectar/desconectar Spotify
- [x] Información de cuenta y rol
- [x] Cerrar sesión

### Modo Clase (31 Mar 2026)
- [x] Crear sesiones de clase con secuencia de canciones
- [x] Duración personalizada por canción (en segundos)
- [x] Tipo de transición por canción (crossfade, corte, fade out, fade in)
- [x] Duración de transición configurable
- [x] Reproductor de clase con auto-avance, start/stop/skip
- [x] Barra de progreso por track
- [x] Agregar mixes locales y canciones de Spotify

### Correcciones UI/UX (31 Mar 2026)
- [x] Vista móvil de canciones: layout flex responsivo (antes grid cortaba nombres)
- [x] Agregar canciones directamente desde la vista de playlist (dialog con búsqueda)
- [x] Acceso de instructores al catálogo verificado

## DB Schema
- `users`: user_id, email, password_hash, name, role, studio_id, spotify_access_token, spotify_refresh_token
- `albums`: album_id, name, artist, year, cover_path, is_active
- `mixes`: mix_id, name, artist, bpm, duration, genre, album_id, audio_path, cover_path, is_active
- `playlists`: playlist_id, name, description, is_public, user_id, user_name, mix_ids, items[], created_at
- `class_sessions`: session_id, name, user_id, tracks[{type, mix_id/spotify_id, name, artist, custom_duration, transition}], transition_duration
- `studios`: studio_id, name, address, phone, is_active

## Backlog Priorizado

### P2 - Futuro
- [ ] Gestión de cuentas Premium de Spotify por instructor
- [ ] Estadísticas de uso por instructor/studio
- [ ] Reordenamiento drag-and-drop de items en playlists
- [ ] Playlists colaborativas entre instructores
- [ ] Notificaciones de nuevos mixes
- [ ] Crossfade real en el reproductor (Web Audio API)

## Credenciales
- Admin: admin@fitbeats.com / Admin123!
- Instructor: instructor@test.com / Test1234!
- Spotify API: Configurado en backend/.env
