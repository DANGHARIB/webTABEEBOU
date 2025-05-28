import { useState, useEffect } from 'react';

export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    // Récupérer le thème enregistré ou utiliser la préférence du système
    const savedTheme = localStorage.getItem('color-theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      return savedTheme;
    }
    
    // Utiliser la préférence du système
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  });

  useEffect(() => {
    // Mettre à jour le document HTML avec la classe du thème
    const root = window.document.documentElement;
    
    root.classList.remove('dark', 'light');
    root.classList.add(colorScheme);
    
    // Enregistrer la préférence
    localStorage.setItem('color-theme', colorScheme);
  }, [colorScheme]);

  // Fonction pour basculer le thème
  const toggleColorScheme = () => {
    setColorScheme(prevScheme => (prevScheme === 'light' ? 'dark' : 'light'));
  };

  return {
    colorScheme,
    toggleColorScheme,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light'
  };
} 