import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer, API } from '../../App';
import axios from 'axios';
import { 
  Play, Pause, Timer, Plus, Trash, MusicNote, SpotifyLogo, 
  MagnifyingGlass, DotsSixVertical, ArrowsClockwise, X,
  Lightning, Waveform, Stop, SkipForward
} from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Slider } from '../../components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const TRANSITIONS = [
  { value: 'crossfade', label: 'Crossfade', desc: 'Mezcla suave entre canciones' },
  { value: 'cut', label: 'Corte', desc: 'Cambio directo sin transición' },
  { value: 'fade_out', label: 'Fade Out', desc: 'La canción se desvanece al final' },
  { value: 'fade_in', label: 'Fade In', desc: 'La siguiente canción aparece gradualmente' },
];

export default function ClassModeView() {
  const navigate = useNavigate();
  const { playMix, currentMix, isPlaying, togglePlay, playNext, setIsPlaying } = usePlayer();
  
  // Sessions
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Current session editor
  const [editSession, setEditSession] = useState(null);
  const [sessionName, setSessionName] = useState('');
  const [tracks, setTracks] = useState([]);
  const [transitionDuration, setTransitionDuration] = useState(3);
  
  // Add songs modal
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addTab, setAddTab] = useState('mixes');
  const [searchMixes, setSearchMixes] = useState([]);
  const [searchSpotify, setSearchSpotify] = useState([]);
  
  // Class player
  const [classPlaying, setClassPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [trackElapsed, setTrackElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/class-sessions`);
      setSessions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Search
  useEffect(() => {
    if (!showAddSongs) return;
    const doSearch = async () => {
      try {
        if (addTab === 'mixes') {
          const q = addQuery.trim() ? `?search=${encodeURIComponent(addQuery)}` : '';
          const res = await axios.get(`${API}/mixes${q}`);
          setSearchMixes(res.data);
        } else if (addQuery.trim()) {
          const res = await axios.get(`${API}/spotify/search?q=${encodeURIComponent(addQuery)}&limit=15`);
          setSearchSpotify(res.data.tracks || []);
        }
      } catch (err) { console.error(err); }
    };
    const timer = setTimeout(doSearch, 300);
    return () => clearTimeout(timer);
  }, [addQuery, addTab, showAddSongs]);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTotalTime = () => {
    return tracks.reduce((acc, t) => acc + (t.custom_duration || getDefaultDuration(t)), 0);
  };

  const getDefaultDuration = (track) => {
    if (track.type === 'spotify') return Math.floor((track.original_duration || 0) / 1000);
    return track.original_duration || 240;
  };

  const getTrackDuration = (track) => track.custom_duration || getDefaultDuration(track);

  // Create new session
  const createNewSession = () => {
    setEditSession(null);
    setSessionName('Nueva clase');
    setTracks([]);
    setTransitionDuration(3);
  };

  const openSession = async (session) => {
    setEditSession(session.session_id);
    setSessionName(session.name);
    setTracks(session.tracks || []);
    setTransitionDuration(session.transition_duration || 3);
  };

  const saveSession = async () => {
    if (!sessionName.trim()) return toast.error('Agrega un nombre');
    if (tracks.length === 0) return toast.error('Agrega al menos una canción');
    
    setSaving(true);
    try {
      const payload = {
        name: sessionName,
        tracks,
        total_duration: Math.ceil(getTotalTime() / 60),
        transition_duration: transitionDuration,
      };
      if (editSession) {
        await axios.put(`${API}/class-sessions/${editSession}`, payload);
        toast.success('Sesión actualizada');
      } else {
        const res = await axios.post(`${API}/class-sessions`, payload);
        setEditSession(res.data.session_id);
        toast.success('Sesión creada');
      }
      fetchSessions();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id) => {
    try {
      await axios.delete(`${API}/class-sessions/${id}`);
      toast.success('Sesión eliminada');
      if (editSession === id) {
        setEditSession(null);
        setTracks([]);
      }
      fetchSessions();
    } catch (err) {
      toast.error('Error al eliminar');
    }
  };

  // Add track from search
  const addTrack = (item, type) => {
    const newTrack = {
      type,
      mix_id: type === 'mix' ? item.mix_id : undefined,
      spotify_id: type === 'spotify' ? item.spotify_id : undefined,
      name: item.name,
      artist: item.artist,
      album_image: type === 'spotify' ? item.album_image : undefined,
      uri: item.uri,
      preview_url: item.preview_url,
      original_duration: type === 'spotify' ? item.duration_ms : item.duration,
      custom_duration: null,
      transition: 'crossfade',
    };
    setTracks(prev => [...prev, newTrack]);
    toast.success(`"${item.name}" agregado`);
  };

  const removeTrack = (idx) => {
    setTracks(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTrack = (idx, field, value) => {
    setTracks(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const moveTrack = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tracks.length) return;
    const newTracks = [...tracks];
    [newTracks[idx], newTracks[newIdx]] = [newTracks[newIdx], newTracks[idx]];
    setTracks(newTracks);
  };

  // Class player controls
  const startClass = () => {
    if (tracks.length === 0) return;
    setClassPlaying(true);
    setCurrentTrackIdx(0);
    setTrackElapsed(0);
    playTrackAtIndex(0);
  };

  const stopClass = () => {
    setClassPlaying(false);
    setCurrentTrackIdx(0);
    setTrackElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
  };

  const skipToNext = () => {
    if (currentTrackIdx < tracks.length - 1) {
      const next = currentTrackIdx + 1;
      setCurrentTrackIdx(next);
      setTrackElapsed(0);
      playTrackAtIndex(next);
    } else {
      stopClass();
      toast.success('Clase terminada!');
    }
  };

  const playTrackAtIndex = (idx) => {
    const track = tracks[idx];
    if (!track) return;
    const playable = {
      ...track,
      type: track.type,
      mix_id: track.mix_id,
      spotify_id: track.spotify_id,
    };
    playMix(playable, tracks.map(t => ({
      ...t, type: t.type, mix_id: t.mix_id, spotify_id: t.spotify_id
    })));
  };

  // Timer for track duration
  useEffect(() => {
    if (!classPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTrackElapsed(prev => {
        const currentTrack = tracks[currentTrackIdx];
        if (!currentTrack) return prev;
        const maxDuration = getTrackDuration(currentTrack);
        if (prev + 1 >= maxDuration) {
          // Auto-advance
          if (currentTrackIdx < tracks.length - 1) {
            setCurrentTrackIdx(i => i + 1);
            playTrackAtIndex(currentTrackIdx + 1);
            return 0;
          } else {
            setClassPlaying(false);
            clearInterval(timerRef.current);
            toast.success('Clase terminada!');
            return 0;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [classPlaying, currentTrackIdx, tracks]);

  const isEditing = editSession !== null || tracks.length > 0 || sessionName;

  // Sessions list view
  if (!isEditing && !editSession) {
    return (
      <div data-testid="class-mode-view">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: 'Outfit' }}>Modo Clase</h1>
            <p className="text-sm text-[#B3B3B3] mt-1">Programa secuencias de canciones con transiciones automáticas</p>
          </div>
          <Button onClick={createNewSession} className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold" data-testid="create-class-btn">
            <Plus size={18} className="mr-2" />
            Nueva clase
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#1DB954]"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <Timer size={64} className="mx-auto text-[#535353] mb-4" />
            <p className="text-[#B3B3B3] mb-4">No tienes sesiones de clase</p>
            <Button onClick={createNewSession} className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold">
              Crear mi primera clase
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => (
              <div 
                key={session.session_id} 
                className="bg-[#181818] rounded-xl p-5 hover:bg-[#282828] transition-colors cursor-pointer group"
                onClick={() => openSession(session)}
                data-testid={`class-session-${session.session_id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white truncate">{session.name}</h3>
                    <p className="text-sm text-[#B3B3B3] mt-1">{session.tracks?.length || 0} canciones</p>
                    <p className="text-xs text-[#6A6A6A] mt-1">
                      {session.total_duration ? `${session.total_duration} min` : '--'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(session.session_id); }} className="text-[#B3B3B3] hover:text-[#ff6b6b]">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
                {/* Track previews */}
                <div className="flex gap-1 mt-3">
                  {(session.tracks || []).slice(0, 5).map((t, i) => (
                    <div key={i} className="w-8 h-8 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                      {t.album_image ? (
                        <img src={t.album_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MusicNote size={10} className="text-[#535353]" />
                        </div>
                      )}
                    </div>
                  ))}
                  {(session.tracks || []).length > 5 && (
                    <div className="w-8 h-8 rounded bg-[#282828] flex items-center justify-center text-xs text-[#B3B3B3]">
                      +{session.tracks.length - 5}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Session editor
  return (
    <div data-testid="class-editor">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={() => { setEditSession(null); setTracks([]); setSessionName(''); }} className="text-[#B3B3B3] hover:text-white flex-shrink-0">
            <X size={20} />
          </button>
          <Input
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-transparent border-0 text-xl sm:text-2xl font-bold text-white p-0 h-auto focus-visible:ring-0"
            placeholder="Nombre de la clase"
            data-testid="class-name-input"
          />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-[#B3B3B3]">
            {tracks.length} canciones &bull; {formatTime(getTotalTime())}
          </span>
          <Button onClick={saveSession} disabled={saving} className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold" data-testid="save-class-btn">
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Class Player Controls */}
      {tracks.length > 0 && (
        <div className="bg-gradient-to-r from-[#1DB954]/20 to-[#191414] rounded-xl p-4 sm:p-5 mb-6" data-testid="class-player-controls">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {classPlaying ? (
                <>
                  <button onClick={stopClass} className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors" data-testid="stop-class-btn">
                    <Stop size={24} weight="fill" className="text-white" />
                  </button>
                  <button onClick={skipToNext} className="text-white hover:text-[#1DB954]" data-testid="skip-next-btn">
                    <SkipForward size={24} weight="fill" />
                  </button>
                </>
              ) : (
                <button onClick={startClass} className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center hover:scale-105 transition-transform" data-testid="start-class-btn">
                  <Play size={24} weight="fill" className="text-black ml-0.5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-white font-bold text-sm sm:text-base">
                  {classPlaying ? `Reproduciendo: ${tracks[currentTrackIdx]?.name || ''}` : 'Iniciar clase'}
                </p>
                {classPlaying && (
                  <p className="text-xs text-[#B3B3B3]">
                    Track {currentTrackIdx + 1}/{tracks.length} &bull; {formatTime(trackElapsed)} / {formatTime(getTrackDuration(tracks[currentTrackIdx]))}
                  </p>
                )}
              </div>
            </div>
            
            {/* Transition duration */}
            <div className="hidden sm:flex items-center gap-2">
              <ArrowsClockwise size={16} className="text-[#B3B3B3]" />
              <span className="text-xs text-[#B3B3B3]">Transición:</span>
              <select
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(Number(e.target.value))}
                className="bg-[#282828] text-white text-xs rounded px-2 py-1 border-0"
              >
                {[1, 2, 3, 5, 8, 10].map(v => (
                  <option key={v} value={v}>{v}s</option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress bar for class */}
          {classPlaying && (
            <div className="mt-3">
              <div className="w-full bg-[#404040] rounded-full h-1.5">
                <div 
                  className="bg-[#1DB954] h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${(trackElapsed / Math.max(getTrackDuration(tracks[currentTrackIdx]), 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Track List */}
      <div className="space-y-2 mb-6">
        {tracks.map((track, idx) => (
          <div 
            key={`${track.mix_id || track.spotify_id}-${idx}`}
            className={`bg-[#181818] rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
              classPlaying && idx === currentTrackIdx ? 'ring-1 ring-[#1DB954] bg-[#1DB954]/5' : ''
            }`}
            data-testid={`class-track-${idx}`}
          >
            {/* Reorder + Cover */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0} className="text-[#6A6A6A] hover:text-white disabled:opacity-20 text-xs">▲</button>
                <button onClick={() => moveTrack(idx, 1)} disabled={idx === tracks.length - 1} className="text-[#6A6A6A] hover:text-white disabled:opacity-20 text-xs">▼</button>
              </div>
              <div className="w-12 h-12 rounded bg-[#282828] overflow-hidden flex-shrink-0">
                {track.type === 'spotify' && track.album_image ? (
                  <img src={track.album_image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {track.type === 'spotify' ? <SpotifyLogo size={18} className="text-[#1DB954]" /> : <MusicNote size={18} className="text-[#535353]" />}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 sm:w-48">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-white truncate">{track.name}</p>
                  {track.type === 'spotify' && <SpotifyLogo size={10} weight="fill" className="text-[#1DB954] flex-shrink-0" />}
                </div>
                <p className="text-xs text-[#B3B3B3] truncate">{track.artist}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap w-full sm:w-auto sm:ml-auto">
              {/* Duration control */}
              <div className="flex items-center gap-2">
                <Timer size={14} className="text-[#B3B3B3] flex-shrink-0" />
                <Input
                  type="number"
                  min={10}
                  max={600}
                  value={track.custom_duration || getDefaultDuration(track)}
                  onChange={(e) => updateTrack(idx, 'custom_duration', parseInt(e.target.value) || null)}
                  className="w-16 sm:w-20 h-8 bg-[#282828] border-0 text-center text-sm"
                  data-testid={`track-duration-${idx}`}
                />
                <span className="text-xs text-[#6A6A6A]">seg</span>
              </div>

              {/* Transition type */}
              <select
                value={track.transition}
                onChange={(e) => updateTrack(idx, 'transition', e.target.value)}
                className="bg-[#282828] text-white text-xs rounded px-2 py-1.5 border-0 h-8"
                data-testid={`track-transition-${idx}`}
              >
                {TRANSITIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <button onClick={() => removeTrack(idx)} className="text-[#B3B3B3] hover:text-[#ff6b6b] flex-shrink-0">
                <Trash size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add songs button */}
      <button 
        onClick={() => { setShowAddSongs(true); setAddQuery(''); }}
        className="w-full py-4 border-2 border-dashed border-[#282828] rounded-xl text-[#B3B3B3] hover:text-white hover:border-[#535353] transition-colors flex items-center justify-center gap-2"
        data-testid="class-add-songs-btn"
      >
        <Plus size={20} />
        <span>Agregar canciones</span>
      </button>

      {/* Add Songs Dialog */}
      <Dialog open={showAddSongs} onOpenChange={setShowAddSongs}>
        <DialogContent className="bg-[#282828] border-0 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Outfit' }}>Agregar canciones a la clase</DialogTitle>
          </DialogHeader>
          <div className="relative mt-2">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" size={18} />
            <Input autoFocus placeholder="Buscar..." value={addQuery} onChange={(e) => setAddQuery(e.target.value)} className="pl-10 bg-[#3E3E3E] border-0 rounded-full" data-testid="class-search-input" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => setAddTab('mixes')} className={`px-4 py-1.5 rounded-full text-sm font-medium ${addTab === 'mixes' ? 'bg-white text-black' : 'bg-[#3E3E3E] text-white'}`}>Mixes</button>
            <button onClick={() => setAddTab('spotify')} className={`px-4 py-1.5 rounded-full text-sm font-medium ${addTab === 'spotify' ? 'bg-white text-black' : 'bg-[#3E3E3E] text-white'}`}>
              <SpotifyLogo size={14} weight="fill" className="inline mr-1 text-[#1DB954]" />Spotify
            </button>
          </div>
          <div className="flex-1 overflow-y-auto mt-3 -mx-6 px-6" style={{ maxHeight: '50vh' }}>
            {addTab === 'mixes' ? (
              searchMixes.map(mix => (
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
                    <p className="text-xs text-[#B3B3B3] truncate">{mix.artist}</p>
                  </div>
                  <button onClick={() => addTrack(mix, 'mix')} className="px-3 py-1 rounded-full text-xs font-bold border border-white/30 text-white hover:bg-white/10">
                    Agregar
                  </button>
                </div>
              ))
            ) : (
              !addQuery.trim() ? (
                <p className="text-center text-[#B3B3B3] py-8 text-sm">Escribe para buscar en Spotify</p>
              ) : (
                searchSpotify.map(track => (
                  <div key={track.spotify_id} className="flex items-center gap-3 p-2 rounded hover:bg-white/10">
                    <div className="w-10 h-10 rounded bg-[#1a1a1a] overflow-hidden flex-shrink-0">
                      {track.album_image ? (
                        <img src={track.album_image_small || track.album_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><SpotifyLogo size={14} className="text-[#1DB954]" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{track.name}</p>
                      <p className="text-xs text-[#B3B3B3] truncate">{track.artist}</p>
                    </div>
                    <button onClick={() => addTrack(track, 'spotify')} className="px-3 py-1 rounded-full text-xs font-bold border border-white/30 text-white hover:bg-white/10">
                      Agregar
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
