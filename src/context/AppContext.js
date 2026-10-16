import { createContext, useContext } from 'react';

// Données, réglages et actions de l'application, fournis par MyMusicCoach
// aux pages et fenêtres (src/components).
export const AppContext = createContext(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp doit être utilisé dans un composant rendu par MyMusicCoach');
  }
  return context;
};
