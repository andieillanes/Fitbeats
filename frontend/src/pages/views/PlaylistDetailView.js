import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, usePlayer, API } from '../../App';
import axios from 'axios';
import { Play, Pause, Clock, MusicNote, PencilSimple, Trash, Globe, Lock, Share } from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';

export default function PlaylistDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playMix, currentMix, isPlaying, togglePlay } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [mixes, setMixes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', is_public: false });
  const [deleteTrack, setDeleteTrack] = useState(null);

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      const playlistRes = await axios.get(`${API}/playlists/${id}`);
      setPlaylist(playlistRes.data);
      setEditData({
        name: playlistRes.data.name,
        description: playlistRes.data.description || '',
        is_public: playlistRes.data.is_public
      });

      if (playlistRes.data.mix_ids.length > 0) {
        const mixesRes = await axios.get(`${API}/mixes`);
        const playlistMixes = playlistRes.data.mix_ids
          .map(mixId => mixesRes.data.find(m => m.mix_id === mixId))
          .filter(Boolean);
        setMixes(playlistMixes);
      } else {
        setMixes([]);
      }
    } catch (err) {
      console.error(err);
      navigate('/playlists');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const total = mixes.reduce((acc, m) => acc + (m.duration || 0), 0);
    const mins = Math.floor(total / 60);
    return `${mins} min`;
  };

  const isOwner = playlist?.user_id === user?.user_id;

  const playAll = () => {
    if (mixes.length > 0) {
      playMix(mixes[0], mixes);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API}/playlists/${id}`, editData);
      toast.success('Playlist actualizada');
      setShowEdit(false);
      fetchPlaylist();
    } catch (err) {
      toast.error('Error al guardar');
    }
  };

  const handleRemoveTrack = async () => {
    if (!deleteTrack) return;
    try {
      await axios.delete(`${API}/playlists/${id}/mixes/${deleteTrack.mix_id}`);
      toast.success('Track eliminado');
      setDeleteTrack(null);
      fetchPlaylist();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Enlace copiado');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  if (!playlist) return null;

  return (
    <div data-testid="playlist-detail-view">
      {/* Header */}
      <div className="flex items-end gap-6 mb-6">
        <div className="w-56 h-56 rounded shadow-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#535353] to-[#282828] flex items-center justify-center">
          <MusicNote size={80} className="text-[#B3B3B3]" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            {playlist.is_public ? (
              <span className="flex items-center gap-1 text-xs text-[#1DB954]"><Globe size={12} /> Pública</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-[#B3B3B3]"><Lock size={12} /> Privada</span>
            )}
          </div>
          <h1 className="text-5xl font-black text-white mt-2 mb-4" style={{ fontFamily: 'Outfit' }}>
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-sm text-[#B3B3B3] mb-2">{playlist.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="font-bold">{playlist.user_name}</span>
            <span className="text-[#B3B3B3]">•</span>
            <span className="text-[#B3B3B3]">{mixes.length} canciones, {getTotalDuration()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={playAll}
          disabled={mixes.length === 0}
          className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
          data-testid="play-all-btn"
        >
          <Play size={28} weight="fill" className="text-black ml-1" />
        </button>
        
        {isOwner && (
          <button onClick={() => setShowEdit(true)} className="text-[#B3B3B3] hover:text-white">
            <PencilSimple size={24} />
          </button>
        )}
        
        {playlist.is_public && (
          <button onClick={handleShare} className="text-[#B3B3B3] hover:text-white">
            <Share size={24} />
          </button>
        )}
      </div>

      {/* Track List */}
      {mixes.length === 0 ? (
        <div className="text-center py-16">
          <MusicNote size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">Esta playlist está vacía</p>
          <Button onClick={() => navigate('/songs')} className="mt-4 bg-white/10 hover:bg-white/20 text-white">
            Agregar canciones
          </Button>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-[16px_4fr_2fr_1fr_40px] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-[#B3B3B3] border-b border-[#282828]">
            <div>#</div>
            <div>Título</div>
            <div>Álbum</div>
            <div className="flex justify-end"><Clock size={16} /></div>
            <div></div>
          </div>

          <div className="mt-2">
            {mixes.map((mix, idx) => {
              const isCurrentTrack = currentMix?.mix_id === mix.mix_id;
              return (
                <div
                  key={mix.mix_id}
                  className="grid grid-cols-[16px_4fr_2fr_1fr_40px] gap-4 px-4 py-2 rounded-md group hover:bg-white/10 items-center"
                  onDoubleClick={() => playMix(mix, mixes)}
                >
                  <div className="text-[#B3B3B3] group-hover:hidden">
                    {isCurrentTrack && isPlaying ? (
                      <span className="text-[#1DB954] text-xs">▶</span>
                    ) : (
                      <span className={isCurrentTrack ? 'text-[#1DB954]' : ''}>{idx + 1}</span>
                    )}
                  </div>
                  <div className="hidden group-hover:block">
                    <button onClick={() => isCurrentTrack ? togglePlay() : playMix(mix, mixes)}>
                      {isCurrentTrack && isPlaying ? <Pause size={16} weight="fill" className="text-white" /> : <Play size={16} weight="fill" className="text-white" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                      {mix.cover_path ? (
                        <img src={`${API}/mixes/${mix.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><MusicNote size={16} className="text-[#535353]" /></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-medium truncate ${isCurrentTrack ? 'text-[#1DB954]' : 'text-white'}`}>{mix.name}</p>
                      <p className="text-sm text-[#B3B3B3] truncate">{mix.artist}</p>
                    </div>
                  </div>

                  <div className="text-sm text-[#B3B3B3] truncate">{mix.album_name || '-'}</div>
                  <div className="text-sm text-[#B3B3B3] text-right">{formatDuration(mix.duration)}</div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {isOwner && (
                      <button onClick={() => setDeleteTrack(mix)} className="text-[#B3B3B3] hover:text-[#ff6b6b]">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-[#282828] border-0 text-white">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Editar playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Nombre" className="bg-[#3E3E3E] border-0" />
            <Input value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Descripción" className="bg-[#3E3E3E] border-0" />
            <div className="flex items-center justify-between">
              <span className="text-sm">Pública</span>
              <Switch checked={editData.is_public} onCheckedChange={(v) => setEditData({ ...editData, is_public: v })} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setShowEdit(false)} className="text-white">Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-[#1DB954] hover:bg-[#1ed760] text-black">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Track Confirmation */}
      <AlertDialog open={!!deleteTrack} onOpenChange={() => setDeleteTrack(null)}>
        <AlertDialogContent className="bg-[#282828] border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar de la playlist?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B3B3B3]">
              ¿Eliminar "{deleteTrack?.name}" de esta playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-0 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveTrack} className="bg-[#ff6b6b] hover:bg-[#ff5252] text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
