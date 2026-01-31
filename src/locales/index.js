import fr from './fr.json';
import en from './en.json';
import de from './de.json';
import it from './it.json';
import es from './es.json';

export const translations = { fr, en, de, it, es };

export const availableLanguages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'es', name: 'Español', flag: '🇪🇸' }
];

// Pour ajouter une nouvelle langue:
// 1. Créer le fichier de traduction (ex: pt.json)
// 2. Importer le fichier ici: import pt from './pt.json';
// 3. Ajouter à translations: export const translations = { fr, en, de, it, es, pt };
// 4. Ajouter à availableLanguages: { code: 'pt', name: 'Português', flag: '🇵🇹' }
