import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeConfig } from '../types';

export const THEMES: ThemeConfig[] = [
  {
    id: 'teal-mist',
    name: 'Teal Mist',
    isDark: false,
    colors: {
      primary: '#00545A',
      primaryHover: '#003F44',
      background: '#EAF7F6',
      surface: '#FFFFFF',
      surfaceHover: '#D6F0EF',
      card: '#FFFFFF',
      border: '#BFE5E3',
      text: '#003236',
      textMuted: '#407074',
      lilac: '#D6F0EF',
      accent: '#00545A',
      bubbleSender: '#00545A',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#D6F0EF',
      bubbleReceiverText: '#003236',
    }
  },
  {
    id: 'neon-lime',
    name: 'Neon Lime',
    isDark: true,
    colors: {
      primary: '#B9FF24',
      primaryHover: '#A4EB12',
      background: '#191923',
      surface: '#2C2C3C',
      surfaceHover: '#38384D',
      card: '#252533',
      border: '#3F3F54',
      text: '#F4F4F8',
      textMuted: '#9B9BAF',
      lilac: '#2A3020',
      accent: '#B9FF24',
      bubbleSender: '#B9FF24',
      bubbleSenderText: '#101018',
      bubbleReceiver: '#2C2C3C',
      bubbleReceiverText: '#F4F4F8',
    }
  },
  {
    id: 'cyber-cyan',
    name: 'Cyber Cyan',
    isDark: true,
    colors: {
      primary: '#46F0D2',
      primaryHover: '#2CE0C1',
      background: '#131321',
      surface: '#1C1C30',
      surfaceHover: '#262640',
      card: '#181829',
      border: '#2C2C47',
      text: '#FFFFFF',
      textMuted: '#8E8EAA',
      lilac: '#173338',
      accent: '#46F0D2',
      bubbleSender: '#46F0D2',
      bubbleSenderText: '#0A121A',
      bubbleReceiver: '#1F1F35',
      bubbleReceiverText: '#FFFFFF',
    }
  },
  {
    id: 'crimson-pulse',
    name: 'Crimson Pulse',
    isDark: true,
    colors: {
      primary: '#FF626B',
      primaryHover: '#E84D56',
      background: '#17191F',
      surface: '#343844',
      surfaceHover: '#404554',
      card: '#252932',
      border: '#464B5C',
      text: '#F8F9FA',
      textMuted: '#A0A4B3',
      lilac: '#392128',
      accent: '#FF626B',
      bubbleSender: '#FF626B',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#343844',
      bubbleReceiverText: '#F8F9FA',
    }
  },
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    isDark: true,
    colors: {
      primary: '#FFB800',
      primaryHover: '#E5A500',
      background: '#101014',
      surface: '#1C1C24',
      surfaceHover: '#282833',
      card: '#16161D',
      border: '#30303D',
      text: '#FFF7E8',
      textMuted: '#A89E88',
      lilac: '#2E2612',
      accent: '#FFB800',
      bubbleSender: '#FFB800',
      bubbleSenderText: '#101014',
      bubbleReceiver: '#22222D',
      bubbleReceiverText: '#FFF7E8',
    }
  },
  {
    id: 'graphite-slate',
    name: 'Graphite Slate',
    isDark: true,
    colors: {
      primary: '#667085',
      primaryHover: '#535B6D',
      background: '#20232B',
      surface: '#2B2F3A',
      surfaceHover: '#383D4B',
      card: '#252933',
      border: '#3F4554',
      text: '#F1F3F7',
      textMuted: '#98A2B3',
      lilac: '#2F3442',
      accent: '#8E99AF',
      bubbleSender: '#525B6F',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#2B2F3A',
      bubbleReceiverText: '#F1F3F7',
    }
  },
  {
    id: 'royal-violet',
    name: 'Royal Violet (Default)',
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
    id: 'pure-dark',
    name: 'Pure Dark',
    isDark: true,
    colors: {
      primary: '#7057E8',
      primaryHover: '#846EF5',
      background: '#09090D',
      surface: '#191922',
      surfaceHover: '#232330',
      card: '#14141C',
      border: '#2B2B3B',
      text: '#F5F5FA',
      textMuted: '#8E8E9E',
      lilac: '#1F1B38',
      accent: '#7057E8',
      bubbleSender: '#7057E8',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#1E1E2B',
      bubbleReceiverText: '#F5F5FA',
    }
  },
  {
    id: 'amethyst-noir',
    name: 'Amethyst Noir',
    isDark: true,
    colors: {
      primary: '#9333EA',
      primaryHover: '#A855F7',
      background: '#110A1F',
      surface: '#1D1233',
      surfaceHover: '#291A47',
      card: '#170E29',
      border: '#36215E',
      text: '#FAF5FF',
      textMuted: '#A78EC6',
      lilac: '#311756',
      accent: '#C084FC',
      bubbleSender: '#9333EA',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#22153D',
      bubbleReceiverText: '#FAF5FF',
    }
  },
  {
    id: 'emerald-sanctuary',
    name: 'Emerald Sanctuary',
    isDark: true,
    colors: {
      primary: '#10B981',
      primaryHover: '#059669',
      background: '#061D17',
      surface: '#0E2E25',
      surfaceHover: '#143F33',
      card: '#0A251E',
      border: '#1D5344',
      text: '#ECFDF5',
      textMuted: '#84BCAE',
      lilac: '#0D3D31',
      accent: '#34D399',
      bubbleSender: '#059669',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#123D33',
      bubbleReceiverText: '#ECFDF5',
    }
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    isDark: true,
    colors: {
      primary: '#FF6B4A',
      primaryHover: '#FA522D',
      background: '#170F14',
      surface: '#271722',
      surfaceHover: '#382131',
      card: '#1F121B',
      border: '#48243C',
      text: '#FFF3EB',
      textMuted: '#B993A9',
      lilac: '#3A182E',
      accent: '#FF7F62',
      bubbleSender: '#FF5733',
      bubbleSenderText: '#FFFFFF',
      bubbleReceiver: '#2D1927',
      bubbleReceiverText: '#FFF3EB',
    }
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    isDark: false,
    colors: {
      primary: '#0284C7',
      primaryHover: '#0369A1',
      background: '#F3F8FC',
      surface: '#FFFFFF',
      surfaceHover: '#E7F2FA',
      card: '#FFFFFF',
      border: '#CCE2F0',
      text: '#0F172A',
      textMuted: '#5F7996',
      lilac: '#E0F0FE',
      accent: '#0284C7',
      bubbleSender: '#0284C7',
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
    const saved = localStorage.getItem('duora_theme');
    if (saved === 'royal-violet-light') return 'royal-violet';
    if (saved === 'royal-violet-dark') return 'pure-dark';
    return saved || 'royal-violet';
  });
  const [wallpaper, setWallpaperState] = useState<WallpaperStyle>(() => {
    return (localStorage.getItem('duora_wallpaper') as WallpaperStyle) || 'clean';
  });
  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem('duora_accent') || '';
  });

  const currentTheme = THEMES.find(t => t.id === themeId) || THEMES.find(t => t.id === 'royal-violet') || THEMES[0];

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
