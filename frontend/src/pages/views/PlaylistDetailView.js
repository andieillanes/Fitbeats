import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, usePlayer, API } from '../../App';
import axios from 'axios';
import { Play, Pause, Clock, MusicNote, PencilSimple, Trash, Globe, Lock, Share, SpotifyLogo, Download } from '@phosphor-icons/react';
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', is_public: false });
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const fetchPlaylist = async () => {
    try {
      const [playlistRes, itemsRes] = await Promise.all([
        axios.get(`${API}/playlists/${id}`),
        axios.get(`${API}/playlists/${id}/items`)
      ]);
      setPlaylist(playlistRes.data);
      setItems(itemsRes.data.items || []);
      setEditData({
        name: playlistRes.data.name,
        description: playlistRes.data.description || '',
        is_public: playlistRes.data.is_public
      });
    } catch (err) {
      console.error(err);
      navigate('/playlists');
    } finally {
      setLoading(false);
    }
  };

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
    const mins = Math.floor(total / 60);
    return `${mins} min`;
  };

  const isOwner = playlist?.user_id === user?.user_id;

  const getTrackId = (item) => item.mix_id || item.spotify_id;
  const isCurrentTrack = (item) => {
    if (!currentMix) return false;
    return getTrackId(item) === (currentMix.mix_id || currentMix.spotify_id);
  };

  const playAll = () => {
    if (items.length > 0) {
      const playableItems = items.map(item => {
        if (item.type === 'spotify') {
          return { ...item, type: 'spotify' };
        }
        return { ...item, type: 'mix' };
      });
      playMix(playableItems[0], playableItems);
    }
  };

  const playItem = (item, idx) => {
    const playableItems = items.map(i => {
      if (i.type === 'spotify') return { ...i, type: 'spotify' };
      return { ...i, type: 'mix' };
    });
    playMix(playableItems[idx], playableItems);
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

  const handleRemoveItem = async () => {
    if (deleteItem === null) return;
    try {
      await axios.delete(`${API}/playlists/${id}/items/${deleteItem.index}`);
      toast.success('Track eliminado');
      setDeleteItem(null);
      fetchPlaylist();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/shared/${id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Enlace de playlist copiado');
  };

  const handleDownloadAll = async () => {
    const mixCount = items.filter(i => i.type === 'mix').length;
    if (mixCount === 0) {
      toast.info('No hay mixes locales para descargar');
      return;
    }
    try {
      toast.info(`Descargando ${mixCount} mixes...`);
      const response = await axios.get(`${API}/playlists/${id}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${playlist.name}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Descarga completada');
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
            <span className="text-[#B3B3B3]">&bull;</span>
            <span className="text-[#B3B3B3]">{items.length} canciones, {getTotalDuration()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={playAll}
          disabled={items.length === 0}
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
          <button onClick={handleShare} className="text-[#B3B3B3] hover:text-white" data-testid="share-btn">
            <Share size={24} />
          </button>
        )}
        
        <button onClick={handleDownloadAll} className="text-[#B3B3B3] hover:text-white" data-testid="download-playlist-btn" title="Descargar mixes locales">
          <Download size={24} />
        </button>
      </div>

      {/* Track List */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <MusicNote size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3]">Esta playlist está vacía</p>
          <Button onClick={() => navigate('/search')} className="mt-4 bg-white/10 hover:bg-white/20 text-white">
            Buscar canciones
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
            {items.map((item, idx) => {
              const isCurrent = isCurrentTrack(item);
              const isSpotify = item.type === 'spotify';
              return (
                <div
                  key={`${getTrackId(item)}-${idx}`}
                  className="grid grid-cols-[16px_4fr_2fr_1fr_40px] gap-4 px-4 py-2 rounded-md group hover:bg-white/10 items-center"
                  onDoubleClick={() => playItem(item, idx)}
                  data-testid={`playlist-item-${idx}`}
                >
                  <div className="text-[#B3B3B3] group-hover:hidden">
                    {isCurrent && isPlaying ? (
                      <span className="text-[#1DB954] text-xs">&#9654;</span>
                    ) : (
                      <span className={isCurrent ? 'text-[#1DB954]' : ''}>{idx + 1}</span>
                    )}
                  </div>
                  <div className="hidden group-hover:block">
                    <button onClick={() => isCurrent ? togglePlay() : playItem(item, idx)}>
                      {isCurrent && isPlaying ? <Pause size={16} weight="fill" className="text-white" /> : <Play size={16} weight="fill" className="text-white" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                      {isSpotify ? (
                        item.album_image ? (
                          <img src={item.album_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><SpotifyLogo size={16} className="text-[#1DB954]" /></div>
                        )
                      ) : (
                        item.cover_path ? (
                          <img src={`${API}/mixes/${item.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><MusicNote size={16} className="text-[#535353]" /></div>
                        )
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`font-medium truncate ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>{item.name}</p>
                        {isSpotify && <SpotifyLogo size={12} weight="fill" className="text-[#1DB954] flex-shrink-0" />}
                      </div>
                      <p className="text-sm text-[#B3B3B3] truncate">{item.artist}</p>
                    </div>
                  </div>

                  <div className="text-sm text-[#B3B3B3] truncate">{isSpotify ? item.album : (item.album_name || '-')}</div>
                  <div className="text-sm text-[#B3B3B3] text-right">
                    {isSpotify ? formatDuration(item.duration_ms, true) : formatDuration(item.duration)}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {isOwner && (
                      <button onClick={() => setDeleteItem({ index: idx, name: item.name })} className="text-[#B3B3B3] hover:text-[#ff6b6b]">
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

      {/* Delete Item Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent className="bg-[#282828] border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Eliminar de la playlist?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B3B3B3]">
              Eliminar "{deleteItem?.name}" de esta playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-0 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveItem} className="bg-[#ff6b6b] hover:bg-[#ff5252] text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
