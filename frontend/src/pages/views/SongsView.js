import React, { useEffect, useState } from 'react';
import { usePlayer, API } from '../../App';
import axios from 'axios';
import { Play, Pause, Clock, MusicNote, Download, Plus, MagnifyingGlass } from '@phosphor-icons/react';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

export default function SongsView() {
  const { playMix, currentMix, isPlaying, togglePlay } = usePlayer();
  const [mixes, setMixes] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredMixes, setFilteredMixes] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mixesRes, playlistsRes] = await Promise.all([
          axios.get(`${API}/mixes`),
          axios.get(`${API}/playlists/mine`)
        ]);
        setMixes(mixesRes.data);
        setFilteredMixes(mixesRes.data);
        setPlaylists(playlistsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (search) {
      const lower = search.toLowerCase();
      setFilteredMixes(mixes.filter(m => 
        m.name.toLowerCase().includes(lower) || 
        m.artist.toLowerCase().includes(lower) ||
        (m.genre && m.genre.toLowerCase().includes(lower))
      ));
    } else {
      setFilteredMixes(mixes);
    }
  }, [search, mixes]);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (mix) => {
    try {
      const response = await axios.get(`${API}/mixes/${mix.mix_id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${mix.name}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Descarga iniciada');
    } catch (err) {
      toast.error('Error al descargar');
    }
  };

  const addToPlaylist = async (playlistId, mix) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  return (
    <div data-testid="songs-view">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
          Todas las Canciones
        </h1>
        <div className="relative w-64">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={16} />
          <Input
            placeholder="Filtrar canciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#242424] border-0 rounded-full text-sm h-10"
            data-testid="songs-filter-input"
          />
        </div>
      </div>

      {filteredMixes.length === 0 ? (
        <div className="text-center py-16">
          <MusicNote size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">No hay canciones disponibles</p>
        </div>
      ) : (
        <div>
          {/* Header Row */}
          <div className="grid grid-cols-[16px_4fr_2fr_2fr_1fr_80px] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-[#B3B3B3] border-b border-[#282828]">
            <div>#</div>
            <div>Título</div>
            <div>Álbum</div>
            <div>Género / BPM</div>
            <div className="flex justify-end"><Clock size={16} /></div>
            <div></div>
          </div>

          {/* Track Rows */}
          <div className="mt-2">
            {filteredMixes.map((mix, idx) => {
              const isCurrentTrack = currentMix?.mix_id === mix.mix_id;
              return (
                <div
                  key={mix.mix_id}
                  className="grid grid-cols-[16px_4fr_2fr_2fr_1fr_80px] gap-4 px-4 py-2 rounded-md group hover:bg-white/10 items-center"
                  onDoubleClick={() => playMix(mix, filteredMixes)}
                  data-testid={`song-row-${mix.mix_id}`}
                >
                  <div className="text-[#B3B3B3] group-hover:hidden">
                    {isCurrentTrack && isPlaying ? (
                      <span className="text-[#1DB954] text-xs">▶</span>
                    ) : (
                      <span className={isCurrentTrack ? 'text-[#1DB954]' : ''}>{idx + 1}</span>
                    )}
                  </div>
                  <div className="hidden group-hover:block">
                    <button onClick={() => isCurrentTrack ? togglePlay() : playMix(mix, filteredMixes)}>
                      {isCurrentTrack && isPlaying ? (
                        <Pause size={16} weight="fill" className="text-white" />
                      ) : (
                        <Play size={16} weight="fill" className="text-white" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                      {mix.cover_path ? (
                        <img src={`${API}/mixes/${mix.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MusicNote size={16} className="text-[#535353]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}>
                        {mix.name}
                      </p>
                      <p className="text-sm text-[#B3B3B3] truncate">{mix.artist}</p>
                    </div>
                  </div>

                  <div className="text-sm text-[#B3B3B3] truncate">
                    {mix.album_name || '-'}
                  </div>

                  <div className="text-sm text-[#B3B3B3]">
                    {mix.genre || '-'}
                    {mix.bpm && <span className="ml-2 text-xs text-[#6A6A6A]">{mix.bpm} BPM</span>}
                  </div>

                  <div className="text-sm text-[#B3B3B3] text-right">
                    {formatDuration(mix.duration)}
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-[#B3B3B3] hover:text-white">
                          <Plus size={16} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#282828] border-0">
                        {playlists.length === 0 ? (
                          <DropdownMenuItem className="text-[#B3B3B3]">Sin playlists</DropdownMenuItem>
                        ) : (
                          playlists.map((p) => (
                            <DropdownMenuItem 
                              key={p.playlist_id}
                              onClick={() => addToPlaylist(p.playlist_id, mix)}
                              className="text-white hover:bg-[#3E3E3E] cursor-pointer"
                            >
                              {p.name}
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button onClick={() => handleDownload(mix)} className="text-[#B3B3B3] hover:text-white">
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
