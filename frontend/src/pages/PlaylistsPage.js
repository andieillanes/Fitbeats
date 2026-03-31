import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';
import Layout from '../components/Layout';
import { MusicNote, Plus, Globe, Lock, Trash } from '@phosphor-icons/react';
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

export default function PlaylistsPage() {
  const { user } = useAuth();
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletePlaylist, setDeletePlaylist] = useState(null);
  const [newPlaylist, setNewPlaylist] = useState({
    name: '',
    description: '',
    is_public: false
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const [mineRes, publicRes] = await Promise.all([
        axios.get(`${API}/playlists/mine`),
        axios.get(`${API}/playlists?public_only=true`)
      ]);
      setMyPlaylists(mineRes.data);
      // Filter out user's own playlists from public
      setPublicPlaylists(publicRes.data.filter(p => p.user_id !== user?.user_id));
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Error al cargar las playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/playlists`, newPlaylist);
      toast.success('Playlist creada exitosamente');
      setShowCreateDialog(false);
      setNewPlaylist({ name: '', description: '', is_public: false });
      fetchPlaylists();
    } catch (error) {
      toast.error('Error al crear la playlist');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!deletePlaylist) return;

    try {
      await axios.delete(`${API}/playlists/${deletePlaylist.playlist_id}`);
      toast.success('Playlist eliminada');
      setDeletePlaylist(null);
      fetchPlaylists();
    } catch (error) {
      toast.error('Error al eliminar la playlist');
    }
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

  return (
    <Layout>
      <div className="space-y-8" data-testid="playlists-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Mis Playlists
            </h1>
            <p className="text-[#A1A1AA]">
              Organiza tus mixes favoritos en playlists personalizadas
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold"
            data-testid="create-playlist-btn"
          >
            <Plus size={20} className="mr-2" />
            Nueva playlist
          </Button>
        </div>

        {/* My Playlists */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
          <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Mis playlists ({myPlaylists.length})
          </h2>

          {myPlaylists.length === 0 ? (
            <div className="text-center py-12">
              <MusicNote size={48} className="mx-auto text-[#71717A] mb-4" />
              <p className="text-[#A1A1AA] mb-4">No tienes playlists aún</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
              >
                Crear mi primera playlist
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {myPlaylists.map((playlist) => (
                <div
                  key={playlist.playlist_id}
                  className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card group relative"
                  data-testid={`my-playlist-${playlist.playlist_id}`}
                >
                  <Link to={`/playlists/${playlist.playlist_id}`}>
                    <div className="w-full aspect-square rounded-md bg-gradient-to-br from-[#007AFF] to-[#005ECA] flex items-center justify-center mb-3">
                      <MusicNote size={40} className="text-white" />
                    </div>
                    <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {playlist.is_public ? (
                        <Globe size={14} className="text-[#34C759]" />
                      ) : (
                        <Lock size={14} className="text-[#71717A]" />
                      )}
                      <p className="text-sm text-[#71717A]">{playlist.mix_ids.length} mixes</p>
                    </div>
                  </Link>
                  
                  {/* Delete button */}
                  <button
                    onClick={() => setDeletePlaylist(playlist)}
                    className="absolute top-2 right-2 p-2 rounded-md bg-[#27272A] text-[#71717A] hover:text-[#FF3B30] hover:bg-[#FF3B30]/20 opacity-0 group-hover:opacity-100 transition-opacity"
                    data-testid={`delete-playlist-${playlist.playlist_id}`}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Playlists */}
        {publicPlaylists.length > 0 && (
          <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
            <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Playlists públicas de otros instructores
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {publicPlaylists.map((playlist) => (
                <Link
                  key={playlist.playlist_id}
                  to={`/playlists/${playlist.playlist_id}`}
                  className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card"
                  data-testid={`public-playlist-${playlist.playlist_id}`}
                >
                  <div className="w-full aspect-square rounded-md bg-gradient-to-br from-[#34C759] to-[#22C55E] flex items-center justify-center mb-3">
                    <MusicNote size={40} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                  <p className="text-sm text-[#A1A1AA] truncate">por {playlist.user_name}</p>
                  <p className="text-sm text-[#71717A]">{playlist.mix_ids.length} mixes</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Create Playlist Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Crear nueva playlist
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Nombre
                </label>
                <Input
                  value={newPlaylist.name}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
                  placeholder="Mi playlist de spinning"
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white"
                  data-testid="playlist-name-input"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                  Descripción (opcional)
                </label>
                <Textarea
                  value={newPlaylist.description}
                  onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
                  placeholder="Una descripción para tu playlist..."
                  className="bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white resize-none"
                  rows={3}
                  data-testid="playlist-description-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Playlist pública</p>
                  <p className="text-sm text-[#71717A]">Otros instructores podrán verla</p>
                </div>
                <Switch
                  checked={newPlaylist.is_public}
                  onCheckedChange={(checked) => setNewPlaylist({ ...newPlaylist, is_public: checked })}
                  data-testid="playlist-public-switch"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePlaylist}
                disabled={creating}
                className="bg-[#007AFF] hover:bg-[#3395FF]"
                data-testid="confirm-create-playlist-btn"
              >
                {creating ? 'Creando...' : 'Crear playlist'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletePlaylist} onOpenChange={() => setDeletePlaylist(null)}>
          <AlertDialogContent className="bg-[#141414] border-[#27272A]">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">¿Eliminar playlist?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#A1A1AA]">
                Esta acción no se puede deshacer. Se eliminará permanentemente la playlist "{deletePlaylist?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlaylist}
                className="bg-[#FF3B30] hover:bg-[#FF6159]"
                data-testid="confirm-delete-playlist-btn"
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
