# FitBeats - Plataforma de Música para Fitness

## Problema Original
Crear una plataforma tipo Spotify para estudios de fitness donde el admin sube mixes de música, los instructores crean playlists del catálogo, y hay gestión de estudios/sucursales. Referencia: rackify.cloud

## Fecha de Implementación
31 de Marzo, 2026

## Arquitectura
- **Backend**: FastAPI + MongoDB + Object Storage (Emergent)
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Autenticación**: JWT + Google OAuth (Emergent Auth)

## User Personas
1. **Admin**: Sube mixes, gestiona catálogo, crea cuentas de instructores, administra estudios
2. **Instructor**: Crea playlists del catálogo disponible, reproduce música en clases

## Core Requirements
- ✅ Subida de archivos de audio (mixes)
- ✅ Gestión de catálogo (nombre, artista, BPM, duración, género)
- ✅ Creación de playlists
- ✅ Reproductor de música integrado (estilo Spotify)
- ✅ Gestión de estudios/sucursales
- ✅ Gestión de instructores
- ✅ Auth tradicional (email/password) + Google OAuth
- ✅ Playlists públicas/privadas compartibles
- ✅ Descarga de mixes para uso offline

## What's Been Implemented
### Backend (server.py)
- Auth endpoints: register, login, logout, me, google/session
- Admin endpoints: create/list/delete instructors
- Studios CRUD
- Mixes CRUD con upload de audio y cover
- Playlists CRUD con gestión de mixes
- Streaming de audio y descarga
- Object Storage integration

### Frontend
- LoginPage, RegisterPage con Google OAuth
- Dashboard con estadísticas y accesos rápidos
- CatalogPage con filtros (género, BPM, búsqueda)
- PlaylistsPage para crear y gestionar playlists
- PlaylistDetailPage con reproducción
- AdminPage con tabs para Mixes, Instructores, Estudios
- MusicPlayer persistente (bottom bar estilo Spotify)
- Layout con navegación y menú de usuario

## Prioritized Backlog
### P0 (Done)
- ✅ Core CRUD para mixes, playlists, studios, instructors
- ✅ Sistema de autenticación completo
- ✅ Reproductor de música funcional
- ✅ UI/UX estilo "Performance Pro" dark theme

### P1 (Next)
- Edición de mixes existentes
- Drag & drop para reordenar mixes en playlists
- Filtros avanzados en catálogo
- Perfil de usuario editable

### P2 (Future)
- Historial de reproducción
- Estadísticas de uso
- Favoritos / likes
- Notificaciones
- App móvil (PWA)

## Test Credentials
- Admin: admin@fitbeats.com / Admin123!
