import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer, useSpotify, API } from '../../App';
import axios from 'axios';
import { MagnifyingGlass, MusicNote, Disc, Play, SpotifyLogo, Plus } from '@phosphor-icons/react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function SearchView() {
  const { playMix } = usePlayer();
  const spotify = useSpotify();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all'); // all | local | spotify
  const [albums, setAlbums] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [spotifyTracks, setSpotifyTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/playlists/mine`).then(r => setPlaylists(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setAlbums([]);
      setMixes([]);
      setSpotifyTracks([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const promises = [];
        if (tab !== 'spotify') {
          promises.push(
            axios.get(`${API}/albums`),
            axios.get(`${API}/mixes?search=${encodeURIComponent(query)}`)
          );
        }
        if (tab !== 'local') {
          promises.push(
            axios.get(`${API}/spotify/search?q=${encodeURIComponent(query)}&limit=20`)
          );
        }

        const results = await Promise.all(promises);
        let idx = 0;
        if (tab !== 'spotify') {
          const q = query.toLowerCase();
          setAlbums(results[idx].data.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.artist.toLowerCase().includes(q)
          ));
          idx++;
          setMixes(results[idx].data);
          idx++;
        } else {
          setAlbums([]);
          setMixes([]);
        }
        if (tab !== 'local') {
          setSpotifyTracks(results[idx]?.data?.tracks || []);
        } else {
          setSpotifyTracks([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, tab]);

  const formatDuration = (ms) => {
    if (!ms) return '--:--';
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const playSpotifyTrack = (track) => {
    const trackItem = {
      ...track,
      type: 'spotify',
      name: track.name,
      artist: track.artist,
    };
    playMix(trackItem, spotifyTracks.map(t => ({ ...t, type: 'spotify' })));
  };

  const addToPlaylist = async (playlistId, track) => {
    try {
      await axios.post(`${API}/playlists/${playlistId}/items`, {
        type: 'spotify',
        spotify_id: track.spotify_id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        album_image: track.album_image,
        duration_ms: track.duration_ms,
        uri: track.uri,
        preview_url: track.preview_url,
      });
      toast.success('Agregado a la playlist');
    } catch (err) {
      toast.error('Error al agregar');
    }
  };

  const addMixToPlaylist = async (playlistId, mix) => {
    try {
      await axios.post(`${API}/playlists/${playlistId}/items`, {
        type: 'mix',
        mix_id: mix.mix_id,
      });
      toast.success('Agregado a la playlist');
    } catch (err) {
      toast.error('Error al agregar');
    }
  };

  const hasResults = albums.length > 0 || mixes.length > 0 || spotifyTracks.length > 0;

  return (
    <div data-testid="search-view">
      <div className="mb-6">
        <div className="relative max-w-lg">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={24} />
          <Input
            autoFocus
            placeholder="Buscar mixes, canciones o artistas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 bg-[#242424] border-0 rounded-full text-lg"
            data-testid="search-main-input"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'all', label: 'Todo' },
          { key: 'local', label: 'Mixes' },
          { key: 'spotify', label: 'Spotify' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-black'
                : 'bg-[#232323] text-white hover:bg-[#2a2a2a]'
            }`}
            data-testid={`search-tab-${t.key}`}
          >
            {t.key === 'spotify' && <SpotifyLogo size={14} weight="fill" className="inline mr-1 text-[#1DB954]" />}
            {t.label}
          </button>
        ))}
      </div>

      {!query.trim() ? (
        <div className="text-center py-16">
          <MagnifyingGlass size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">Busca mixes del catálogo o canciones en Spotify</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      ) : !hasResults ? (
        <div className="text-center py-16">
          <p className="text-[#B3B3B3]">No se encontraron resultados para "{query}"</p>
        </div>
      ) : (
        <>
          {/* Local Albums */}
          {albums.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit' }}>Álbumes</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {albums.slice(0, 5).map((album) => (
                  <Link key={album.album_id} to={`/albums/${album.album_id}`} className="album-card group">
                    <div className="album-cover-container">
                      {album.cover_path ? (
                        <img src={`${API}/albums/${album.album_id}/cover`} alt={album.name} />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#282828]">
                          <Disc size={48} className="text-[#535353]" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-white truncate mb-1">{album.name}</h3>
                    <p className="text-sm text-[#B3B3B3] truncate">{album.artist}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Local Mixes */}
          {mixes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit' }}>Mixes</h2>
              <div className="space-y-1">
                {mixes.slice(0, 10).map((mix) => (
                  <div
                    key={mix.mix_id}
                    className="flex items-center gap-4 p-3 rounded-md hover:bg-white/10 cursor-pointer group"
                    onClick={() => playMix(mix, mixes)}
                    data-testid={`search-mix-${mix.mix_id}`}
                  >
                    <div className="w-12 h-12 rounded bg-[#282828] overflow-hidden flex-shrink-0 relative">
                      {mix.cover_path ? (
                        <img src={`${API}/mixes/${mix.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MusicNote size={20} className="text-[#535353]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={20} weight="fill" className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{mix.name}</p>
                      <p className="text-sm text-[#B3B3B3] truncate">{mix.artist}</p>
                    </div>
                    <div className="text-sm text-[#B3B3B3]">{mix.album_name}</div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-[#B3B3B3] hover:text-white opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                          <Plus size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#282828] border-0">
                        {playlists.map(p => (
                          <DropdownMenuItem key={p.playlist_id} onClick={() => addMixToPlaylist(p.playlist_id, mix)} className="text-white hover:bg-[#3E3E3E] cursor-pointer">
                            {p.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spotify Tracks */}
          {spotifyTracks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit' }}>
                <SpotifyLogo size={28} weight="fill" className="text-[#1DB954]" />
                Spotify
              </h2>
              <div className="space-y-1">
                {spotifyTracks.map((track) => (
                  <div
                    key={track.spotify_id}
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-white/10 cursor-pointer group"
                    onClick={() => playSpotifyTrack(track)}
                    data-testid={`search-spotify-${track.spotify_id}`}
                  >
                    <div className="w-12 h-12 rounded bg-[#282828] overflow-hidden flex-shrink-0 relative">
                      {track.album_image ? (
                        <img src={track.album_image_small || track.album_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <SpotifyLogo size={20} className="text-[#1DB954]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={20} weight="fill" className="text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{track.name}</p>
                      <p className="text-sm text-[#B3B3B3] truncate">{track.artist}</p>
                    </div>
                    <div className="hidden sm:block text-sm text-[#B3B3B3] truncate max-w-[150px]">{track.album}</div>
                    <div className="text-sm text-[#B3B3B3] flex-shrink-0">{formatDuration(track.duration_ms)}</div>
                    <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-[#B3B3B3] hover:text-white" onClick={e => e.stopPropagation()}>
                            <Plus size={16} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#282828] border-0">
                          {playlists.length === 0 ? (
                            <DropdownMenuItem className="text-[#B3B3B3]">Sin playlists</DropdownMenuItem>
                          ) : (
                            playlists.map(p => (
                              <DropdownMenuItem key={p.playlist_id} onClick={() => addToPlaylist(p.playlist_id, track)} className="text-white hover:bg-[#3E3E3E] cursor-pointer">
                                {p.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {track.external_url && (
                        <a href={track.external_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[#1DB954] hover:text-[#1ed760]">
                          <SpotifyLogo size={16} weight="fill" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
