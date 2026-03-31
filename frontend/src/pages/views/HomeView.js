import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayer, useSpotify, API } from '../../App';
import axios from 'axios';
import { 
  Disc, Play, SpotifyLogo, ArrowRight, DownloadSimple, 
  MusicNote, Check
} from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function HomeView() {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playMix } = usePlayer();
  const spotify = useSpotify();
  const navigate = useNavigate();
  
  // Spotify playlists
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [importing, setImporting] = useState({});
  const [imported, setImported] = useState({});

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const res = await axios.get(`${API}/albums`);
        setAlbums(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAlbums();
  }, []);

  // Fetch Spotify playlists if connected
  useEffect(() => {
    if (!spotify?.spotifyConnected) return;
    const fetchSpotifyPlaylists = async () => {
      setLoadingSpotify(true);
      try {
        const [spotifyRes, myRes] = await Promise.all([
          axios.get(`${API}/spotify/playlists`),
          axios.get(`${API}/playlists/mine`)
        ]);
        setSpotifyPlaylists(spotifyRes.data.playlists || []);
        // Mark already-imported playlists
        const alreadyImported = {};
        (myRes.data || []).forEach(p => {
          if (p.spotify_source) alreadyImported[p.spotify_source] = p.playlist_id;
        });
        setImported(alreadyImported);
      } catch (err) {
        console.error('Failed to fetch Spotify playlists:', err);
      }
      setLoadingSpotify(false);
    };
    fetchSpotifyPlaylists();
  }, [spotify?.spotifyConnected]);

  const playAlbum = async (album, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.get(`${API}/albums/${album.album_id}`);
      if (res.data.mixes?.length) playMix(res.data.mixes[0], res.data.mixes);
    } catch (err) { console.error(err); }
  };

  const importPlaylist = async (spPlaylist) => {
    // If already imported, navigate to it
    if (imported[spPlaylist.spotify_playlist_id]) {
      navigate(`/playlists/${imported[spPlaylist.spotify_playlist_id]}`);
      return;
    }
    setImporting(prev => ({ ...prev, [spPlaylist.spotify_playlist_id]: true }));
    try {
      const res = await axios.post(`${API}/spotify/playlists/${spPlaylist.spotify_playlist_id}/import`);
      const plId = res.data.playlist_id;
      setImported(prev => ({ ...prev, [spPlaylist.spotify_playlist_id]: plId }));
      toast.success(`"${spPlaylist.name}" importada`);
    } catch (err) {
      toast.error('Error al importar: ' + (err.response?.data?.detail || 'intenta de nuevo'));
    }
    setImporting(prev => ({ ...prev, [spPlaylist.spotify_playlist_id]: false }));
  };

  return (
    <div data-testid="home-view">
      {/* Spotify Playlists Import Section */}
      {spotify?.spotifyConnected && (
        <section className="mb-10" data-testid="spotify-import-section">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <SpotifyLogo size={28} weight="fill" className="text-[#1DB954]" />
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
                Tus Playlists de Spotify
              </h2>
            </div>
            <span className="text-xs text-[#B3B3B3]">{spotifyPlaylists.length} playlists</span>
          </div>
          
          {loadingSpotify ? (
            <div className="flex items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-[#1DB954]"></div>
              <span className="text-sm text-[#B3B3B3]">Cargando playlists de Spotify...</span>
            </div>
          ) : spotifyPlaylists.length === 0 ? (
            <p className="text-sm text-[#6A6A6A] py-4">No se encontraron playlists en tu cuenta de Spotify.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {spotifyPlaylists.map(pl => (
                <div
                  key={pl.spotify_playlist_id}
                  className="bg-[#181818] rounded-lg p-3 hover:bg-[#282828] transition-colors group"
                  data-testid={`spotify-playlist-${pl.spotify_playlist_id}`}
                >
                  <div className="aspect-square rounded-md overflow-hidden bg-[#282828] mb-3 relative">
                    {pl.image ? (
                      <img src={pl.image} alt={pl.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MusicNote size={40} className="text-[#535353]" />
                      </div>
                    )}
                    {/* Import button overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      {imported[pl.spotify_playlist_id] ? (
                        <button
                          onClick={() => navigate(`/playlists/${imported[pl.spotify_playlist_id]}`)}
                          className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center"
                        >
                          <Check size={20} weight="bold" className="text-black" />
                        </button>
                      ) : (
                        <button
                          onClick={() => importPlaylist(pl)}
                          disabled={importing[pl.spotify_playlist_id]}
                          className="w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                          data-testid={`import-spotify-${pl.spotify_playlist_id}`}
                        >
                          {importing[pl.spotify_playlist_id] ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
                          ) : (
                            <DownloadSimple size={20} weight="bold" className="text-black" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                  <p className="text-xs text-[#B3B3B3] truncate">{pl.track_count} canciones &bull; {pl.owner}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Albums Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
            Novedades
          </h2>
          <Link to="/albums" className="text-sm text-[#B3B3B3] hover:text-white flex items-center gap-1">
            Ver todos <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        ) : albums.length === 0 ? (
          <div className="text-center py-16">
            <Disc size={64} className="mx-auto text-[#535353] mb-4" />
            <p className="text-[#B3B3B3]">No hay álbumes disponibles</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {albums.map(album => (
              <Link
                key={album.album_id}
                to={`/albums/${album.album_id}`}
                className="bg-[#181818] rounded-lg p-4 hover:bg-[#282828] transition-colors group"
                data-testid={`album-card-${album.album_id}`}
              >
                <div className="aspect-square rounded-md overflow-hidden bg-[#282828] mb-3 relative">
                  {album.cover_url ? (
                    <img src={`${API}/albums/${album.album_id}/cover`} alt={album.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Disc size={48} className="text-[#535353]" />
                    </div>
                  )}
                  <button
                    onClick={(e) => playAlbum(album, e)}
                    className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
                  >
                    <Play size={20} weight="fill" className="text-black ml-0.5" />
                  </button>
                </div>
                <p className="text-sm font-medium text-white truncate">{album.name}</p>
                <p className="text-xs text-[#B3B3B3] truncate">{album.artist}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Spotify Connect CTA if not connected */}
      {!spotify?.spotifyConnected && (
        <section className="mt-10 bg-gradient-to-r from-[#1DB954]/10 to-transparent rounded-xl p-6" data-testid="spotify-connect-cta">
          <div className="flex items-center gap-4">
            <SpotifyLogo size={40} weight="fill" className="text-[#1DB954] flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-white font-bold">Conecta tu Spotify</h3>
              <p className="text-sm text-[#B3B3B3] mt-1">Importa tus playlists y reproduce canciones de Spotify directamente en FitBeats</p>
            </div>
            <Button onClick={() => navigate('/profile')} className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold flex-shrink-0" data-testid="connect-spotify-cta-btn">
              Conectar
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
