import React, { useState, useEffect } from 'react';
import { useAuth, useSpotify, API } from '../../App';
import axios from 'axios';
import { User, SpotifyLogo, SignOut, PencilSimple, Check, Shield, MusicNote } from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

export default function ProfileView() {
  const { user, setUserData, logout } = useAuth();
  const spotify = useSpotify();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ playlists: 0, mixes: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API}/playlists/mine`);
        setStats(prev => ({ ...prev, playlists: res.data.length }));
      } catch (err) { /* ignore */ }
    };
    fetchStats();
  }, []);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await axios.put(`${API}/auth/profile`, { name: name.trim() });
      setUserData({ ...user, name: name.trim() });
      setEditingName(false);
      toast.success('Nombre actualizado');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const connectSpotify = async () => {
    try {
      const res = await axios.get(`${API}/spotify/auth-url`);
      window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error('Error al conectar con Spotify');
    }
  };

  const disconnectSpotify = async () => {
    try {
      await axios.post(`${API}/spotify/disconnect`);
      spotify?.checkConnection();
      toast.success('Spotify desconectado');
    } catch (err) {
      toast.error('Error al desconectar');
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { label: 'Administrador', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
      instructor: { label: 'Instructor', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      studio: { label: 'Estudio', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    };
    return badges[role] || { label: role, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
  };

  const roleBadge = getRoleBadge(user?.role);

  return (
    <div data-testid="profile-view" className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8" style={{ fontFamily: 'Outfit' }}>Mi Perfil</h1>
      
      {/* Avatar & Basic Info */}
      <div className="bg-[#181818] rounded-xl p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-[#282828] flex items-center justify-center flex-shrink-0 overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={36} className="text-[#B3B3B3]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-[#3E3E3E] border-0 h-9 text-lg"
                    autoFocus
                    data-testid="edit-name-input"
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  />
                  <button onClick={handleSaveName} disabled={saving} className="text-[#1DB954] hover:text-[#1ed760]">
                    <Check size={20} weight="bold" />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white truncate">{user?.name}</h2>
                  <button onClick={() => { setName(user?.name || ''); setEditingName(true); }} className="text-[#B3B3B3] hover:text-white">
                    <PencilSimple size={16} />
                  </button>
                </>
              )}
            </div>
            <p className="text-sm text-[#B3B3B3] mb-2">{user?.email}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${roleBadge.color}`}>
              <Shield size={12} />
              {roleBadge.label}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-6 mt-6 pt-5 border-t border-[#282828]">
          <div>
            <p className="text-2xl font-bold text-white">{stats.playlists}</p>
            <p className="text-xs text-[#B3B3B3]">Playlists</p>
          </div>
        </div>
      </div>

      {/* Spotify Connection */}
      <div className="bg-[#181818] rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SpotifyLogo size={32} weight="fill" className="text-[#1DB954]" />
            <div>
              <h3 className="font-bold text-white">Spotify</h3>
              <p className="text-sm text-[#B3B3B3]">
                {spotify?.spotifyConnected 
                  ? 'Cuenta conectada - reproducción completa habilitada' 
                  : 'Conecta tu cuenta Premium para reproducción completa'}
              </p>
            </div>
          </div>
          {spotify?.spotifyConnected ? (
            <Button 
              onClick={disconnectSpotify} 
              variant="outline" 
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              data-testid="spotify-disconnect-btn"
            >
              Desconectar
            </Button>
          ) : (
            <Button 
              onClick={connectSpotify} 
              className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold"
              data-testid="spotify-connect-btn"
            >
              <SpotifyLogo size={18} weight="fill" className="mr-2" />
              Conectar
            </Button>
          )}
        </div>
        {!spotify?.spotifyConnected && (
          <p className="text-xs text-[#6A6A6A] mt-3">
            Necesitas una cuenta Spotify Premium para reproducir canciones completas de Spotify. Sin conexión, se reproducen previews de 30 segundos.
          </p>
        )}
      </div>

      {/* Logout */}
      <div className="bg-[#181818] rounded-xl p-6">
        <Button 
          onClick={logout} 
          variant="ghost" 
          className="text-[#B3B3B3] hover:text-white hover:bg-white/10"
          data-testid="logout-btn"
        >
          <SignOut size={18} className="mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
