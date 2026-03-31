import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '../App';
import { usePlayer } from '../App';
import axios from 'axios';
import Layout from '../components/Layout';
import { Play, MusicNote, ListPlus, Users, Storefront, Timer, Fire, TrendUp } from '@phosphor-icons/react';
import { Button } from '../components/ui/button';

export default function Dashboard() {
  const { user } = useAuth();
  const { playMix } = usePlayer();
  const [stats, setStats] = useState({
    totalMixes: 0,
    totalPlaylists: 0,
    genres: []
  });
  const [recentMixes, setRecentMixes] = useState([]);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mixesRes, playlistsRes, genresRes] = await Promise.all([
          axios.get(`${API}/mixes`),
          axios.get(`${API}/playlists/mine`),
          axios.get(`${API}/genres`)
        ]);

        setRecentMixes(mixesRes.data.slice(0, 5));
        setMyPlaylists(playlistsRes.data.slice(0, 4));
        setStats({
          totalMixes: mixesRes.data.length,
          totalPlaylists: playlistsRes.data.length,
          genres: genresRes.data
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBpmClass = (bpm) => {
    if (bpm < 100) return 'bpm-low';
    if (bpm < 140) return 'bpm-medium';
    return 'bpm-high';
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
      <div className="space-y-8" data-testid="dashboard">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              ¡Hola, {user?.name}!
            </h1>
            <p className="text-[#A1A1AA]">
              {user?.role === 'admin' ? 'Panel de administrador' : 'Bienvenido a tu espacio de música fitness'}
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/catalog">
              <Button className="bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold" data-testid="explore-catalog-btn">
                <MusicNote size={20} className="mr-2" />
                Explorar catálogo
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#141414] border border-[#27272A] rounded-md p-6 hover-card" data-testid="stat-mixes">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#007AFF]/20 flex items-center justify-center">
                <MusicNote size={24} className="text-[#007AFF]" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-sm">Mixes disponibles</p>
                <p className="text-2xl font-bold text-white">{stats.totalMixes}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#27272A] rounded-md p-6 hover-card" data-testid="stat-playlists">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#34C759]/20 flex items-center justify-center">
                <ListPlus size={24} className="text-[#34C759]" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-sm">Mis playlists</p>
                <p className="text-2xl font-bold text-white">{stats.totalPlaylists}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#27272A] rounded-md p-6 hover-card" data-testid="stat-genres">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#FF3B30]/20 flex items-center justify-center">
                <Fire size={24} className="text-[#FF3B30]" />
              </div>
              <div>
                <p className="text-[#A1A1AA] text-sm">Géneros</p>
                <p className="text-2xl font-bold text-white">{stats.genres.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Mixes */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Mixes recientes
            </h2>
            <Link to="/catalog" className="text-[#007AFF] hover:text-[#3395FF] text-sm font-semibold">
              Ver todos
            </Link>
          </div>

          {recentMixes.length === 0 ? (
            <div className="text-center py-12">
              <MusicNote size={48} className="mx-auto text-[#71717A] mb-4" />
              <p className="text-[#A1A1AA]">No hay mixes disponibles aún</p>
              {user?.role === 'admin' && (
                <Link to="/admin">
                  <Button className="mt-4 bg-[#007AFF] hover:bg-[#3395FF]">
                    Subir primer mix
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {recentMixes.map((mix, index) => (
                <div
                  key={mix.mix_id}
                  className={`mix-row flex items-center gap-4 p-3 rounded-md cursor-pointer animate-fade-in stagger-${index + 1}`}
                  onClick={() => playMix(mix, recentMixes)}
                  data-testid={`mix-row-${mix.mix_id}`}
                >
                  <div className="w-12 h-12 rounded-md bg-[#1F1F1F] flex items-center justify-center flex-shrink-0 group relative overflow-hidden">
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
                      <Play size={20} weight="fill" className="text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{mix.name}</p>
                    <p className="text-sm text-[#A1A1AA] truncate">{mix.artist}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-4">
                    <span className={`genre-tag ${getBpmClass(mix.bpm)}`}>
                      {mix.bpm} BPM
                    </span>
                    <span className="text-sm text-[#71717A] w-16">{mix.genre}</span>
                    <span className="text-sm text-[#71717A] flex items-center gap-1">
                      <Timer size={14} />
                      {formatDuration(mix.duration)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Playlists */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Mis playlists
            </h2>
            <Link to="/playlists" className="text-[#007AFF] hover:text-[#3395FF] text-sm font-semibold">
              Ver todas
            </Link>
          </div>

          {myPlaylists.length === 0 ? (
            <div className="text-center py-12">
              <ListPlus size={48} className="mx-auto text-[#71717A] mb-4" />
              <p className="text-[#A1A1AA] mb-4">No tienes playlists aún</p>
              <Link to="/playlists">
                <Button className="bg-[#007AFF] hover:bg-[#3395FF]">
                  Crear mi primera playlist
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {myPlaylists.map((playlist, index) => (
                <Link
                  key={playlist.playlist_id}
                  to={`/playlists/${playlist.playlist_id}`}
                  className={`bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card animate-fade-in stagger-${index + 1}`}
                  data-testid={`playlist-card-${playlist.playlist_id}`}
                >
                  <div className="w-full aspect-square rounded-md bg-gradient-to-br from-[#007AFF] to-[#005ECA] flex items-center justify-center mb-3">
                    <MusicNote size={40} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                  <p className="text-sm text-[#71717A]">{playlist.mix_ids.length} mixes</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Admin Quick Actions */}
        {user?.role === 'admin' && (
          <div className="bg-[#141414] border border-[#27272A] rounded-md p-6">
            <h2 className="text-xl font-bold text-white mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Acciones de administrador
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/admin?tab=mixes"
                className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card flex items-center gap-4"
                data-testid="admin-upload-mix"
              >
                <div className="w-10 h-10 rounded-md bg-[#007AFF]/20 flex items-center justify-center">
                  <MusicNote size={20} className="text-[#007AFF]" />
                </div>
                <div>
                  <p className="font-semibold text-white">Subir mix</p>
                  <p className="text-sm text-[#71717A]">Agregar nuevo contenido</p>
                </div>
              </Link>

              <Link
                to="/admin?tab=instructors"
                className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card flex items-center gap-4"
                data-testid="admin-manage-instructors"
              >
                <div className="w-10 h-10 rounded-md bg-[#34C759]/20 flex items-center justify-center">
                  <Users size={20} className="text-[#34C759]" />
                </div>
                <div>
                  <p className="font-semibold text-white">Instructores</p>
                  <p className="text-sm text-[#71717A]">Gestionar cuentas</p>
                </div>
              </Link>

              <Link
                to="/admin?tab=studios"
                className="bg-[#1F1F1F] border border-[#27272A] rounded-md p-4 hover-card flex items-center gap-4"
                data-testid="admin-manage-studios"
              >
                <div className="w-10 h-10 rounded-md bg-[#FF3B30]/20 flex items-center justify-center">
                  <Storefront size={20} className="text-[#FF3B30]" />
                </div>
                <div>
                  <p className="font-semibold text-white">Estudios</p>
                  <p className="text-sm text-[#71717A]">Gestionar sucursales</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
