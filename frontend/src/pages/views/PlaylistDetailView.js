import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, usePlayer, API } from '../../App';
import axios from 'axios';
import { 
  Play, Pause, Clock, MusicNote, PencilSimple, Trash, Globe, Lock, 
  Share, SpotifyLogo, CloudArrowDown, Plus, MagnifyingGlass, X, WifiSlash
} from '@phosphor-icons/react';
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

  // Add songs state
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addTab, setAddTab] = useState('mixes');
  const [searchMixes, setSearchMixes] = useState([]);
  const [searchSpotify, setSearchSpotify] = useState([]);
  const [searching, setSearching] = useState(false);

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

  // Search for songs to add
  useEffect(() => {
    if (!addQuery.trim() || !showAddSongs) return;
    const doSearch = async () => {
      setSearching(true);
      try {
        if (addTab === 'mixes') {
          const res = await axios.get(`${API}/mixes?search=${encodeURIComponent(addQuery)}`);
          setSearchMixes(res.data);
        } else {
          const res = await axios.get(`${API}/spotify/search?q=${encodeURIComponent(addQuery)}&limit=15`);
          setSearchSpotify(res.data.tracks || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    };
    const debounce = setTimeout(doSearch, 300);
    return () => clearTimeout(debounce);
  }, [addQuery, addTab, showAddSongs]);

  // Load all mixes when opening add modal with no query
  useEffect(() => {
    if (showAddSongs && !addQuery.trim() && addTab === 'mixes') {
      axios.get(`${API}/mixes`).then(r => setSearchMixes(r.data)).catch(() => {});
    }
  }, [showAddSongs, addTab]);

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
      const playableItems = items.map(item => ({ ...item, type: item.type || 'mix' }));
      playMix(playableItems[0], playableItems);
    }
  };

  const playItem = (item, idx) => {
    const playableItems = items.map(i => ({ ...i, type: i.type || 'mix' }));
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

  const [offlineSaving, setOfflineSaving] = useState(false);
  const [offlineTracks, setOfflineTracks] = useState([]);

  // Check which tracks are cached offline
  useEffect(() => {
    checkOfflineTracks();
  }, [items]);

  const checkOfflineTracks = async () => {
    try {
      const db = await openOfflineDB();
      const cached = [];
      for (const item of items) {
        if (item.type === 'mix' && item.mix_id) {
          const exists = await getFromDB(db, item.mix_id);
          if (exists) cached.push(item.mix_id);
        }
      }
      setOfflineTracks(cached);
    } catch { /* ignore */ }
  };

  const openOfflineDB = () => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('fitbeats_offline', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio', { keyPath: 'mix_id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };

  const getFromDB = (db, mixId) => {
    return new Promise((resolve) => {
      const tx = db.transaction('audio', 'readonly');
      const store = tx.objectStore('audio');
      const req = store.get(mixId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  };

  const handleSaveOffline = async () => {
    const mixItems = items.filter(i => i.type === 'mix');
    if (mixItems.length === 0) {
      toast.info('No hay mixes locales para guardar offline');
      return;
    }
    setOfflineSaving(true);
    try {
      const db = await openOfflineDB();
      let saved = 0;
      for (const item of mixItems) {
        if (offlineTracks.includes(item.mix_id)) continue;
        toast.info(`Guardando offline: ${item.name}...`);
        const response = await axios.get(`${API}/mixes/${item.mix_id}/audio`, { responseType: 'arraybuffer' });
        await new Promise((resolve, reject) => {
          const tx = db.transaction('audio', 'readwrite');
          const store = tx.objectStore('audio');
          store.put({ mix_id: item.mix_id, name: item.name, artist: item.artist, audio: response.data, cached_at: Date.now() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
        saved++;
      }
      toast.success(`${saved} mixes guardados para reproducción offline`);
      checkOfflineTracks();
    } catch (err) {
      toast.error('Error al guardar offline');
    } finally {
      setOfflineSaving(false);
    }
  };

  const addMixToPlaylist = async (mix) => {
    try {
      await axios.post(`${API}/playlists/${id}/items`, { type: 'mix', mix_id: mix.mix_id });
      toast.success(`"${mix.name}" agregado`);
      fetchPlaylist();
    } catch (err) {
      toast.error('Error al agregar');
    }
  };

  const addSpotifyToPlaylist = async (track) => {
    try {
      await axios.post(`${API}/playlists/${id}/items`, {
        type: 'spotify',
        spotify_id: track.spotify_id,
        name: track.name,
        artist: track.artist,
        album: track.album,
        album_image: track.album_image,
        duration_ms: track.duration_ms,
        uri: track.uri,
        preview_url: track.preview_url,
      });
      toast.success(`"${track.name}" agregado`);
      fetchPlaylist();
    } catch (err) {
      toast.error('Error al agregar');
    }
  };

  const isAlreadyInPlaylist = (trackId) => {
    return items.some(i => (i.mix_id || i.spotify_id) === trackId);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6 mb-6">
        <div className="w-40 h-40 sm:w-56 sm:h-56 rounded shadow-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#535353] to-[#282828] flex items-center justify-center">
          <MusicNote size={60} className="text-[#B3B3B3]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {playlist.is_public ? (
              <span className="flex items-center gap-1 text-xs text-[#1DB954]"><Globe size={12} /> Pública</span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-[#B3B3B3]"><Lock size={12} /> Privada</span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white mt-2 mb-3" style={{ fontFamily: 'Outfit' }}>
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
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={playAll}
          disabled={items.length === 0}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
          data-testid="play-all-btn"
        >
          <Play size={24} weight="fill" className="text-black ml-0.5" />
        </button>
        
        {isOwner && (
          <>
            <button onClick={() => setShowAddSongs(true)} className="text-[#B3B3B3] hover:text-white" data-testid="add-songs-btn" title="Agregar canciones">
              <Plus size={24} />
            </button>
            <button onClick={() => setShowEdit(true)} className="text-[#B3B3B3] hover:text-white">
              <PencilSimple size={24} />
            </button>
          </>
        )}
        
        {playlist.is_public && (
          <button onClick={handleShare} className="text-[#B3B3B3] hover:text-white" data-testid="share-btn">
            <Share size={24} />
          </button>
        )}
        
        <button 
          onClick={handleSaveOffline} 
          disabled={offlineSaving}
          className={`text-[#B3B3B3] hover:text-white relative ${offlineSaving ? 'animate-pulse' : ''}`}
          data-testid="save-offline-btn" 
          title="Guardar para reproducción offline"
        >
          <CloudArrowDown size={24} />
          {offlineTracks.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#1DB954] rounded-full"></span>
          )}
        </button>
      </div>

      {/* Track List */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <MusicNote size={64} className="mx-auto text-[#535353] mb-4" />
          <p className="text-[#B3B3B3] mb-4">Esta playlist está vacía</p>
          {isOwner && (
            <Button onClick={() => setShowAddSongs(true)} className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold" data-testid="add-songs-empty-btn">
              <Plus size={18} className="mr-2" />
              Agregar canciones
            </Button>
          )}
        </div>
      ) : (
        <div>
          {/* Header Row - Desktop only */}
          <div className="hidden sm:grid grid-cols-[16px_4fr_2fr_1fr_40px] gap-4 px-4 py-2 text-xs uppercase tracking-wider text-[#B3B3B3] border-b border-[#282828]">
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
                  className="flex items-center gap-3 px-3 sm:px-4 py-2.5 rounded-md group hover:bg-white/10 cursor-pointer"
                  onDoubleClick={() => playItem(item, idx)}
                  onClick={() => { if (window.innerWidth < 640) playItem(item, idx); }}
                  data-testid={`playlist-item-${idx}`}
                >
                  {/* Number / Play */}
                  <div className="w-5 flex-shrink-0 text-center text-sm text-[#B3B3B3]">
                    <span className="group-hover:hidden">
                      {isCurrent && isPlaying ? (
                        <span className="text-[#1DB954] text-xs">&#9654;</span>
                      ) : (
                        <span className={isCurrent ? 'text-[#1DB954]' : ''}>{idx + 1}</span>
                      )}
                    </span>
                    <span className="hidden group-hover:inline">
                      <button onClick={(e) => { e.stopPropagation(); isCurrent ? togglePlay() : playItem(item, idx); }}>
                        {isCurrent && isPlaying ? <Pause size={14} weight="fill" className="text-white" /> : <Play size={14} weight="fill" className="text-white" />}
                      </button>
                    </span>
                  </div>

                  {/* Cover */}
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

                  {/* Title + Artist */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-medium truncate text-sm ${isCurrent ? 'text-[#1DB954]' : 'text-white'}`}>{item.name}</p>
                      {isSpotify && <SpotifyLogo size={12} weight="fill" className="text-[#1DB954] flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-[#B3B3B3] truncate">{item.artist}</p>
                  </div>

                  {/* Album - hidden on mobile */}
                  <div className="hidden sm:block w-[18%] text-sm text-[#B3B3B3] truncate">
                    {isSpotify ? item.album : (item.album_name || '-')}
                  </div>

                  {/* Duration */}
                  <div className="text-sm text-[#B3B3B3] flex-shrink-0 w-12 text-right">
                    {isSpotify ? formatDuration(item.duration_ms, true) : formatDuration(item.duration)}
                  </div>

                  {/* Delete - desktop only */}
                  <div className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-8">
                    {isOwner && (
                      <button onClick={(e) => { e.stopPropagation(); setDeleteItem({ index: idx, name: item.name }); }} className="text-[#B3B3B3] hover:text-[#ff6b6b]">
                        <Trash size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add more songs button */}
          {isOwner && (
            <button 
              onClick={() => setShowAddSongs(true)} 
              className="mt-4 flex items-center gap-2 text-[#B3B3B3] hover:text-white text-sm px-4 py-3"
              data-testid="add-more-songs-btn"
            >
              <Plus size={18} />
              <span>Agregar más canciones</span>
            </button>
          )}
        </div>
      )}

      {/* Add Songs Dialog */}
      <Dialog open={showAddSongs} onOpenChange={setShowAddSongs}>
        <DialogContent className="bg-[#282828] border-0 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Agregar canciones</DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="relative mt-2">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={18} />
            <Input
              autoFocus
              placeholder="Buscar mixes o canciones de Spotify..."
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              className="pl-10 bg-[#3E3E3E] border-0 rounded-full"
              data-testid="add-songs-search"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setAddTab('mixes')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${addTab === 'mixes' ? 'bg-white text-black' : 'bg-[#3E3E3E] text-white'}`}
              data-testid="add-tab-mixes"
            >
              Mixes
            </button>
            <button
              onClick={() => setAddTab('spotify')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${addTab === 'spotify' ? 'bg-white text-black' : 'bg-[#3E3E3E] text-white'}`}
              data-testid="add-tab-spotify"
            >
              <SpotifyLogo size={14} weight="fill" className="inline mr-1 text-[#1DB954]" />
              Spotify
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto mt-3 -mx-6 px-6" style={{ maxHeight: '50vh' }}>
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#1DB954]"></div>
              </div>
            ) : addTab === 'mixes' ? (
              searchMixes.length === 0 ? (
                <p className="text-center text-[#B3B3B3] py-8 text-sm">
                  {addQuery.trim() ? 'Sin resultados' : 'Todos los mixes disponibles aparecerán aquí'}
                </p>
              ) : (
                <div className="space-y-1">
                  {searchMixes.map((mix) => {
                    const alreadyIn = isAlreadyInPlaylist(mix.mix_id);
                    return (
                      <div key={mix.mix_id} className="flex items-center gap-3 p-2 rounded hover:bg-white/10">
                        <div className="w-10 h-10 rounded bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                          {mix.cover_path ? (
                            <img src={`${API}/mixes/${mix.mix_id}/cover`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><MusicNote size={14} className="text-[#535353]" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{mix.name}</p>
                          <p className="text-xs text-[#B3B3B3] truncate">{mix.artist} &bull; {mix.album_name}</p>
                        </div>
                        <div className="text-xs text-[#B3B3B3] mr-2">{formatDuration(mix.duration)}</div>
                        <button
                          onClick={() => addMixToPlaylist(mix)}
                          disabled={alreadyIn}
                          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                            alreadyIn 
                              ? 'border-[#535353] text-[#535353] cursor-default' 
                              : 'border-white/30 text-white hover:border-white hover:bg-white/10'
                          }`}
                          data-testid={`add-mix-${mix.mix_id}`}
                        >
                          {alreadyIn ? 'Agregado' : 'Agregar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              !addQuery.trim() ? (
                <p className="text-center text-[#B3B3B3] py-8 text-sm">Escribe para buscar en Spotify</p>
              ) : searchSpotify.length === 0 ? (
                <p className="text-center text-[#B3B3B3] py-8 text-sm">Sin resultados en Spotify</p>
              ) : (
                <div className="space-y-1">
                  {searchSpotify.map((track) => {
                    const alreadyIn = isAlreadyInPlaylist(track.spotify_id);
                    return (
                      <div key={track.spotify_id} className="flex items-center gap-3 p-2 rounded hover:bg-white/10">
                        <div className="w-10 h-10 rounded bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                          {track.album_image ? (
                            <img src={track.album_image_small || track.album_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><SpotifyLogo size={14} className="text-[#1DB954]" /></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium text-white truncate">{track.name}</p>
                            <SpotifyLogo size={10} weight="fill" className="text-[#1DB954] flex-shrink-0" />
                          </div>
                          <p className="text-xs text-[#B3B3B3] truncate">{track.artist} &bull; {track.album}</p>
                        </div>
                        <div className="text-xs text-[#B3B3B3] mr-2">{formatDuration(track.duration_ms, true)}</div>
                        <button
                          onClick={() => addSpotifyToPlaylist(track)}
                          disabled={alreadyIn}
                          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                            alreadyIn 
                              ? 'border-[#535353] text-[#535353] cursor-default' 
                              : 'border-white/30 text-white hover:border-white hover:bg-white/10'
                          }`}
                          data-testid={`add-spotify-${track.spotify_id}`}
                        >
                          {alreadyIn ? 'Agregado' : 'Agregar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

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
