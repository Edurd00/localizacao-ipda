'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 ${className}`} />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
      title={isDark ? 'Modo Claro' : 'Modo Escuro'}
      className={`relative inline-flex items-center justify-center w-9 h-9 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors duration-200 cursor-pointer ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        <Sun
          className={`w-4 h-4 transition-all duration-300 absolute ${
            isDark
              ? 'opacity-0 rotate-90 scale-0 text-amber-400'
              : 'opacity-100 rotate-0 scale-100 text-amber-500'
          }`}
        />
        <Moon
          className={`w-4 h-4 transition-all duration-300 absolute ${
            isDark
              ? 'opacity-100 rotate-0 scale-100 text-indigo-400'
              : 'opacity-0 -rotate-90 scale-0 text-indigo-600'
          }`}
        />
      </div>
    </button>
  );
}

export default ThemeToggle;
