import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API } from '../App';
import axios from 'axios';
import { Play, Clock, MusicNote, SpotifyLogo, Globe } from '@phosphor-icons/react';

export default function SharedPlaylistPage() {
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, iRes] = await Promise.all([
          axios.get(`${API}/public/playlists/${id}`),
          axios.get(`${API}/public/playlists/${id}/items`)
        ]);
        setPlaylist(pRes.data);
        setItems(iRes.data.items || []);
      } catch (err) {
        setError('Playlist no encontrada o no es pública');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const formatDuration = (val, isMs = false) => {
    if (!val) return '--:--';
    const seconds = isMs ? Math.floor(val / 1000) : val;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const total = items.reduce((acc, item) => {
      if (item.type === 'spotify') return acc + (item.duration_ms || 0) / 1000;
      return acc + (item.duration || 0);
    }, 0);
    return `${Math.floor(total / 60)} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-white gap-4">
        <MusicNote size={64} className="text-[#535353]" />
        <p className="text-[#B3B3B3]">{error}</p>
        <Link to="/login" className="mt-4 px-6 py-2 rounded-full bg-[#1DB954] text-black font-bold hover:bg-[#1ed760] transition-colors">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a472a] to-[#0A0A0A]" data-testid="shared-playlist-page">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/30">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
            <MusicNote size={18} weight="fill" className="text-black" />
          </div>
          <span className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>FitBeats</span>
        </Link>
        <Link to="/login" className="px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors">
          Iniciar sesión
        </Link>
      </div>

      {/* Playlist Info */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-end gap-6 mb-8 flex-wrap">
          <div className="w-48 h-48 md:w-56 md:h-56 rounded shadow-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#535353] to-[#282828] flex items-center justify-center">
            <MusicNote size={64} className="text-[#B3B3B3]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-[#1DB954]" />
              <span className="text-xs text-[#1DB954] uppercase font-bold tracking-wider">Playlist Pública</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4" style={{ fontFamily: 'Outfit' }}>
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-sm text-[#B3B3B3] mb-2">{playlist.description}</p>
            )}
            <div className="flex items-center gap-2 text-sm text-white">
              <span className="font-bold">{playlist.user_name}</span>
              <span className="text-[#B3B3B3]">&bull;</span>
              <span className="text-[#B3B3B3]">{items.length} canciones, {getTotalDuration()}</span>
            </div>
          </div>
        </div>

        {/* Track List */}
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#B3B3B3]">Esta playlist está vacía</p>
          </div>
        ) : (
          <div className="bg-black/30 rounded-lg p-4">
            <div className="grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-[#B3B3B3] border-b border-[#282828]">
              <div>#</div>
              <div>Título</div>
              <div className="hidden sm:block">Álbum</div>
              <div className="flex justify-end"><Clock size={16} /></div>
            </div>

            <div className="mt-2">
              {items.map((item, idx) => {
                const isSpotify = item.type === 'spotify';
                return (
                  <div
                    key={`${item.mix_id || item.spotify_id}-${idx}`}
                    className="grid grid-cols-[16px_4fr_2fr_1fr] gap-4 px-4 py-3 rounded-md hover:bg-white/5 items-center"
                    data-testid={`shared-item-${idx}`}
                  >
                    <div className="text-[#B3B3B3] text-sm">{idx + 1}</div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                        {isSpotify ? (
                          item.album_image ? (
                            <img src={item.album_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><SpotifyLogo size={16} className="text-[#1DB954]" /></div>
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><MusicNote size={16} className="text-[#535353]" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-white truncate">{item.name}</p>
                          {isSpotify && <SpotifyLogo size={12} weight="fill" className="text-[#1DB954] flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-[#B3B3B3] truncate">{item.artist}</p>
                      </div>
                    </div>
                    <div className="text-sm text-[#B3B3B3] truncate hidden sm:block">{isSpotify ? item.album : (item.album_name || '-')}</div>
                    <div className="text-sm text-[#B3B3B3] text-right">
                      {isSpotify ? formatDuration(item.duration_ms, true) : formatDuration(item.duration)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12 pb-8">
          <p className="text-[#B3B3B3] mb-4">Inicia sesión para reproducir y crear tus propias playlists</p>
          <Link to="/register" className="inline-block px-8 py-3 rounded-full bg-[#1DB954] text-black font-bold text-lg hover:bg-[#1ed760] transition-colors">
            Registrarse gratis
          </Link>
        </div>
      </div>
    </div>
  );
}
