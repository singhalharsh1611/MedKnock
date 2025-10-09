import React from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, LogOut, Sparkles, BookOpen, BarChart3, Scale } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { useAuth } from '@/contexts/AuthContext';

export const Layout = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, token, user } = useAuth();

  if (!token) return <Navigate to="/login" replace />;
  // console.log(user);

 const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/grimoire', label: 'My Grimoire', icon: BookOpen },
  { path: '/compare', label: 'Compare', icon: Scale },
  { path: '/stats', label: 'Statistics', icon: BookOpen },
  { path: '/reports', label: 'Reports', icon: BookOpen }, // New Reports page
];


  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="grimoire-header shadow-lg">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-white elixir-glow" />
              <h1 className="text-2xl font-bold text-white hidden sm:block">
                MedKnock
              </h1>
              <span className="text-white/80 text-sm hidden md:inline">
                Alchemist's Grimoire
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="text-white hover:bg-white/20"
              >
                {theme === "light" ? (
                  <Moon className="h-5 w-5" />
                ) : (
                  <Sun className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
             
              <Avatar
                className="cursor-pointer h-10 w-10 rounded-full overflow-hidden"
                onClick={() => navigate("/profile")}
              >
                <AvatarImage
                  src={
                    user?.photo ||
                    "https://cdn.jsdelivr.net/gh/shadcn/ui/public/avatar.png"
                  }
                  alt="User Avatar"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <AvatarFallback>
                  
                  
                  {user?.firstName && user.firstName[0].toUpperCase()}
                 
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link key={path} to={path}>
                <Button
                  variant={isActive(path) ? "default" : "ghost"}
                  className="h-10 sm:h-12 px-4 flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
