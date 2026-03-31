import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSpotify, API } from '../App';
import axios from 'axios';

export default function SpotifyCallbackPage() {
  const navigate = useNavigate();
  const { checkConnection } = useSpotify();
  const [status, setStatus] = useState('Conectando con Spotify...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      setStatus('Error al conectar con Spotify');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    if (code) {
      const exchangeCode = async () => {
        try {
          const redirectUri = `${window.location.origin}/spotify-callback`;
          await axios.post(`${API}/spotify/callback`, { code, redirect_uri: redirectUri });
          setStatus('Spotify conectado exitosamente!');
          await checkConnection();
          setTimeout(() => navigate('/'), 1500);
        } catch (err) {
          setStatus('Error al conectar. Intenta de nuevo.');
          setTimeout(() => navigate('/'), 2000);
        }
      };
      exchangeCode();
    } else {
      navigate('/');
    }
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center" data-testid="spotify-callback">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1DB954] mx-auto mb-4"></div>
        <p className="text-white text-lg">{status}</p>
      </div>
    </div>
  );
}
