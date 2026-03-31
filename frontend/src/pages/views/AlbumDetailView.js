import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlayer, API } from '../../App';
import axios from 'axios';
import { Play, Pause, Clock, ArrowLeft, Disc, MusicNote, Plus, Download } from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

export default function AlbumDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playMix, currentMix, isPlaying, togglePlay } = usePlayer();
  const [album, setAlbum] = useState(null);
  const [mixes, setMixes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        const res = await axios.get(`${API}/albums/${id}`);
        setAlbum(res.data);
        setMixes(res.data.mixes || []);
      } catch (err) {
        console.error(err);
        navigate('/albums');
      } finally {
        setLoading(false);
      }
    };
    fetchAlbum();
  }, [id, navigate]);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const total = mixes.reduce((acc, m) => acc + (m.duration || 0), 0);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    if (hours > 0) return `${hours} hr ${mins} min`;
    return `${mins} min`;
  };

  const playAll = () => {
    if (mixes.length > 0) {
      playMix(mixes[0], mixes);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  if (!album) return null;

  return (
    <div data-testid="album-detail-view">
      {/* Header */}
      <div className="flex items-end gap-6 mb-6">
        <div className="w-56 h-56 rounded shadow-2xl overflow-hidden flex-shrink-0 bg-[#282828]">
          {album.cover_path ? (
            <img src={`${API}/albums/${album.album_id}/cover`} alt={album.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc size={80} className="text-[#535353]" />
            </div>
          )}
        </div>
        <div>
          <span className="text-xs uppercase font-bold text-white">Álbum</span>
          <h1 className="text-5xl font-black text-white mt-2 mb-4" style={{ fontFamily: 'Outfit' }}>
            {album.name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="font-bold">{album.artist}</span>
            <span className="text-[#B3B3B3]">•</span>
            <span className="text-[#B3B3B3]">{album.year}</span>
            <span className="text-[#B3B3B3]">•</span>
            <span className="text-[#B3B3B3]">{mixes.length} canciones, {getTotalDuration()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6 mb-8">
        <button
          onClick={playAll}
          className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform"
          data-testid="play-all-btn"
        >
          <Play size={28} weight="fill" className="text-black ml-1" />
        </button>
      </div>

      {/* Track List */}
      {mixes.length === 0 ? (
        <div className="text-center py-16">
          <MusicNote size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">Este álbum no tiene tracks aún</p>
        </div>
      ) : (
        <div>
          {/* Header Row */}
          <div className="grid grid-cols-[16px_4fr_3fr_1fr_40px] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-[#B3B3B3] border-b border-[#282828]">
            <div>#</div>
            <div>Título</div>
            <div>Género</div>
            <div className="flex justify-end"><Clock size={16} /></div>
            <div></div>
          </div>

          {/* Track Rows */}
          <div className="mt-2">
            {mixes.map((mix, idx) => {
              const isCurrentTrack = currentMix?.mix_id === mix.mix_id;
              return (
                <div
                  key={mix.mix_id}
                  className="grid grid-cols-[16px_4fr_3fr_1fr_40px] gap-4 px-4 py-2 rounded-md group hover:bg-white/10 items-center"
                  onDoubleClick={() => playMix(mix, mixes)}
                  data-testid={`track-row-${mix.mix_id}`}
                >
                  <div className="text-[#B3B3B3] group-hover:hidden">
                    {isCurrentTrack && isPlaying ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <span className="text-[#1DB954] text-xs">▶</span>
                      </div>
                    ) : (
                      <span className={isCurrentTrack ? 'text-[#1DB954]' : ''}>{idx + 1}</span>
                    )}
                  </div>
                  <div className="hidden group-hover:block">
                    <button onClick={() => isCurrentTrack ? togglePlay() : playMix(mix, mixes)}>
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

                  <div className="text-sm text-[#B3B3B3]">
                    {mix.genre || '-'}
                    {mix.bpm && <span className="ml-2 text-xs text-[#6A6A6A]">{mix.bpm} BPM</span>}
                  </div>

                  <div className="text-sm text-[#B3B3B3] text-right">
                    {formatDuration(mix.duration)}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
