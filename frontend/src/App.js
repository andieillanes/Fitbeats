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
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyPlayer, setSpotifyPlayer] = useState(null);
  const [spotifyDeviceId, setSpotifyDeviceId] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/spotify/token`);
      if (res.data.connected && res.data.access_token) {
        setSpotifyToken(res.data.access_token);
        setSpotifyConnected(true);
      }
    } catch { /* not connected */ }
  }, []);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  // Load Spotify SDK when token is available
  useEffect(() => {
    if (!spotifyToken) return;
    if (document.getElementById('spotify-sdk-script')) return;

    window.onSpotifyWebPlaybackSDKReady = () => setSdkReady(true);
    const script = document.createElement('script');
    script.id = 'spotify-sdk-script';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);
  }, [spotifyToken]);

  // Initialize player when SDK ready
  useEffect(() => {
    if (!sdkReady || !spotifyToken || spotifyPlayer) return;
    const player = new window.Spotify.Player({
      name: 'FitBeats Player',
      getOAuthToken: cb => cb(spotifyToken),
      volume: 0.8
    });
    player.addListener('ready', ({ device_id }) => {
      setSpotifyDeviceId(device_id);
    });
    player.addListener('not_ready', () => setSpotifyDeviceId(null));
    player.connect();
    setSpotifyPlayer(player);
    return () => { player.disconnect(); };
  }, [sdkReady, spotifyToken]);

  const playSpotifyTrack = async (uri) => {
    if (!spotifyToken || !spotifyDeviceId) return false;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${spotifyToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [uri] })
      });
      return true;
    } catch { return false; }
  };

  const pauseSpotify = async () => {
    if (spotifyPlayer) spotifyPlayer.pause();
  };

  const resumeSpotify = async () => {
    if (spotifyPlayer) spotifyPlayer.resume();
  };

  return (
    <SpotifyContext.Provider value={{
      spotifyToken, spotifyConnected, spotifyDeviceId, spotifyPlayer,
      playSpotifyTrack, pauseSpotify, resumeSpotify, checkConnection
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

  return (
    <PlayerContext.Provider value={{
      currentMix, playlist, queue, isPlaying, currentIndex, shuffle, repeat,
      playMix, addToQueue, playNext, playPrevious, togglePlay,
      toggleShuffle, toggleRepeat, stopPlaying, setIsPlaying
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
