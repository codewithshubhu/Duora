import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeConfig } from '../types';

export const THEMES: ThemeConfig[] = [
  {
    id: 'royal-violet-light',
    name: 'Royal Violet Light (Default)',
    isDark: false,
    colors: {
      primary: '#7057E8',
      primaryHover: '#5B42D6',
      background: '#F7F7FB',
      surface: '#FFFFFF',
      surfaceHover: '#F2F0FC',
      card: '#FFFFFF',
      border: '#E8E5F7',
      text: '#191824',
      textMuted: '#68647E',
      lilac: '#EDE8FF',
      accent: '#7057E8',
      bubbleSender: '#7057E8',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#FFFFFF',
      bubbleReceiverText: '#191824',
    }
  },
  {
    id: 'royal-violet-dark',
    name: 'Royal Violet Dark',
    isDark: true,
    colors: {
      primary: '#8B72FF',
      primaryHover: '#A390FF',
      background: '#12111A',
      surface: '#1A1826',
      surfaceHover: '#232033',
      card: '#1F1C2E',
      border: '#2C2744',
      text: '#F4F2FF',
      textMuted: '#9B96B5',
      lilac: '#2A224D',
      accent: '#8B72FF',
      bubbleSender: '#7057E8',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#232033',
      bubbleReceiverText: '#F4F2FF',
    }
  },
  {
    id: 'obsidian-midnight',
    name: 'Obsidian Midnight',
    isDark: true,
    colors: {
      primary: '#6C5CE7',
      primaryHover: '#8273F8',
      background: '#0B0B0E',
      surface: '#14141A',
      surfaceHover: '#1D1D26',
      card: '#16161F',
      border: '#242433',
      text: '#F0F0F5',
      textMuted: '#84849E',
      lilac: '#1E1B38',
      accent: '#6C5CE7',
      bubbleSender: '#6C5CE7',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#1D1D28',
      bubbleReceiverText: '#F0F0F5',
    }
  },
  {
    id: 'cyber-lilac',
    name: 'Cyber Lilac',
    isDark: true,
    colors: {
      primary: '#A855F7',
      primaryHover: '#BC78FF',
      background: '#0D0A14',
      surface: '#171224',
      surfaceHover: '#221B35',
      card: '#1C162E',
      border: '#2E234B',
      text: '#FAF5FF',
      textMuted: '#9E8EB8',
      lilac: '#321D54',
      accent: '#C084FC',
      bubbleSender: '#9333EA',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#221B35',
      bubbleReceiverText: '#FAF5FF',
    }
  },
  {
    id: 'deep-indigo',
    name: 'Deep Indigo',
    isDark: true,
    colors: {
      primary: '#4F46E5',
      primaryHover: '#6366F1',
      background: '#0F172A',
      surface: '#1E293B',
      surfaceHover: '#2A374E',
      card: '#1E293B',
      border: '#334155',
      text: '#F8FAFC',
      textMuted: '#94A3B8',
      lilac: '#1E1B4B',
      accent: '#818CF8',
      bubbleSender: '#4F46E5',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#273549',
      bubbleReceiverText: '#F8FAFC',
    }
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    isDark: true,
    colors: {
      primary: '#059669',
      primaryHover: '#10B981',
      background: '#041F1A',
      surface: '#0B2D26',
      surfaceHover: '#123D34',
      card: '#0D352D',
      border: '#154B40',
      text: '#ECFDF5',
      textMuted: '#84BCAE',
      lilac: '#064235',
      accent: '#34D399',
      bubbleSender: '#059669',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#123D34',
      bubbleReceiverText: '#ECFDF5',
    }
  },
  {
    id: 'rose-dusk',
    name: 'Rose Dusk',
    isDark: true,
    colors: {
      primary: '#E11D48',
      primaryHover: '#F43F5E',
      background: '#190E14',
      surface: '#24141C',
      surfaceHover: '#331B27',
      card: '#2A1722',
      border: '#452234',
      text: '#FFF1F2',
      textMuted: '#B88A9D',
      lilac: '#3B1828',
      accent: '#FB7185',
      bubbleSender: '#E11D48',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#331B27',
      bubbleReceiverText: '#FFF1F2',
    }
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    isDark: true,
    colors: {
      primary: '#D97706',
      primaryHover: '#F59E0B',
      background: '#18140B',
      surface: '#241F13',
      surfaceHover: '#332C1B',
      card: '#292315',
      border: '#443A24',
      text: '#FFFBEB',
      textMuted: '#B5A683',
      lilac: '#382B10',
      accent: '#FBBF24',
      bubbleSender: '#D97706',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#332C1B',
      bubbleReceiverText: '#FFFBEB',
    }
  },
  {
    id: 'nordic-slate',
    name: 'Nordic Slate',
    isDark: true,
    colors: {
      primary: '#0284C7',
      primaryHover: '#38BDF8',
      background: '#0B132B',
      surface: '#14213D',
      surfaceHover: '#1D2E54',
      card: '#172545',
      border: '#293C68',
      text: '#F0F9FF',
      textMuted: '#8BA1C9',
      lilac: '#11294F',
      accent: '#38BDF8',
      bubbleSender: '#0284C7',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#1D2E54',
      bubbleReceiverText: '#F0F9FF',
    }
  },
  {
    id: 'velvet-mauve',
    name: 'Velvet Mauve',
    isDark: true,
    colors: {
      primary: '#C026D3',
      primaryHover: '#D946EF',
      background: '#160B1E',
      surface: '#22132F',
      surfaceHover: '#301B42',
      card: '#261534',
      border: '#42225B',
      text: '#FAF5FF',
      textMuted: '#AD89C7',
      lilac: '#381652',
      accent: '#E879F9',
      bubbleSender: '#C026D3',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#301B42',
      bubbleReceiverText: '#FAF5FF',
    }
  },
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    isDark: true,
    colors: {
      primary: '#DC2626',
      primaryHover: '#EF4444',
      background: '#190A0A',
      surface: '#261212',
      surfaceHover: '#361A1A',
      card: '#2B1414',
      border: '#4B2020',
      text: '#FEF2F2',
      textMuted: '#BA8989',
      lilac: '#3E1515',
      accent: '#F87171',
      bubbleSender: '#DC2626',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#361A1A',
      bubbleReceiverText: '#FEF2F2',
    }
  },
  {
    id: 'pure-minimalist',
    name: 'Pure Minimalist Light',
    isDark: false,
    colors: {
      primary: '#2563EB',
      primaryHover: '#1D4ED8',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceHover: '#F1F5F9',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      textMuted: '#64748B',
      lilac: '#EFF6FF',
      accent: '#3B82F6',
      bubbleSender: '#2563EB',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#FFFFFF',
      bubbleReceiverText: '#0F172A',
    }
  }
];

export type WallpaperStyle = 'clean' | 'constellation' | 'geometric' | 'waves' | 'dots';

interface ThemeContextType {
  theme: ThemeConfig;
  setThemeId: (id: string) => void;
  wallpaper: WallpaperStyle;
  setWallpaper: (wp: WallpaperStyle) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<string>(() => {
    return localStorage.getItem('duora_theme') || 'royal-violet-light';
  });
  const [wallpaper, setWallpaperState] = useState<WallpaperStyle>(() => {
    return (localStorage.getItem('duora_wallpaper') as WallpaperStyle) || 'clean';
  });
  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('duora_accent') || '';
  });

  const currentTheme = THEMES.find(t => t.id === themeId) || THEMES[0];

  const setThemeId = (id: string) => {
    setThemeIdState(id);
    localStorage.setItem('duora_theme', id);
  };

  const setWallpaper = (wp: WallpaperStyle) => {
    setWallpaperState(wp);
    localStorage.setItem('duora_wallpaper', wp);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    localStorage.setItem('duora_accent', color);
  };

  // Sync HTML root classes and CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (currentTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const c = currentTheme.colors;
    root.style.setProperty('--color-primary', accentColor || c.primary);
    root.style.setProperty('--color-primary-hover', c.primaryHover);
    root.style.setProperty('--color-bg', c.background);
    root.style.setProperty('--color-surface', c.surface);
    root.style.setProperty('--color-surface-hover', c.surfaceHover);
    root.style.setProperty('--color-card', c.card);
    root.style.setProperty('--color-border', c.border);
    root.style.setProperty('--color-text', c.text);
    root.style.setProperty('--color-text-muted', c.textMuted);
    root.style.setProperty('--color-lilac', c.lilac);
    root.style.setProperty('--color-bubble-sender', accentColor || c.bubbleSender);
    root.style.setProperty('--color-bubble-sender-text', c.bubbleSenderText);
    root.style.setProperty('--color-bubble-receiver', c.bubbleReceiver);
    root.style.setProperty('--color-bubble-receiver-text', c.bubbleReceiverText);
    document.body.style.backgroundColor = c.background;
    document.body.style.color = c.text;
  }, [currentTheme, accentColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setThemeId,
        wallpaper,
        setWallpaper,
        accentColor,
        setAccentColor
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
