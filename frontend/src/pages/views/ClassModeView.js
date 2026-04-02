import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer, useSpotify, API } from '../../App';
import axios from 'axios';
import { 
  Play, Pause, Timer, Plus, Trash, MusicNote, SpotifyLogo, 
  MagnifyingGlass, ArrowsClockwise, X, PencilSimple,
  Lightning, Stop, SkipForward, Check
} from '@phosphor-icons/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';

const TRANSITIONS = [
  { value: 'crossfade', label: 'Crossfade', desc: 'Mezcla suave entre canciones' },
  { value: 'cut', label: 'Corte', desc: 'Cambio directo sin transición' },
  { value: 'fade_out', label: 'Fade Out', desc: 'La canción se desvanece al final' },
  { value: 'fade_in', label: 'Fade In', desc: 'La siguiente canción aparece gradualmente' },
];

export default function ClassModeView() {
  const navigate = useNavigate();
  const { playMix, currentMix, isPlaying, togglePlay, setIsPlaying, audioRef, audioCurrentTime, setVolume, getVolume } = usePlayer();
  const spotify = useSpotify();
  
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [editSession, setEditSession] = useState(null);
  const [sessionName, setSessionName] = useState('');
  const [tracks, setTracks] = useState([]);
  const [transitionDuration, setTransitionDuration] = useState(3);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [addTab, setAddTab] = useState('mixes');
  const [searchMixes, setSearchMixes] = useState([]);
  const [searchSpotify, setSearchSpotify] = useState([]);
  const [classPlaying, setClassPlaying] = useState(false);
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [trackElapsed, setTrackElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  
  const progressRafRef = useRef(null);
  const transitionRef = useRef(null);
  const savedVolumeRef = useRef(0.8);
  const advancingRef = useRef(false);
  const spotifyPositionRef = useRef(0);

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    spotifyPositionRef.current = spotify?.spotifyPosition || 0;
  }, [spotify?.spotifyPosition]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/class-sessions`);
      setSessions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

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
    if (!seconds || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTotalTime = () => tracks.reduce((acc, t) => acc + getTrackDuration(t), 0);

  const getDefaultDuration = (track) => {
    if (track.type === 'spotify') return Math.floor((track.original_duration || 0) / 1000);
    return track.original_duration || 240;
  };

  const getTrackDuration = (track) => track.custom_duration || getDefaultDuration(track);

  const startRename = (e, session) => {
    e.stopPropagation();
    setRenamingId(session.session_id);
    setRenameValue(session.name);
  };

  const confirmRename = async (e) => {
    e.stopPropagation();
    if (!renameValue.trim()) return;
    try {
      await axios.put(`${API}/class-sessions/${renamingId}`, { name: renameValue.trim() });
      toast.success('Nombre actualizado');
      fetchSessions();
    } catch { toast.error('Error al renombrar'); }
    setRenamingId(null);
  };

  const cancelRename = (e) => {
    e.stopPropagation();
    setRenamingId(null);
  };

  const createNewSession = () => {
    setEditSession(null);
    setSessionName('Nueva clase');
    setTracks([]);
    setTransitionDuration(3);
  };

  const openSession = async (session) => {
    if (renamingId) return;
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
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  const deleteSession = async (id) => {
    try {
      await axios.delete(`${API}/class-sessions/${id}`);
      toast.success('Sesión eliminada');
      if (editSession === id) { setEditSession(null); setTracks([]); }
      fetchSessions();
    } catch { toast.error('Error al eliminar'); }
  };

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
      audio_url: type === 'mix' ? item.audio_url : undefined,
      custom_duration: null,
      transition: 'crossfade',
    };
    setTracks(prev => [...prev, newTrack]);
    toast.success(`"${item.name}" agregado`);
  };

  const removeTrack = (idx) => setTracks(prev => prev.filter((_, i) => i !== idx));
  const updateTrack = (idx, field, value) => setTracks(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  const moveTrack = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tracks.length) return;
    const newTracks = [...tracks];
    [newTracks[idx], newTracks[newIdx]] = [newTracks[newIdx], newTracks[idx]];
    setTracks(newTracks);
  };

  const fadeVolume = (from, to, durationMs, onDone) => {
    if (transitionRef.current) clearInterval(transitionRef.current);
    const steps = 20;
    const stepTime = durationMs / steps;
    const stepSize = (to - from) / steps;
    let current = from;
    let step = 0;
    setTransitioning(true);
    transitionRef.current = setInterval(() => {
      step++;
      current += stepSize;
      setVolume(Math.max(0, Math.min(1, current)));
      if (step >= steps) {
        clearInterval(transitionRef.current);
        transitionRef.current = null;
        setVolume(to);
        setTransitioning(false);
        if (onDone) onDone();
      }
    }, stepTime);
  };

  const performTransition = useCallback((fromTrack, toIdx) => {
    if (advancingRef.current) return;
    advancingRef.current = true;

    const transition = fromTrack?.transition || 'cut';
    const durMs = transitionDuration * 1000;

    const switchToNext = () => {
      setCurrentTrackIdx(toIdx);
      setTrackElapsed(0);
      const nextTrack = tracks[toIdx];
      if (nextTrack) {
        const trackData = {
          ...nextTrack,
          type: nextTrack.type,
          mix_id: nextTrack.mix_id,
          spotify_id: nextTrack.spotify_id,
          uri: nextTrack.uri,
        };
        playMix(trackData, tracks.map(t => ({
          ...t, type: t.type, mix_id: t.mix_id, spotify_id: t.spotify_id, uri: t.uri
        })));
      }
      setTimeout(() => { advancingRef.current = false; }, 2000);
    };

    switch (transition) {
      case 'fade_out':
        savedVolumeRef.current = getVolume();
        fadeVolume(savedVolumeRef.current, 0, durMs, () => {
          switchToNext();
          setTimeout(() => setVolume(savedVolumeRef.current), 500);
        });
        break;
      case 'fade_in':
        savedVolumeRef.current = getVolume();
        setVolume(0);
        switchToNext();
        setTimeout(() => { fadeVolume(0, savedVolumeRef.current, durMs); }, 500);
        break;
      case 'crossfade':
        savedVolumeRef.current = getVolume();
        fadeVolume(savedVolumeRef.current, 0, durMs / 2, () => {
          switchToNext();
          setTimeout(() => { fadeVolume(0, savedVolumeRef.current, durMs / 2); }, 500);
        });
        break;
      case 'cut':
      default:
        switchToNext();
        break;
    }
  }, [tracks, transitionDuration, playMix, setVolume, getVolume]);

  const startClass = () => {
    if (tracks.length === 0) return;
    advancingRef.current = false;
    setClassPlaying(true);
    setCurrentTrackIdx(0);
    setTrackElapsed(0);
    savedVolumeRef.current = getVolume();
    const track = tracks[0];
    if (!track) return;
    const trackData = { ...track, type: track.type, mix_id: track.mix_id, spotify_id: track.spotify_id, uri: track.uri };
    playMix(trackData, tracks.map(t => ({ ...t, type: t.type, mix_id: t.mix_id, spotify_id: t.spotify_id, uri: t.uri })));
  };

  const stopClass = () => {
    setClassPlaying(false);
    setCurrentTrackIdx(0);
    setTrackElapsed(0);
    advancingRef.current = false;
    if (transitionRef.current) { clearInterval(transitionRef.current); transitionRef.current = null; }
    if (progressRafRef.current) { cancelAnimationFrame(progressRafRef.current); progressRafRef.current = null; }
    setVolume(savedVolumeRef.current || 0.8);
    setTransitioning(false);
    setIsPlaying(false);
  };

  const skipToNext = () => {
    advancingRef.current = false;
    if (currentTrackIdx < tracks.length - 1) {
      performTransition(tracks[currentTrackIdx], currentTrackIdx + 1);
    } else {
      stopClass();
      toast.success('Clase terminada!');
    }
  };

  const tracksRef = useRef(tracks);
  const currentTrackIdxRef = useRef(currentTrackIdx);
  const classPlayingRef = useRef(classPlaying);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { currentTrackIdxRef.current = currentTrackIdx; }, [currentTrackIdx]);
  useEffect(() => { classPlayingRef.current = classPlaying; }, [classPlaying]);

  useEffect(() => {
    if (!classPlaying) {
      if (progressRafRef.current) { cancelAnimationFrame(progressRafRef.current); progressRafRef.current = null; }
      return;
    }

    const update = () => {
      if (!classPlayingRef.current) return;

      const idx = currentTrackIdxRef.current;
      const track = tracksRef.current[idx];
      if (!track) { progressRafRef.current = requestAnimationFrame(update); return; }

      const maxDuration = getTrackDuration(track);
      let realTime = 0;

      if (track.type === 'spotify') {
        const pos = spotifyPositionRef.current;
        if (pos && pos > 0) {
          realTime = pos / 1000;
        }
      } else if (audioRef?.current) {
        realTime = audioRef.current.currentTime || 0;
      }

      setTrackElapsed(Math.min(realTime, maxDuration));

      if (!advancingRef.current && maxDuration > 0 && realTime > 0) {
        const transitionTime = track.transition !== 'cut' ? transitionDuration : 0;
        const triggerPoint = maxDuration - transitionTime;

        if (realTime >= triggerPoint) {
          if (idx < tracksRef.current.length - 1) {
            performTransition(track, idx + 1);
          } else {
            advancingRef.current = true;
            setClassPlaying(false);
            setIsPlaying(false);
            toast.success('Clase terminada!');
            setTimeout(() => { advancingRef.current = false; }, 1000);
          }
        }
      }

      progressRafRef.current = requestAnimationFrame(update);
    };

    progressRafRef.current = requestAnimationFrame(update);
    return () => { if (progressRafRef.current) { cancelAnimationFrame(progressRafRef.current); progressRafRef.current = null; } };
  }, [classPlaying, transitionDuration, performTransition]);

  const isEditing = editSession !== null || tracks.length > 0 || sessionName;

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
                    {renamingId === session.session_id ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(e); if (e.key === 'Escape') cancelRename(e); }}
                          className="bg-[#282828] border-[#404040] text-white h-8 text-sm"
                          data-testid="rename-class-input"
                        />
                        <button onClick={confirmRename} className="text-[#1DB954] hover:text-[#1ed760]"><Check size={16} weight="bold" /></button>
                        <button onClick={cancelRename} className="text-[#B3B3B3] hover:text-white"><X size={16} /></button>
                      </div>
                    ) : (
                      <h3 className="font-bold text-white truncate">{session.name}</h3>
                    )}
                    <p className="text-sm text-[#B3B3B3] mt-1">{session.tracks?.length || 0} canciones</p>
                    <p className="text-xs text-[#6A6A6A] mt-1">
                      {session.total_duration ? `${session.total_duration} min` : '--'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => startRename(e, session)} className="text-[#B3B3B3] hover:text-white" data-testid={`rename-class-${session.session_id}`}>
                      <PencilSimple size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(session.session_id); }} className="text-[#B3B3B3] hover:text-[#ff6b6b]">
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
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

  return (
    <div data-testid="class-editor">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={() => { setEditSession(null); setTracks([]); setSessionName(''); stopClass(); }} className="text-[#B3B3B3] hover:text-white flex-shrink-0">
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

      {tracks.length > 0 && (
        <div className="bg-gradient-to-r from-[#1DB954]/20 to-[#191414] rounded-xl p-4 sm:p-5 mb-6" data-testid="class-player-controls">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {classPlaying ? (
                <>
                  <button onClick={stopClass} className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-400 transition-colors" data-testid="stop-class-btn">
                    <Stop size={24} weight="fill" className="text-white" />
                  </button>
                  <button onClick={() => togglePlay()} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30" data-testid="pause-class-btn">
                    {isPlaying ? <Pause size={16} weight="fill" className="text-white" /> : <Play size={16} weight="fill" className="text-white ml-0.5" />}
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
                    {transitioning && <span className="ml-2 text-[#1DB954]">(transición...)</span>}
                  </p>
                )}
              </div>
            </div>
            
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

          {classPlaying && (
            <div className="mt-3">
              <input
                type="range"
                min="0"
                max={getTrackDuration(tracks[currentTrackIdx]) || 1}
                step="0.1"
                value={trackElapsed}
                onChange={(e) => {
                  const newTime = parseFloat(e.target.value);
                  setTrackElapsed(newTime);
                  if (tracks[currentTrackIdx]?.type === 'spotify' && spotify?.seekSpotify) {
                    spotify.seekSpotify(newTime * 1000);
                  } else if (audioRef?.current) {
                    audioRef.current.currentTime = newTime;
                  }
                }}
                className="w-full h-1.5 cursor-pointer appearance-none rounded-full"
                style={{
                  background: `linear-gradient(to right, #1DB954 ${(trackElapsed / Math.max(getTrackDuration(tracks[currentTrackIdx]), 1)) * 100}%, #404040 ${(trackElapsed / Math.max(getTrackDuration(tracks[currentTrackIdx]), 1)) * 100}%)`
                }}
                data-testid="class-progress-bar"
              />
              <div className="flex mt-2 gap-0.5">
                {tracks.map((t, i) => {
                  const dur = getTrackDuration(t);
                  const total = getTotalTime();
                  const pct = total > 0 ? (dur / total) * 100 : 0;
                  return (
                    <div 
                      key={i} 
                      className={`h-1.5 rounded-full cursor-pointer transition-colors ${
                        i < currentTrackIdx ? 'bg-[#1DB954]' : i === currentTrackIdx ? 'bg-[#1DB954]/50' : 'bg-[#404040]'
                      }`}
                      style={{ width: `${pct}%` }}
                      onClick={() => {
                        advancingRef.current = false;
                        setCurrentTrackIdx(i);
                        setTrackElapsed(0);
                        const track = tracks[i];
                        if (track) {
                          playMix(
                            { ...track, type: track.type, mix_id: track.mix_id, spotify_id: track.spotify_id, uri: track.uri },
                            tracks.map(t => ({ ...t, type: t.type, mix_id: t.mix_id, spotify_id: t.spotify_id, uri: t.uri }))
                          );
                        }
                      }}
                      title={`${t.name} (${formatTime(dur)}) — ${TRANSITIONS.find(tr => tr.value === t.transition)?.label || 'Corte'}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 mb-6">
        {tracks.map((track, idx) => (
          <div 
            key={`${track.mix_id || track.spotify_id}-${idx}`}
            className={`bg-[#181818] rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${
              classPlaying && idx === currentTrackIdx ? 'ring-1 ring-[#1DB954] bg-[#1DB954]/5' : ''
            }`}
            data-testid={`class-track-${idx}`}
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveTrack(idx, -1)} disabled={idx === 0} className="text-[#6A6A6A] hover:text-white disabled:opacity-20 text-xs">&#9650;</button>
                <button onClick={() => moveTrack(idx, 1)} disabled={idx === tracks.length - 1} className="text-[#6A6A6A] hover:text-white disabled:opacity-20 text-xs">&#9660;</button>
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

            <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap w-full sm:w-auto sm:ml-auto">
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

      <button 
        onClick={() => { setShowAddSongs(true); setAddQuery(''); }}
        className="w-full py-4 border-2 border-dashed border-[#282828] rounded-xl text-[#B3B3B3] hover:text-white hover:border-[#535353] transition-colors flex items-center justify-center gap-2"
        data-testid="class-add-songs-btn"
      >
        <Plus size={20} />
        <span>Agregar canciones</span>
      </button>

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
                    {mix.cover_url ? (
                      <img src={mix.cover_url} alt="" className="w-full h-full object-cover" />
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
