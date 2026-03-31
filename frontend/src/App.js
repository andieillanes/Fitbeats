import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import SpotifyCallbackPage from './pages/SpotifyCallbackPage';
import SharedPlaylistPage from './pages/SharedPlaylistPage';
import MainLayout from './pages/MainLayout';
import AdminPage from './pages/AdminPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Configure axios defaults
axios.defaults.withCredentials = true;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Player Context
export const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};

// Auth Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setUser(response.data);
    return response.data;
  };

  const register = async (email, password, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name });
    setUser(response.data);
    return response.data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`);
    setUser(null);
  };

  const setUserData = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

// Spotify Context
export const SpotifyContext = createContext(null);
export const useSpotify = () => useContext(SpotifyContext);

function SpotifyProvider({ children }) {
  const { user } = useAuth();
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyPlayer, setSpotifyPlayer] = useState(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [spotifyPosition, setSpotifyPosition] = useState(0);
  const [spotifyDuration, setSpotifyDuration] = useState(0);
  const [spotifyIsPlaying, setSpotifyIsPlaying] = useState(false);
  const pollRef = React.useRef(null);
  const tokenRef = React.useRef(null);

  const checkConnection = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/spotify/token`);
      if (res.data.connected && res.data.access_token) {
        setSpotifyToken(res.data.access_token);
        tokenRef.current = res.data.access_token;
        setSpotifyConnected(true);
        return true;
      }
      setSpotifyConnected(false);
      return false;
    } catch {
      setSpotifyConnected(false);
      return false;
    }
  }, []);

  // Re-check Spotify connection whenever user auth changes
  useEffect(() => {
    if (user) {
      checkConnection();
    } else {
      setSpotifyToken(null);
      tokenRef.current = null;
      setSpotifyConnected(false);
    }
  }, [user, checkConnection]);

  // Load Spotify SDK when token is available
  useEffect(() => {
    if (!spotifyToken) return;
    if (document.getElementById('spotify-sdk-script')) {
      if (window.Spotify) setSdkReady(true);
      return;
    }
    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
    const script = document.createElement('script');
    script.id = 'spotify-sdk-script';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  }, [spotifyToken]);

  // Transfer playback to our Web SDK device
  const transferPlayback = async (deviceId, token) => {
    try {
      console.log('[FitBeats] Transferring playback to device:', deviceId);
      const resp = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: false })
      });
      if (resp.ok || resp.status === 204) {
        console.log('[FitBeats] Playback transferred successfully');
        return true;
      }
      const errText = await resp.text();
      console.warn('[FitBeats] Transfer response:', resp.status, errText);
      return false;
    } catch (e) {
      console.error('[FitBeats] Transfer exception:', e);
      return false;
    }
  };

  // Keep tokenRef in sync
  useEffect(() => { tokenRef.current = spotifyToken; }, [spotifyToken]);

  // Initialize player when SDK ready
  useEffect(() => {
    if (!sdkReady || !spotifyToken || spotifyPlayer) return;
    console.log('[FitBeats] Initializing Spotify Player...');
    const player = new window.Spotify.Player({
      name: 'FitBeats Player',
      getOAuthToken: async (cb) => {
        // Always fetch a fresh token so the SDK never uses an expired one
        try {
          const res = await axios.get(`${API}/spotify/token`);
          if (res.data.connected && res.data.access_token) {
            tokenRef.current = res.data.access_token;
            cb(res.data.access_token);
            return;
          }
        } catch { /* fallback below */ }
        cb(tokenRef.current);
      },
      volume: 0.8
    });
    player.addListener('ready', async ({ device_id }) => {
      console.log('[FitBeats] Spotify Player ready, device:', device_id);
      setSpotifyDeviceId(device_id);
      // Critical: Transfer playback to this device so audio routes here
      await transferPlayback(device_id, tokenRef.current);
    });
    player.addListener('not_ready', () => {
      console.log('[FitBeats] Spotify Player not ready');
      setSpotifyDeviceId(null);
    });
    player.addListener('player_state_changed', (state) => {
      if (state) {
        setSpotifyIsPlaying(!state.paused);
        setSpotifyPosition(state.position);
        setSpotifyDuration(state.duration);
      }
    });
    player.addListener('initialization_error', ({ message }) => console.error('[FitBeats] Spotify init error:', message));
    player.addListener('authentication_error', ({ message }) => console.error('[FitBeats] Spotify auth error (Premium required):', message));
    player.addListener('account_error', ({ message }) => console.error('[FitBeats] Spotify account error (Premium required):', message));
    player.connect().then(ok => console.log('[FitBeats] Spotify connect:', ok));
    setSpotifyPlayer(player);
    return () => { player.disconnect(); };
  }, [sdkReady, spotifyToken]);

  // Poll position when playing via SDK
  useEffect(() => {
    if (!spotifyPlayer || !spotifyIsPlaying) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const state = await spotifyPlayer.getCurrentState();
        if (state) {
          setSpotifyPosition(state.position);
          setSpotifyDuration(state.duration);
          setSpotifyIsPlaying(!state.paused);
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [spotifyPlayer, spotifyIsPlaying]);

  const playSpotifyTrack = async (uri) => {
    if (!tokenRef.current || !spotifyDeviceId) {
      console.log('[FitBeats] Cannot play - no token or device. Token:', !!tokenRef.current, 'Device:', spotifyDeviceId);
      return false;
    }
    try {
      // Get fresh token before playing
      try {
        const res = await axios.get(`${API}/spotify/token`);
        if (res.data.connected && res.data.access_token) {
          tokenRef.current = res.data.access_token;
          setSpotifyToken(res.data.access_token);
        }
      } catch { /* use existing token */ }

      const token = tokenRef.current;
      console.log('[FitBeats] Playing track:', uri, 'on device:', spotifyDeviceId);
      // Ensure our device is the active playback device before playing
      await transferPlayback(spotifyDeviceId, token);
      // Small delay to let Spotify activate the device
      await new Promise(resolve => setTimeout(resolve, 300));
      const resp = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
      });
      if (!resp.ok) {
        const err = await resp.text();
        console.error('[FitBeats] Spotify play error:', resp.status, err);
        // If 404 (no active device), try transfer + play in one step
        if (resp.status === 404 || resp.status === 502) {
          console.log('[FitBeats] Retrying with transfer+play...');
          await transferPlayback(spotifyDeviceId, token);
          await new Promise(resolve => setTimeout(resolve, 500));
          const retry = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris: [uri] })
          });
          if (retry.ok || retry.status === 204) {
            setSpotifyIsPlaying(true);
            return true;
          }
        }
        return false;
      }
      setSpotifyIsPlaying(true);
      return true;
    } catch (e) {
      console.error('[FitBeats] Spotify play exception:', e);
      return false;
    }
  };

  const pauseSpotify = async () => {
    if (spotifyPlayer) {
      await spotifyPlayer.pause();
      setSpotifyIsPlaying(false);
    }
  };

  const resumeSpotify = async () => {
    if (spotifyPlayer) {
      await spotifyPlayer.resume();
      setSpotifyIsPlaying(true);
    }
  };

  const seekSpotify = async (positionMs) => {
    if (spotifyPlayer) {
      await spotifyPlayer.seek(positionMs);
      setSpotifyPosition(positionMs);
    }
  };

  return (
    <SpotifyContext.Provider value={{
      spotifyToken, spotifyConnected, spotifyDeviceId, spotifyPlayer,
      spotifyPosition, spotifyDuration, spotifyIsPlaying,
      playSpotifyTrack, pauseSpotify, resumeSpotify, seekSpotify, checkConnection, transferPlayback
    }}>
      {children}
    </SpotifyContext.Provider>
  );
}

// Player Provider - supports both local mixes and Spotify tracks
function PlayerProvider({ children }) {
  const [currentMix, setCurrentMix] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [queue, setQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Shared audio ref and state for cross-component access (e.g. ClassModeView)
  const audioRef = React.useRef(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const getTrackId = (track) => track?.mix_id || track?.spotify_id || null;

  const playMix = (mix, mixList = []) => {
    setCurrentMix(mix);
    if (mixList.length > 0) {
      setPlaylist(mixList);
      setQueue(mixList);
      const id = getTrackId(mix);
      const idx = mixList.findIndex(m => getTrackId(m) === id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else {
      setPlaylist([mix]);
      setQueue([mix]);
      setCurrentIndex(0);
    }
    setIsPlaying(true);
  };

  const addToQueue = (mix) => {
    setQueue(prev => [...prev, mix]);
  };

  const playNext = () => {
    if (queue.length > 0 && currentIndex < queue.length - 1) {
      setCurrentMix(queue[currentIndex + 1]);
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    } else if (repeat && queue.length > 0) {
      setCurrentMix(queue[0]);
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  };

  const playPrevious = () => {
    if (queue.length > 0 && currentIndex > 0) {
      setCurrentMix(queue[currentIndex - 1]);
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const toggleShuffle = () => setShuffle(!shuffle);
  const toggleRepeat = () => setRepeat(!repeat);

  const stopPlaying = () => {
    setCurrentMix(null);
    setPlaylist([]);
    setQueue([]);
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // Volume control for transitions
  const setVolume = (vol) => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, vol));
  };

  const getVolume = () => audioRef.current?.volume ?? 0.8;

  // Seek the audio element
  const seekAudio = (timeSec) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeSec;
    }
  };

  return (
    <PlayerContext.Provider value={{
      currentMix, playlist, queue, isPlaying, currentIndex, shuffle, repeat,
      playMix, addToQueue, playNext, playPrevious, togglePlay,
      toggleShuffle, toggleRepeat, stopPlaying, setIsPlaying,
      audioRef, audioCurrentTime, setAudioCurrentTime, audioDuration, setAudioDuration,
      setVolume, getVolume, seekAudio
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

// Protected Route
function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Main App Router
function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/shared/:id" element={<SharedPlaylistPage />} />
      <Route path="/spotify-callback" element={
        <ProtectedRoute>
          <SpotifyCallbackPage />
        </ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin>
          <AdminPage />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SpotifyProvider>
          <PlayerProvider>
            <AppRouter />
          </PlayerProvider>
        </SpotifyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
