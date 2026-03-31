import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer, API } from '../../App';
import axios from 'axios';
import { MagnifyingGlass, MusicNote, Disc, Play } from '@phosphor-icons/react';
import { Input } from '../../components/ui/input';

export default function SearchView() {
  const { playMix } = usePlayer();
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setAlbums([]);
      setMixes([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const [albumsRes, mixesRes] = await Promise.all([
          axios.get(`${API}/albums`),
          axios.get(`${API}/mixes?search=${encodeURIComponent(query)}`)
        ]);
        
        const q = query.toLowerCase();
        setAlbums(albumsRes.data.filter(a => 
          a.name.toLowerCase().includes(q) || 
          a.artist.toLowerCase().includes(q)
        ));
        setMixes(mixesRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div data-testid="search-view">
      <div className="mb-8">
        <div className="relative max-w-lg">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={24} />
          <Input
            autoFocus
            placeholder="¿Qué quieres escuchar?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 bg-[#242424] border-0 rounded-full text-lg"
            data-testid="search-main-input"
          />
        </div>
      </div>

      {!query.trim() ? (
        <div className="text-center py-16">
          <MagnifyingGlass size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">Busca álbumes, canciones o artistas</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
        </div>
      ) : (
        <>
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

          {mixes.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit' }}>Canciones</h2>
              <div className="space-y-1">
                {mixes.slice(0, 10).map((mix) => (
                  <div
                    key={mix.mix_id}
                    className="flex items-center gap-4 p-3 rounded-md hover:bg-white/10 cursor-pointer group"
                    onClick={() => playMix(mix, mixes)}
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
                  </div>
                ))}
              </div>
            </div>
          )}

          {albums.length === 0 && mixes.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[#B3B3B3]">No se encontraron resultados para "{query}"</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
