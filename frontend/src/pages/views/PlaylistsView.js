import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../../App';
import axios from 'axios';
import { ListPlus, Plus, Globe, Lock, MusicNote } from '@phosphor-icons/react';
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
import { toast } from 'sonner';

export default function PlaylistsView() {
  const { user } = useAuth();
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '', is_public: false });
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
      setPublicPlaylists(publicRes.data.filter(p => p.user_id !== user?.user_id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newPlaylist.name.trim()) {
      toast.error('Ingresa un nombre');
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${API}/playlists`, newPlaylist);
      toast.success('Playlist creada');
      setShowDialog(false);
      setNewPlaylist({ name: '', description: '', is_public: false });
      fetchPlaylists();
    } catch (err) {
      toast.error('Error al crear');
    } finally {
      setCreating(false);
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
    <div data-testid="playlists-view">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>
          Mis Playlists
        </h1>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold"
          data-testid="create-playlist-btn"
        >
          <Plus size={18} className="mr-2" />
          Nueva playlist
        </Button>
      </div>

      {myPlaylists.length === 0 ? (
        <div className="text-center py-16">
          <ListPlus size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3] mb-4">No tienes playlists aún</p>
          <Button onClick={() => setShowDialog(true)} className="bg-[#1DB954] hover:bg-[#1ed760] text-black">
            Crear mi primera playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 mb-12">
          {myPlaylists.map((playlist) => (
            <Link
              key={playlist.playlist_id}
              to={`/playlists/${playlist.playlist_id}`}
              className="album-card group"
              data-testid={`playlist-card-${playlist.playlist_id}`}
            >
              <div className="album-cover-container bg-gradient-to-br from-[#535353] to-[#282828]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <MusicNote size={48} className="text-[#B3B3B3]" />
                </div>
              </div>
              
              <h3 className="font-bold text-white truncate mb-1">{playlist.name}</h3>
              <div className="flex items-center gap-2 text-xs text-[#B3B3B3]">
                {playlist.is_public ? <Globe size={12} /> : <Lock size={12} />}
                <span>{playlist.mix_ids.length} canciones</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {publicPlaylists.length > 0 && (
        <>
          <h2 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit' }}>
            Playlists Públicas
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {publicPlaylists.map((playlist) => (
              <Link
                key={playlist.playlist_id}
                to={`/playlists/${playlist.playlist_id}`}
                className="album-card group"
              >
                <div className="album-cover-container bg-gradient-to-br from-[#1DB954] to-[#191414]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <MusicNote size={48} className="text-white/50" />
                  </div>
                </div>
                
                <h3 className="font-bold text-white truncate mb-1">{playlist.name}</h3>
                <p className="text-xs text-[#B3B3B3] truncate">por {playlist.user_name}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#282828] border-0 text-white">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Nueva playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              value={newPlaylist.name}
              onChange={(e) => setNewPlaylist({ ...newPlaylist, name: e.target.value })}
              placeholder="Nombre de la playlist"
              className="bg-[#3E3E3E] border-0"
              data-testid="playlist-name-input"
            />
            <Input
              value={newPlaylist.description}
              onChange={(e) => setNewPlaylist({ ...newPlaylist, description: e.target.value })}
              placeholder="Descripción (opcional)"
              className="bg-[#3E3E3E] border-0"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm">Playlist pública</span>
              <Switch
                checked={newPlaylist.is_public}
                onCheckedChange={(v) => setNewPlaylist({ ...newPlaylist, is_public: v })}
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setShowDialog(false)} className="text-white">
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-[#1DB954] hover:bg-[#1ed760] text-black" data-testid="confirm-create-btn">
              {creating ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
