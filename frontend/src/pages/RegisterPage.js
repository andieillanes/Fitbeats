import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { MusicNotes, Envelope, Lock, User, GoogleLogo } from '@phosphor-icons/react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
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

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map(e => e.msg || JSON.stringify(e)).join(' '));
      } else {
        setError(detail || 'Error al registrarse');
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
    <div className="min-h-screen flex" data-testid="register-page">
      {/* Left side - Hero image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ 
          backgroundImage: `url(https://images.pexels.com/photos/14912840/pexels-photo-14912840.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)` 
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
            Únete a la comunidad
          </p>
          <p className="text-[#A1A1AA] text-lg max-w-md">
            Miles de instructores ya confían en FitBeats para crear las mejores experiencias musicales en sus clases.
          </p>
        </div>
      </div>

      {/* Right side - Register form */}
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
            Crear cuenta
          </h2>
          <p className="text-[#A1A1AA] mb-8">
            Regístrate para comenzar
          </p>

          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] px-4 py-3 rounded-md mb-6" data-testid="register-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                Nombre
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={20} />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                  placeholder="Tu nombre"
                  required
                  data-testid="register-name-input"
                />
              </div>
            </div>

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
                  data-testid="register-email-input"
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
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#A1A1AA] mb-2 block">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={20} />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-[#1F1F1F] border-[#27272A] focus:border-[#007AFF] text-white placeholder:text-[#71717A]"
                  placeholder="••••••••"
                  required
                  data-testid="register-confirm-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#007AFF] hover:bg-[#3395FF] text-white font-bold py-3 rounded-md transition-colors mt-2"
              data-testid="register-submit-btn"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                  Registrando...
                </span>
              ) : (
                'Crear cuenta'
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
            data-testid="google-register-btn"
          >
            <GoogleLogo size={20} weight="bold" className="mr-2" />
            Google
          </Button>

          <p className="text-center mt-8 text-[#A1A1AA]">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#007AFF] hover:text-[#3395FF] font-semibold" data-testid="login-link">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
