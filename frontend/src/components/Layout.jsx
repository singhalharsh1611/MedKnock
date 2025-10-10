import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, LogOut, Sparkles, BookOpen, BarChart3, Scale, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { useAuth } from '@/contexts/AuthContext';

export const Layout = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, token, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (!token) return <Navigate to="/login" replace />;

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { path: '/grimoire', label: 'My Grimoire', icon: BookOpen },
    { path: '/compare', label: 'Compare', icon: Scale },
    { path: '/stats', label: 'Statistics', icon: BookOpen },
    { path: '/reports', label: 'Reports', icon: BookOpen },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    // THE FIX IS HERE: Changed min-h-screen to h-screen and added overflow-hidden
    <div className="flex h-screen overflow-hidden bg-muted/40">
      {/* 1. Sidebar (will now remain fixed) */}
      <aside
        className={`bg-background border-r flex flex-col z-40 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 border-b px-4">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className={`text-xl font-bold ml-2 ${!isSidebarOpen && 'hidden'}`}>MedKnock</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-grow p-2 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path}>
              <Button
                variant={isActive(path) ? 'secondary' : 'ghost'}
                className={`w-full justify-start h-12 ${!isSidebarOpen && 'justify-center'}`}
              >
                <Icon className="h-5 w-5" />
                <span className={`ml-4 ${!isSidebarOpen && 'hidden'}`}>{label}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {/* Footer with User Controls and Collapse Button */}
        <div className="border-t p-2">
          {/* User Profile */}
          <div
            className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-muted ${!isSidebarOpen && 'justify-center'}`}
            onClick={() => navigate('/profile')}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photo || 'https://github.com/shadcn.png'} alt="Avatar" />
              <AvatarFallback>{user?.firstName && user.firstName[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className={`ml-3 ${!isSidebarOpen && 'hidden'}`}>
              <p className="font-semibold text-sm">{user?.firstName}</p>
              <p className="text-xs text-muted-foreground">View Profile</p>
            </div>
          </div>
          {/* Theme and Logout Buttons */}
          <div className={`mt-2 space-y-1 ${!isSidebarOpen && 'hidden'}`}>
             <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
               {theme === 'light' ? <Moon className="h-5 w-5 mr-4"/> : <Sun className="h-5 w-5 mr-4"/>}
                Toggle Theme
             </Button>
             <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-500" onClick={logout}>
               <LogOut className="h-5 w-5 mr-4" />
                Logout
             </Button>
          </div>
          {/* Collapse Button */}
          <Button
            variant="outline"
            size="icon"
            className="w-full mt-2"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <ChevronLeft
              className={`h-5 w-5 transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`}
            />
          </Button>
        </div>
      </aside>

      {/* 2. Main Content Area (will now scroll independently) */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
};