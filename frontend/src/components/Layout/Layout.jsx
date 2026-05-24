import React from 'react';
import { useLocation } from 'react-router-dom';
import { LuSun, LuMoon } from 'react-icons/lu';
import { useTheme } from '../../theme';
import TextLogo from '../TextLogo/TextLogo.jsx';

const HIDDEN_PATHS = ['/notes', '/', '/login', '/signup'];

export default function Layout({ children }) {
  const { isDarkMode: dark, toggleTheme } = useTheme();
  const location = useLocation();
  const showHeader = !HIDDEN_PATHS.includes(location.pathname);

  return (
    <div className="min-h-screen bg-app text-fg">
      {showHeader && (
        <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-3 border-b border-app bg-card">
          <TextLogo />
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-app text-sm font-mono text-muted hover:text-fg hover:border-strong transition-colors"
          >
            {dark ? <LuSun size={15} /> : <LuMoon size={15} />}
            <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
          </button>
        </header>
      )}
      {children}
    </div>
  );
}
