# FitBeats - PRD (Product Requirements Document)

## Problema Original
Plataforma de música tipo Spotify enfocada en estudios de fitness ("FitBeats"). El administrador sube mixes propios que puede agrupar en álbumes. Los instructores crean playlists seleccionando mixes del catálogo y combinándolos con canciones de Spotify para las transiciones. Se requiere reproductor continuo, descarga offline, playlists compartibles, roles (Admin, Instructores, Estudios), diseño responsivo móvil y autenticación.

## User Personas
- **Admin**: Sube mixes de audio, gestiona álbumes, estudios e instructores
- **Instructor**: Crea playlists mezclando mixes locales + canciones de Spotify, reproduce música durante clases
- **Studio**: Administra instructores asociados

## Stack Tecnológico
- **Backend**: FastAPI + MongoDB (Motor)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Audio**: Mutagen (metadata), Object Storage (archivos), HTTP Range Requests (streaming)
- **Auth**: JWT + Google OAuth (Emergent)
- **Spotify**: Client Credentials (búsqueda) + Authorization Code (SDK playback)

## Arquitectura
```
/app/
├── backend/
│   ├── server.py (1500+ lines - all endpoints)
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
│   │   │   └── views/ (AlbumsView, SongsView, SearchView, PlaylistsView, PlaylistDetailView)
│   │   └── components/ui/ (Shadcn components)
│   └── .env (REACT_APP_BACKEND_URL)
```

## Lo que se ha implementado

### Core (Completado)
- [x] Setup FastAPI + MongoDB + React
- [x] Autenticación JWT con roles (admin, instructor)
- [x] Google OAuth vía Emergent Auth
- [x] CRUD Álbumes con portadas
- [x] CRUD Mixes con subida de audio y auto-detección de metadatos (BPM, duración, género)
- [x] Subida de mixes en lote (batch upload)
- [x] Streaming de audio optimizado con HTTP Range Requests (206 Partial Content)
- [x] CRUD Studios e Instructores
- [x] Panel de administración completo

### Spotify Integration (Completado - 31 Mar 2026)
- [x] Búsqueda de canciones en Spotify (Client Credentials flow - sin login de Spotify)
- [x] Tabs de búsqueda: Todo / Mixes / Spotify
- [x] Resultados con carátula de álbum, nombre, artista, álbum, duración
- [x] Agregar tracks de Spotify a playlists (modelo de items mixtos)
- [x] Reproductor unificado: mixes locales + tracks Spotify (preview_url + SDK Premium)
- [x] Spotify OAuth connect para Web Playback SDK (Premium users)
- [x] Cola de reproducción soporta ambos tipos de tracks
- [x] Indicadores visuales de Spotify (logo verde) en búsqueda, playlist y reproductor

### Playlists Compartibles (Completado - 31 Mar 2026)
- [x] Endpoint público `/api/public/playlists/{id}` sin autenticación
- [x] Página `/shared/{playlist_id}` con vista atractiva de la playlist
- [x] Muestra tracks de Spotify y mixes locales con íconos apropiados
- [x] CTA de registro para usuarios no autenticados
- [x] Botón de compartir copia URL `/shared/{id}`

### Descarga Offline (Completado - 31 Mar 2026)
- [x] Descarga individual de mixes (`/api/mixes/{id}/download`)
- [x] Descarga de playlist completa como ZIP (`/api/playlists/{id}/download`)
- [x] Solo mixes locales (tracks de Spotify excluidos por licencia)
- [x] Botón de descarga en vista de playlist

### UI/UX (Completado)
- [x] Diseño estilo Spotify (layout 3 columnas, reproductor persistente)
- [x] Diseño responsive: sidebar colapsable a 1200px, oculta a 768px
- [x] Navegación inferior en móvil
- [x] Scrollbar personalizado estilo Spotify
- [x] Animaciones de hover en álbums y tracks

## Key API Endpoints
- `POST /api/auth/login` - Login
- `GET /api/spotify/search?q=...` - Buscar en Spotify
- `POST /api/playlists/{id}/items` - Agregar item (mix o spotify) a playlist
- `GET /api/playlists/{id}/items` - Obtener items enriquecidos
- `DELETE /api/playlists/{id}/items/{index}` - Eliminar item
- `GET /api/playlists/{id}/download` - Descargar playlist como ZIP
- `GET /api/public/playlists/{id}` - Playlist pública sin auth
- `GET /api/mixes/{id}/audio` - Stream de audio con Range requests

## DB Schema
- `users`: user_id, email, password_hash, name, role, studio_id, spotify_access_token, spotify_refresh_token
- `albums`: album_id, name, artist, year, cover_path, is_active
- `mixes`: mix_id, name, artist, bpm, duration, genre, album_id, audio_path, cover_path, is_active
- `playlists`: playlist_id, name, description, is_public, user_id, user_name, mix_ids, items[], created_at
- `studios`: studio_id, name, address, phone, is_active

## Backlog Priorizado

### P2 - Futuro
- [ ] Gestión de cuentas Premium de Spotify por instructor (flujo para conectar Spotify Premium individual)
- [ ] Estadísticas de uso por instructor/studio
- [ ] Notificaciones de nuevos mixes
- [ ] Reordenamiento drag-and-drop de items en playlists
- [ ] Playlists colaborativas entre instructores

## Credenciales de Prueba
- Admin: admin@fitbeats.com / Admin123!
- Spotify API: Client ID y Secret configurados en backend/.env
