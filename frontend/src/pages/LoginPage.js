import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { MusicNotes, Envelope, Lock, GoogleLogo } from '@phosphor-icons/react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      } else {
        setError(detail || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left side - Hero image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ 
          backgroundImage: `url(https://images.pexels.com/photos/14219616/pexels-photo-14219616.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)` 
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="flex items-center gap-3 mb-8">
            <MusicNotes size={48} weight="duotone" className="text-[#007AFF]" />
            <h1 className="text-4xl font-black tracking-tighter text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              FitBeats
            </h1>
          </div>
          <p className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            La música que mueve tu clase
          </p>
          <p className="text-[#A1A1AA] text-lg max-w-md">
            Accede a miles de mixes diseñados para fitness. Crea playlists personalizadas y lleva tus clases al siguiente nivel.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 bg-[#0A0A0A] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <MusicNotes size={40} weight="duotone" className="text-[#007AFF]" />
            <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              FitBeats
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Iniciar sesión
          </h2>
          <p className="text-[#A1A1AA] mb-8">
            Ingresa a tu cuenta para continuar
          </p>

          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] px-4 py-3 rounded-md mb-6" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                Email
              </label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={20} />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                  placeholder="tu@email.com"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={20} />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold py-3 rounded-md transition-colors"
              data-testid="login-submit-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Iniciando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#27272A]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#0A0A0A] text-[#71717A]">O continúa con</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full bg-[#1F1F1F] border-[#27272A] hover:bg-[#27272A] text-white font-semibold py-3 rounded-md transition-colors"
            data-testid="google-login-btn"
          >
            <GoogleLogo size={20} weight="bold" className="mr-2" />
            Google
          </Button>

          <p className="text-center mt-8 text-[#A1A1AA]">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[#007AFF] hover:text-[#3395FF] font-semibold" data-testid="register-link">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
