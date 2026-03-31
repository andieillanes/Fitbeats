import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, usePlayer, useSpotify, API } from '../App';
import axios from 'axios';
import { 
  House, MusicNote, Disc, MicrophoneStage, Clock, 
  MagnifyingGlass, Queue, Heart, Plus, Gear,
  Play, Pause, SkipBack, SkipForward, SpeakerHigh, 
  SpeakerLow, SpeakerX, Shuffle, Repeat, ListPlus,
  CaretDown, SignOut, X, SpotifyLogo, Lightning
} from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Slider } from '../components/ui/slider';
import { Toaster } from '../components/ui/sonner';

// Sub-pages
import AlbumsView from './views/AlbumsView';
import AlbumDetailView from './views/AlbumDetailView';
import SongsView from './views/SongsView';
import PlaylistsView from './views/PlaylistsView';
import PlaylistDetailView from './views/PlaylistDetailView';
import SearchView from './views/SearchView';
import ProfileView from './views/ProfileView';
import ClassModeView from './views/ClassModeView';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    currentMix, queue, isPlaying, currentIndex, shuffle, repeat,
    playNext, playPrevious, togglePlay, toggleShuffle, toggleRepeat, setIsPlaying
  } = usePlayer();
  const spotify = useSpotify();
  
  const [showQueue, setShowQueue] = useState(true);
  const [playlists, setPlaylists] = useState([]);
  const audioRef = React.useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [spotifyEmbedId, setSpotifyEmbedId] = useState(null);
  const lastTrackRef = React.useRef(null);

  const isSpotifyTrack = currentMix?.type === 'spotify';

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        const res = await axios.get(`${API}/playlists/mine`);
        setPlaylists(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlaylists();
  }, []);

  // Offline audio cache helpers
  const getOfflineAudio = async (mixId) => {
    try {
      const req = indexedDB.open('fitbeats_offline', 1);
      return new Promise((resolve) => {
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('audio')) { resolve(null); return; }
          const tx = db.transaction('audio', 'readonly');
          const store = tx.objectStore('audio');
          const getReq = store.get(mixId);
          getReq.onsuccess = () => resolve(getReq.result?.audio || null);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  };

  // Handle track changes - play audio or Spotify
  useEffect(() => {
    const trackId = currentMix?.mix_id || currentMix?.spotify_id;
    const lastId = lastTrackRef.current;
    if (trackId === lastId && !currentMix) return;
    lastTrackRef.current = trackId;

    if (!currentMix) {
      setSpotifyEmbedId(null);
      return;
    }

    if (isSpotifyTrack) {
      // Pause HTML5 audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      // Try SDK first (Premium users)
      if (spotify?.spotifyDeviceId && currentMix.uri) {
        spotify.playSpotifyTrack(currentMix.uri).then(ok => {
          if (ok) {
            setSpotifyPlaying(true);
            setSpotifyEmbedId(null);
          } else {
            // Fallback to embed player
            setSpotifyPlaying(false);
            setSpotifyEmbedId(currentMix.spotify_id);
          }
        });
      } else {
        // No SDK - use embed player
        setSpotifyPlaying(false);
        setSpotifyEmbedId(currentMix.spotify_id);
      }
      if (currentMix.duration_ms) setDuration(currentMix.duration_ms / 1000);
    } else {
      // Local mix - stop Spotify
      if (spotify?.spotifyPlayer) spotify.pauseSpotify();
      setSpotifyPlaying(false);
      setSpotifyEmbedId(null);
      
      if (audioRef.current && currentMix.mix_id) {
        // Try offline cache first, then network
        getOfflineAudio(currentMix.mix_id).then(cachedAudio => {
          if (cachedAudio) {
            const blob = new Blob([cachedAudio], { type: 'audio/mpeg' });
            const blobUrl = URL.createObjectURL(blob);
            audioRef.current.src = blobUrl;
          } else {
            audioRef.current.src = `${API}/mixes/${currentMix.mix_id}/audio`;
          }
          if (isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        });
      }
    }
  }, [currentMix]);

  // Handle play/pause for local audio (only for pause/resume, NOT for track changes)
  useEffect(() => {
    if (!audioRef.current) return;
    if (isSpotifyTrack && spotifyPlaying) return;
    if (isSpotifyTrack && !currentMix?.preview_url) return;
    
    if (isPlaying) {
      // Only call play if audio is ready (has src and enough data)
      if (audioRef.current.readyState >= 2 && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
      // If not ready, onCanPlayThrough will handle it
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  // Handle play/pause for Spotify SDK
  useEffect(() => {
    if (!isSpotifyTrack || !spotifyPlaying) return;
    if (isPlaying) {
      spotify?.resumeSpotify();
    } else {
      spotify?.pauseSpotify();
    }
  }, [isPlaying, spotifyPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const navItems = [
    { path: '/', icon: House, label: 'Inicio' },
    { path: '/albums', icon: Disc, label: 'Álbumes' },
    { path: '/songs', icon: MusicNote, label: 'Canciones' },
    { path: '/playlists', icon: ListPlus, label: 'Playlists' },
    { path: '/class-mode', icon: Lightning, label: 'Modo Clase' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const VolumeIcon = isMuted || volume === 0 ? SpeakerX : volume < 0.5 ? SpeakerLow : SpeakerHigh;

  return (
    <div className={`app-container ${!showQueue ? 'queue-hidden' : ''}`} data-testid="main-layout">
      {/* Left Sidebar */}
      <aside className="sidebar" data-testid="sidebar">
        {/* Logo */}
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2" data-testid="logo">
            <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
              <MusicNote size={18} weight="fill" className="text-black" />
            </div>
            <span className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
              FitBeats
            </span>
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={16} />
            <Input
              placeholder="Buscar"
              className="pl-9 bg-[#242424] border-0 rounded-full text-sm h-10 focus-visible:ring-1 focus-visible:ring-white"
              onFocus={() => navigate('/search')}
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={24} weight={isActive(item.path) ? 'fill' : 'regular'} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Playlists Section */}
        <div className="mt-6 px-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs uppercase tracking-wider text-[#B3B3B3] font-bold">
              Mis Playlists
            </span>
            <Link to="/playlists">
              <Plus size={20} className="text-[#B3B3B3] hover:text-white cursor-pointer" />
            </Link>
          </div>
          <div className="overflow-y-auto flex-1 space-y-1">
            {playlists.slice(0, 10).map((playlist) => (
              <Link
                key={playlist.playlist_id}
                to={`/playlists/${playlist.playlist_id}`}
                className="nav-item py-2"
                data-testid={`playlist-nav-${playlist.playlist_id}`}
              >
                <span className="truncate">{playlist.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Admin Link */}
        {user?.role === 'admin' && (
          <div className="p-4 border-t border-[#282828]">
            <Link
              to="/admin"
              className="nav-item"
              data-testid="nav-admin"
            >
              <Gear size={20} />
              <span>Administración</span>
            </Link>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content" data-testid="main-content">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-transparent">
          <div className="flex gap-2">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white"
            >
              ←
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white"
            >
              →
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 bg-black/70 rounded-full p-1 pr-3 hover:bg-black/90" data-testid="user-menu">
                <div className="w-7 h-7 rounded-full bg-[#535353] flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-bold text-white">{user?.name}</span>
                <CaretDown size={16} className="text-white" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#282828] border-0 w-52">
              <DropdownMenuItem 
                onClick={() => navigate('/profile')}
                className="text-white hover:bg-[#3E3E3E] cursor-pointer"
                data-testid="nav-profile-menu"
              >
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-[#3E3E3E] cursor-pointer pointer-events-none">
                <span className="text-xs text-[#B3B3B3]">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#404040]" />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-white hover:bg-[#3E3E3E] cursor-pointer"
                data-testid="logout-btn"
              >
                <SignOut size={16} className="mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Content */}
        <div className="relative z-[1] px-6 pb-6">
          <Routes>
            <Route path="/" element={<AlbumsView title="Novedades" />} />
            <Route path="/albums" element={<AlbumsView title="Todos los Álbumes" />} />
            <Route path="/albums/:id" element={<AlbumDetailView />} />
            <Route path="/songs" element={<SongsView />} />
            <Route path="/playlists" element={<PlaylistsView />} />
            <Route path="/playlists/:id" element={<PlaylistDetailView />} />
            <Route path="/search" element={<SearchView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/class-mode" element={<ClassModeView />} />
          </Routes>
        </div>
      </main>

      {/* Right Sidebar - Queue */}
      {showQueue && (
        <aside className="queue-sidebar flex flex-col" data-testid="queue-sidebar">
          <div className="p-4 border-b border-[#282828] flex items-center justify-between">
            <span className="font-bold text-white">Cola de reproducción</span>
            <button onClick={() => setShowQueue(false)} className="text-[#B3B3B3] hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {queue.length === 0 ? (
              <div className="text-center py-8 text-[#B3B3B3]">
                <Queue size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">La cola está vacía</p>
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map((mix, idx) => {
                  const isSpotify = mix.type === 'spotify';
                  const trackKey = isSpotify ? mix.spotify_id : mix.mix_id;
                  return (
                    <div
                      key={`${trackKey}-${idx}`}
                      className={`queue-item ${idx === currentIndex ? 'active' : ''}`}
                      data-testid={`queue-item-${trackKey}`}
                    >
                      <div className="w-10 h-10 rounded bg-[#282828] flex-shrink-0 overflow-hidden">
                        {isSpotify ? (
                          mix.album_image ? (
                            <img src={mix.album_image_small || mix.album_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <SpotifyLogo size={16} className="text-[#1DB954]" />
                            </div>
                          )
                        ) : (
                          mix.cover_path ? (
                            <img src={`${API}/mixes/${mix.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MusicNote size={16} className="text-[#B3B3B3]" />
                            </div>
                          )
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className={`text-sm font-medium truncate ${idx === currentIndex ? 'text-[#1DB954]' : 'text-white'}`}>
                            {mix.name}
                          </p>
                          {isSpotify && <SpotifyLogo size={10} weight="fill" className="text-[#1DB954] flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-[#B3B3B3] truncate">{mix.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Player Bar */}
      <div className="player-bar" data-testid="player-bar">
        <audio
          ref={audioRef}
          preload="auto"
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onCanPlay={() => {
            if (isPlaying && audioRef.current.paused) {
              audioRef.current.play().catch(() => {});
            }
          }}
          onCanPlayThrough={() => {
            if (isPlaying && audioRef.current.paused) {
              audioRef.current.play().catch(() => {});
            }
          }}
          onEnded={playNext}
        />

        {/* Spotify Embed Player (visible, for playback without Premium SDK) */}
        {spotifyEmbedId && (
          <div className="fixed bottom-[80px] left-0 right-0 z-50 flex justify-center px-4 pb-2" data-testid="spotify-embed-container">
            <div className="w-full max-w-[480px] rounded-xl overflow-hidden shadow-2xl shadow-black/60 bg-[#181818] border border-[#282828]">
              <div className="flex items-center gap-3 p-4">
                <div className="w-14 h-14 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                  {currentMix?.album_image ? (
                    <img src={currentMix.album_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><SpotifyLogo size={24} className="text-[#1DB954]" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">{currentMix?.name}</p>
                  <p className="text-xs text-[#B3B3B3] truncate">{currentMix?.artist}</p>
                  <p className="text-[10px] text-[#6A6A6A] mt-1">
                    <a href="/profile" className="text-[#1DB954] hover:underline">Conecta Spotify Premium</a> para reproducir dentro de FitBeats
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentMix?.uri && (
                    <a
                      href={`https://open.spotify.com/track/${spotifyEmbedId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1DB954] text-black font-bold text-sm hover:bg-[#1ed760] transition-colors"
                      data-testid="open-in-spotify-btn"
                    >
                      <SpotifyLogo size={18} weight="fill" />
                      Abrir
                    </a>
                  )}
                  <button 
                    onClick={() => { setSpotifyEmbedId(null); setIsPlaying(false); }} 
                    className="text-[#B3B3B3] hover:text-white"
                    data-testid="close-spotify-embed"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Now Playing */}
        <div className="flex items-center gap-3 w-[30%] min-w-[120px] md:min-w-[180px]">
          {currentMix ? (
            <>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                {isSpotifyTrack ? (
                  currentMix.album_image ? (
                    <img src={currentMix.album_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#1DB954]/20">
                      <SpotifyLogo size={20} className="text-[#1DB954]" />
                    </div>
                  )
                ) : (
                  currentMix.cover_path ? (
                    <img src={`${API}/mixes/${currentMix.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicNote size={20} className="text-[#B3B3B3]" />
                    </div>
                  )
                )}
              </div>
              <div className="min-w-0 hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-white truncate">{currentMix.name}</p>
                  {isSpotifyTrack && <SpotifyLogo size={12} weight="fill" className="text-[#1DB954] flex-shrink-0" />}
                </div>
                <p className="text-xs text-[#B3B3B3] truncate">{currentMix.artist}</p>
              </div>
              <button className="text-[#B3B3B3] hover:text-white ml-2 hidden md:block">
                <Heart size={16} />
              </button>
            </>
          ) : (
            <div className="text-[#B3B3B3] text-sm hidden sm:block">Selecciona una canción</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-[722px]">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleShuffle}
              className={`${shuffle ? 'text-[#1DB954]' : 'text-[#B3B3B3]'} hover:text-white`}
              data-testid="shuffle-btn"
            >
              <Shuffle size={16} />
            </button>
            <button 
              onClick={playPrevious}
              className="text-[#B3B3B3] hover:text-white"
              data-testid="prev-btn"
            >
              <SkipBack size={20} weight="fill" />
            </button>
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
              data-testid="play-pause-btn"
            >
              {isPlaying ? (
                <Pause size={16} weight="fill" className="text-black" />
              ) : (
                <Play size={16} weight="fill" className="text-black ml-0.5" />
              )}
            </button>
            <button 
              onClick={playNext}
              className="text-[#B3B3B3] hover:text-white"
              data-testid="next-btn"
            >
              <SkipForward size={20} weight="fill" />
            </button>
            <button 
              onClick={toggleRepeat}
              className={`${repeat ? 'text-[#1DB954]' : 'text-[#B3B3B3]'} hover:text-white`}
              data-testid="repeat-btn"
            >
              <Repeat size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-[#B3B3B3] w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                if (audioRef.current) {
                  audioRef.current.currentTime = parseFloat(e.target.value);
                }
              }}
              className="flex-1 h-1"
              style={{
                background: `linear-gradient(to right, #fff ${(currentTime/duration)*100}%, #4d4d4d ${(currentTime/duration)*100}%)`
              }}
            />
            <span className="text-xs text-[#B3B3B3] w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Extra Controls */}
        <div className="flex items-center gap-3 justify-end w-[30%] min-w-[180px]">
          <button 
            onClick={() => setShowQueue(!showQueue)}
            className={`${showQueue ? 'text-[#1DB954]' : 'text-[#B3B3B3]'} hover:text-white`}
            data-testid="queue-toggle-btn"
          >
            <Queue size={16} />
          </button>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="text-[#B3B3B3] hover:text-white"
          >
            <VolumeIcon size={16} />
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setIsMuted(false); }}
            className="w-24 h-1 hidden sm:block"
            style={{
              background: `linear-gradient(to right, #fff ${(isMuted ? 0 : volume)*100}%, #4d4d4d ${(isMuted ? 0 : volume)*100}%)`
            }}
          />
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 px-4 py-2 ${isActive(item.path) ? 'text-white' : 'text-[#B3B3B3]'}`}
          >
            <item.icon size={24} weight={isActive(item.path) ? 'fill' : 'regular'} />
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link to="/admin" className="flex flex-col items-center gap-1 px-4 py-2 text-[#B3B3B3]">
            <Gear size={24} />
            <span className="text-xs">Admin</span>
          </Link>
        )}
      </nav>

      <Toaster position="top-right" toastOptions={{ style: { background: '#282828', border: 'none', color: '#fff' }}} />
    </div>
  );
}
