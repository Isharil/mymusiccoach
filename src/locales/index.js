import fr from './fr.json';
import en from './en.json';

export const translations = { fr, en };

export const availableLanguages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' }
];

// Pour ajouter une nouvelle langue:
// 1. Créer le fichier de traduction (ex: es.json)
// 2. Importer le fichier ici: import es from './es.json';
// 3. Ajouter à translations: export const translations = { fr, en, es };
// 4. Ajouter à availableLanguages: { code: 'es', name: 'Español', flag: '🇪🇸' }
