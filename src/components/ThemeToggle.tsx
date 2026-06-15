import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'light';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isLight) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
      } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
      }
    } catch (e) {}
  }, [isLight]);

  return (
    <button
      onClick={() => setIsLight(prev => !prev)}
      aria-label="Toggle light/dark theme"
      className="p-2 rounded-lg bg-glass border border-white/10 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/40 transition-all"
      title="Toggle theme"
    >
      {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
