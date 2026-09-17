'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-9 h-9 shrink-0" />;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-zinc-200 dark:border-slate-800 bg-zinc-100 dark:bg-slate-800 text-zinc-600 dark:text-slate-300 hover:bg-zinc-200 dark:hover:bg-slate-700 transition-all shrink-0 flex items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer"
      title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
      aria-label="Alternar Tema"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200 fill-slate-700 dark:fill-slate-200 shrink-0" />
      )}
    </button>
  );
}
