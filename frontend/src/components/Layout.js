import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  MusicNotes, House, MusicNote, ListPlus, 
  Gear, SignOut, User 
} from '@phosphor-icons/react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Toaster } from './ui/sonner';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: House },
    { path: '/catalog', label: 'Catálogo', icon: MusicNote },
    { path: '/playlists', label: 'Playlists', icon: ListPlus },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: Gear });
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="glass-header border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
              <MusicNotes size={32} weight="duotone" className="text-[#007AFF]" />
              <span className="text-xl font-black tracking-tighter text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                FitBeats
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#007AFF] text-white'
                        : 'text-[#A1A1AA] hover:text-white hover:bg-[#1F1F1F]'
                    }`}
                    data-testid={`nav-${item.path.replace('/', '')}`}
                  >
                    <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 text-[#A1A1AA] hover:text-white hover:bg-[#1F1F1F]"
                  data-testid="user-menu-btn"
                >
                  <div className="w-8 h-8 rounded-full bg-[#007AFF] flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:block font-semibold">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#141414] border-[#27272A] w-56">
                <div className="px-3 py-2">
                  <p className="font-semibold text-white">{user?.name}</p>
                  <p className="text-sm text-[#71717A]">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs uppercase tracking-[0.2em] font-bold text-[#007AFF]">
                    {user?.role}
                  </span>
                </div>
                <DropdownMenuSeparator className="bg-[#27272A]" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-[#FF3B30] hover:bg-[#FF3B30]/10 cursor-pointer"
                  data-testid="logout-btn"
                >
                  <SignOut size={18} className="mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-[#27272A]">
          <div className="flex justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-semibold ${
                    isActive ? 'text-[#007AFF]' : 'text-[#71717A]'
                  }`}
                  data-testid={`mobile-nav-${item.path.replace('/', '')}`}
                >
                  <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#141414',
            border: '1px solid #27272A',
            color: '#FFFFFF',
          },
        }}
      />
    </div>
  );
}
