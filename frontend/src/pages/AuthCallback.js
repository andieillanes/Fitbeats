import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '../App';
import axios from 'axios';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUserData } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const sessionId = params.get('session_id');

      if (!sessionId) {
        navigate('/login');
        return;
      }

      try {
        // Exchange session_id with backend
        const response = await axios.post(`${API}/auth/google/session`, {
          session_id: sessionId
        });
        
        setUserData(response.data);
        if (response.data.access_token) {
  localStorage.setItem('fitbeats_token', response.data.access_token);
  axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
}
        
        // Clear the hash and navigate
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login');
      }
    };

    processAuth();
  }, [navigate, setUserData]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center" data-testid="auth-callback">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#007AFF] mx-auto mb-4"></div>
        <p className="text-[#A1A1AA]">Autenticando...</p>
      </div>
    </div>
  );
}
