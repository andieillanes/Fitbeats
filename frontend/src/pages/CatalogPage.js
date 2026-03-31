import React, { useEffect, useState } from 'react';
import { useAuth, API } from '../App';
import { usePlayer } from '../App';
import axios from 'axios';
import Layout from '../components/Layout';
import { 
  Play, MusicNote, Timer, MagnifyingGlass, 
  Funnel, Plus, X, Download, CaretDown, Disc 
} from '@phosphor-icons/react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

export default function CatalogPage() {
  const { user } = useAuth();
  const { playMix, currentMix } = usePlayer();
  const [mixes, setMixes] = useState([]);
  const [filteredMixes, setFilteredMixes] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [genres, setGenres] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [bpmRange, setBpmRange] = useState({ min: '', max: '' });
  const [addToPlaylistMix, setAddToPlaylistMix] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mixesRes, albumsRes, genresRes, playlistsRes] = await Promise.all([
          axios.get(`${API}/mixes`),
          axios.get(`${API}/albums`),
          axios.get(`${API}/genres`),
          axios.get(`${API}/playlists/mine`)
        ]);
        setMixes(mixesRes.data);
        setFilteredMixes(mixesRes.data);
        setAlbums(albumsRes.data);
        setGenres(genresRes.data);
        setPlaylists(playlistsRes.data);
      } catch (error) {
        console.error('Error fetching catalog:', error);
        toast.error('Error al cargar el catálogo');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let result = mixes;

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        mix =>
          mix.name.toLowerCase().includes(searchLower) ||
          mix.artist.toLowerCase().includes(searchLower)
      );
    }

    if (selectedGenre) {
      result = result.filter(mix => mix.genre === selectedGenre);
    }

    if (selectedAlbum) {
      result = result.filter(mix => mix.album_id === selectedAlbum);
    }

    if (bpmRange.min) {
      result = result.filter(mix => mix.bpm >= parseInt(bpmRange.min));
    }

    if (bpmRange.max) {
      result = result.filter(mix => mix.bpm <= parseInt(bpmRange.max));
    }

    setFilteredMixes(result);
  }, [search, selectedGenre, selectedAlbum, bpmRange, mixes]);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBpmClass = (bpm) => {
    if (!bpm) return '';
    if (bpm < 100) return 'bpm-low';
    if (bpm < 140) return 'bpm-medium';
    return 'bpm-high';
  };

  const handleAddToPlaylist = async (playlistId) => {
    if (!addToPlaylistMix) return;
    
    try {
      await axios.post(`${API}/playlists/${playlistId}/mixes/${addToPlaylistMix.mix_id}`);
      toast.success('Mix agregado a la playlist');
      setAddToPlaylistMix(null);
    } catch (error) {
      toast.error('Error al agregar mix a la playlist');
    }
  };

  const handleDownload = async (mix) => {
    try {
      const response = await axios.get(`${API}/mixes/${mix.mix_id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${mix.name} - ${mix.artist}.mp3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Descarga iniciada');
    } catch (error) {
      toast.error('Error al descargar el mix');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedGenre('');
    setSelectedAlbum('');
    setBpmRange({ min: '', max: '' });
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
      <div className="space-y-6" data-testid="catalog-page">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Catálogo de Mixes
          </h1>
          <p className="text-[#A1A1AA]">
            Explora nuestra colección completa de mixes para fitness
          </p>
        </div>

        {/* Filters */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nombre o artista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                data-testid="catalog-search-input"
              />
            </div>

            {/* Genre Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
                  data-testid="genre-filter-btn"
                >
                  <Funnel size={18} className="mr-2" />
                  {selectedGenre || 'Género'}
                  <CaretDown size={16} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1F1F1F] border-[#27272A]">
                <DropdownMenuItem 
                  onClick={() => setSelectedGenre('')}
                  className="text-white hover:bg-[#27272A] cursor-pointer"
                >
                  Todos los géneros
                </DropdownMenuItem>
                {genres.map((genre) => (
                  <DropdownMenuItem
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className="text-white hover:bg-[#27272A] cursor-pointer"
                  >
                    {genre}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Album Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="bg-[#1F1F1F] border-[#27272A] text-white hover:bg-[#27272A]"
                  data-testid="album-filter-btn"
                >
                  <Disc size={18} className="mr-2" />
                  {albums.find(a => a.album_id === selectedAlbum)?.name || 'Álbum'}
                  <CaretDown size={16} className="ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#1F1F1F] border-[#27272A]">
                <DropdownMenuItem 
                  onClick={() => setSelectedAlbum('')}
                  className="text-white hover:bg-[#27272A] cursor-pointer"
                >
                  Todos los álbumes
                </DropdownMenuItem>
                {albums.map((album) => (
                  <DropdownMenuItem
                    key={album.album_id}
                    onClick={() => setSelectedAlbum(album.album_id)}
                    className="text-white hover:bg-[#27272A] cursor-pointer"
                  >
                    {album.name} ({album.year})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* BPM Range */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="BPM Min"
                value={bpmRange.min}
                onChange={(e) => setBpmRange({ ...bpmRange, min: e.target.value })}
                className="w-24 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                data-testid="bpm-min-input"
              />
              <span className="text-[#71717A]">-</span>
              <Input
                type="number"
                placeholder="BPM Max"
                value={bpmRange.max}
                onChange={(e) => setBpmRange({ ...bpmRange, max: e.target.value })}
                className="w-24 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                data-testid="bpm-max-input"
              />
            </div>

            {/* Clear Filters */}
            {(search || selectedGenre || selectedAlbum || bpmRange.min || bpmRange.max) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-[#A1A1AA] hover:text-white hover:bg-[#27272A]"
                data-testid="clear-filters-btn"
              >
                <X size={18} className="mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-[#A1A1AA]">
          {filteredMixes.length} {filteredMixes.length === 1 ? 'mix encontrado' : 'mixes encontrados'}
        </div>

        {/* Mixes List */}
        <div className="bg-[#141414] border border-[#27272A] rounded-md overflow-hidden">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-[48px_1fr_100px_100px_80px_100px] gap-4 px-4 py-3 border-b border-[#27272A] text-xs uppercase tracking-[0.2em] font-bold text-[#71717A]">
            <div></div>
            <div>Título / Artista</div>
            <div>Género</div>
            <div className="text-center">BPM</div>
            <div className="text-center">Duración</div>
            <div></div>
          </div>

          {/* Mix Rows */}
          {filteredMixes.length === 0 ? (
            <div className="text-center py-12">
              <MusicNote size={48} className="mx-auto text-[#71717A] mb-4" />
              <p className="text-[#A1A1AA]">No se encontraron mixes</p>
            </div>
          ) : (
            <div className="divide-y divide-[#27272A]">
              {filteredMixes.map((mix) => (
                <div
                  key={mix.mix_id}
                  className={`mix-row grid grid-cols-1 md:grid-cols-[48px_1fr_100px_100px_80px_100px] gap-4 px-4 py-3 items-center ${
                    currentMix?.mix_id === mix.mix_id ? 'active' : ''
                  }`}
                  data-testid={`catalog-mix-${mix.mix_id}`}
                >
                  {/* Play button / Cover */}
                  <div 
                    className="w-12 h-12 rounded-md bg-[#1F1F1F] flex items-center justify-center flex-shrink-0 group relative overflow-hidden cursor-pointer"
                    onClick={() => playMix(mix, filteredMixes)}
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
                      <Play size={20} weight="fill" className="text-white" />
                    </div>
                  </div>

                  {/* Title / Artist */}
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{mix.name}</p>
                    <p className="text-sm text-[#A1A1AA] truncate">{mix.artist}</p>
                  </div>

                  {/* Genre */}
                  <div className="hidden md:block">
                    <span className="text-sm text-[#A1A1AA]">{mix.genre || '-'}</span>
                  </div>

                  {/* BPM */}
                  <div className="hidden md:flex justify-center">
                    {mix.bpm ? (
                      <span className={`genre-tag ${getBpmClass(mix.bpm)}`}>
                        {mix.bpm}
                      </span>
                    ) : (
                      <span className="text-sm text-[#71717A]">-</span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="hidden md:flex justify-center items-center text-sm text-[#71717A]">
                    <Timer size={14} className="mr-1" />
                    {formatDuration(mix.duration)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddToPlaylistMix(mix)}
                      className="text-[#A1A1AA] hover:text-white hover:bg-[#27272A]"
                      data-testid={`add-to-playlist-${mix.mix_id}`}
                    >
                      <Plus size={18} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownload(mix)}
                      className="text-[#A1A1AA] hover:text-white hover:bg-[#27272A]"
                      data-testid={`download-mix-${mix.mix_id}`}
                    >
                      <Download size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add to Playlist Dialog */}
        <Dialog open={!!addToPlaylistMix} onOpenChange={() => setAddToPlaylistMix(null)}>
          <DialogContent className="bg-[#141414] border-[#27272A] text-white">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>
                Agregar a playlist
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-4">
              {playlists.length === 0 ? (
                <p className="text-[#A1A1AA] text-center py-4">
                  No tienes playlists. Crea una primero.
                </p>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.playlist_id}
                    onClick={() => handleAddToPlaylist(playlist.playlist_id)}
                    className="w-full text-left p-3 rounded-md bg-[#1F1F1F] hover:bg-[#27272A] transition-colors"
                    data-testid={`select-playlist-${playlist.playlist_id}`}
                  >
                    <p className="font-semibold">{playlist.name}</p>
                    <p className="text-sm text-[#71717A]">{playlist.mix_ids.length} mixes</p>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
