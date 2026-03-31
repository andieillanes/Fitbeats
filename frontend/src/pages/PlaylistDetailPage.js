import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import { usePlayer } from '../App';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  MusicNote, Play, Pause, Timer, ArrowLeft, 
  PencilSimple, Globe, Lock, Trash, Share, Download
} from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';

export default function PlaylistDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playMix, currentMix, isPlaying, togglePlay } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [mixes, setMixes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editData, setEditData] = useState({ name: '', description: '', is_public: false });
  const [removeMix, setRemoveMix] = useState(null);
  const [saving, setSaving] = useState(false);

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

      // Fetch mixes details
      if (playlistRes.data.mix_ids.length > 0) {
        const mixesRes = await axios.get(`${API}/mixes`);
        const playlistMixes = playlistRes.data.mix_ids
          .map(mixId => mixesRes.data.find(m => m.mix_id === mixId))
          .filter(Boolean);
        setMixes(playlistMixes);
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error('Error al cargar la playlist');
      navigate('/playlists');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalDuration = () => {
    const total = mixes.reduce((acc, mix) => acc + mix.duration, 0);
    const hours = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  const getBpmClass = (bpm) => {
    if (bpm < 100) return 'bpm-low';
    if (bpm < 140) return 'bpm-medium';
    return 'bpm-high';
  };

  const isOwner = playlist?.user_id === user?.user_id;

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/playlists/${id}`, editData);
      toast.success('Playlist actualizada');
      setShowEditDialog(false);
      fetchPlaylist();
    } catch (error) {
      toast.error('Error al actualizar la playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMix = async () => {
    if (!removeMix) return;
    
    try {
      await axios.delete(`${API}/playlists/${id}/mixes/${removeMix.mix_id}`);
      toast.success('Mix eliminado de la playlist');
      setRemoveMix(null);
      fetchPlaylist();
    } catch (error) {
      toast.error('Error al eliminar el mix');
    }
  };

  const handlePlayAll = () => {
    if (mixes.length > 0) {
      playMix(mixes[0], mixes);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007AFF]"></div>
        </div>
      </Layout>
    );
  }

  if (!playlist) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-[#A1A1AA]">Playlist no encontrada</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="playlist-detail-page">
        {/* Back button */}
        <button
          onClick={() => navigate('/playlists')}
          className="flex items-center gap-2 text-[#A1A1AA] hover:text-white transition-colors"
          data-testid="back-to-playlists-btn"
        >
          <ArrowLeft size={20} />
          Volver a playlists
        </button>

        {/* Header */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Cover */}
            <div className="w-48 h-48 rounded-md bg-gradient-to-br from-[#007AFF] to-[#005ECA] flex items-center justify-center flex-shrink-0">
              <MusicNote size={64} className="text-white" />
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {playlist.is_public ? (
                  <span className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] font-bold text-[#34C759]">
                    <Globe size={14} />
                    Pública
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs uppercase tracking-[0.2em] font-bold text-[#71717A]">
                    <Lock size={14} />
                    Privada
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {playlist.name}
              </h1>
              
              {playlist.description && (
                <p className="text-[#A1A1AA] mb-4">{playlist.description}</p>
              )}
              
              <p className="text-sm text-[#71717A] mb-4">
                Creada por <span className="text-white">{playlist.user_name}</span> • {mixes.length} mixes • {getTotalDuration()}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handlePlayAll}
                  disabled={mixes.length === 0}
                  className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
                  data-testid="play-all-btn"
                >
                  <Play size={20} weight="fill" className="mr-2" />
                  Reproducir todo
                </Button>

                {playlist.is_public && (
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
                    data-testid="share-playlist-btn"
                  >
                    <Share size={18} className="mr-2" />
                    Compartir
                  </Button>
                )}

                {isOwner && (
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(true)}
                    className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
                    data-testid="edit-playlist-btn"
                  >
                    <PencilSimple size={18} className="mr-2" />
                    Editar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mixes List */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-[48px_1fr_100px_100px_80px_80px] gap-4 px-4 py-3 border-b border-[#27272A] text-xs uppercase tracking-[0.2em] font-bold text-[#71717A]">
            <div></div>
            <div>Título / Artista</div>
            <div>Género</div>
            <div className="text-center">BPM</div>
            <div className="text-center">Duración</div>
            <div></div>
          </div>

          {/* Mix Rows */}
          {mixes.length === 0 ? (
            <div className="text-center py-12">
              <MusicNote size={48} className="mx-auto text-[#71717A] mb-4" />
              <p className="text-[#A1A1AA] mb-4">Esta playlist está vacía</p>
              {isOwner && (
                <Button
                  onClick={() => navigate('/catalog')}
                  className="bg-[#007AFF] hover:bg-[#3395FF]"
                >
                  Agregar mixes
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]">
              {mixes.map((mix, index) => (
                <div
                  key={mix.mix_id}
                  className={`mix-row grid grid-cols-1 md:grid-cols-[48px_1fr_100px_100px_80px_80px] gap-4 px-4 py-3 items-center ${
                    currentMix?.mix_id === mix.mix_id ? 'active' : ''
                  }`}
                  data-testid={`playlist-mix-${mix.mix_id}`}
                >
                  {/* Play button / Cover */}
                  <div 
                    className="w-12 h-12 rounded-md bg-[#1F1F1F] flex items-center justify-center flex-shrink-0 group relative overflow-hidden cursor-pointer"
                    onClick={() => {
                      if (currentMix?.mix_id === mix.mix_id) {
                        togglePlay();
                      } else {
                        playMix(mix, mixes);
                      }
                    }}
                  >
                    {mix.cover_path ? (
                      <img
                        src={`${API}/mixes/${mix.mix_id}/cover`}
                        alt={mix.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <MusicNote size={24} className="text-[#71717A]" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {currentMix?.mix_id === mix.mix_id && isPlaying ? (
                        <Pause size={20} weight="fill" className="text-white" />
                      ) : (
                        <Play size={20} weight="fill" className="text-white" />
                      )}
                    </div>
                  </div>

                  {/* Title / Artist */}
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{mix.name}</p>
                    <p className="text-sm text-[#A1A1AA] truncate">{mix.artist}</p>
                  </div>

                  {/* Genre */}
                  <div className="hidden md:block">
                    <span className="text-sm text-[#A1A1AA]">{mix.genre}</span>
                  </div>

                  {/* BPM */}
                  <div className="hidden md:flex justify-center">
                    <span className={`genre-tag ${getBpmClass(mix.bpm)}`}>
                      {mix.bpm}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="hidden md:flex justify-center items-center text-sm text-[#71717A]">
                    <Timer size={14} className="mr-1" />
                    {formatDuration(mix.duration)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRemoveMix(mix)}
                        className="text-[#71717A] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                        data-testid={`remove-mix-${mix.mix_id}`}
                      >
                        <Trash size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Editar playlist
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Nombre
                </label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="edit-playlist-name-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Descripción
                </label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white resize-none"
                  rows={3}
                  data-testid="edit-playlist-description-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Playlist pública</p>
                  <p className="text-sm text-[#71717A]">Otros instructores podrán verla</p>
                </div>
                <Switch
                  checked={editData.is_public}
                  onCheckedChange={(checked) => setEditData({ ...editData, is_public: checked })}
                  data-testid="edit-playlist-public-switch"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="save-edit-playlist-btn"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Mix Confirmation */}
        <AlertDialog open={!!removeMix} onOpenChange={() => setRemoveMix(null)}>
          <AlertDialogContent className="bg-[#141414] border-[#27272A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Eliminar de la playlist?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A1A1AA]">
                ¿Estás seguro de eliminar "{removeMix?.name}" de esta playlist?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMix}
                className="bg-[#FF3B30] hover:bg-[#FF6159]"
                data-testid="confirm-remove-mix-btn"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
