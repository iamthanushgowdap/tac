
"use client";

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { cn } from '@/lib/utils';

export function ThemeToggleButton() {
  const [theme, setTheme] = useState('light'); 

  useEffect(() => {
    // On mount, read the theme from localStorage or system preference
    const savedTheme = localStorage.getItem('color-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      const initialTheme = systemPrefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      localStorage.setItem('color-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('color-theme', newTheme);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      suppressHydrationWarning
      className="relative overflow-hidden w-14 h-8 rounded-full flex items-center justify-between px-1.5"
    >
      <div className={cn(
        "absolute left-1 transition-transform duration-300 ease-in-out",
        theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
      )}>
        {theme === 'light' ? 
            <Sun className="h-5 w-5 text-yellow-500" /> : 
            <Moon className="h-5 w-5 text-slate-400" />}
      </div>
    </Button>
  );
}
