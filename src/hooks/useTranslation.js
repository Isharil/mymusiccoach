import { useCallback } from 'react';
import { translations } from '../locales';

/**
 * Hook de traduction pour l'internationalisation de l'application
 *
 * @param {string} language - Code de la langue ('fr', 'en', etc.)
 * @returns {Object} - { t: fonction de traduction }
 *
 * Usage:
 *   const { t } = useTranslation(settings.language);
 *   t('nav.home') => "Accueil" ou "Home"
 *   t('home.greeting', { name: 'Jean' }) => "Bonjour, Jean"
 */
export const useTranslation = (language = 'fr') => {
  /**
   * Fonction de traduction
   * @param {string} key - Clé de traduction (ex: 'nav.home', 'messages.loading')
   * @param {Object} params - Paramètres optionnels pour l'interpolation (ex: { name: 'Jean' })
   * @returns {string} - Texte traduit
   */
  const t = useCallback((key, params = {}) => {
    // Utiliser le français comme langue par défaut si la langue n'existe pas
    const lang = translations[language] ? language : 'fr';
    const keys = key.split('.');

    // Naviguer dans l'objet de traduction
    let value = translations[lang];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Si la clé n'existe pas dans la langue actuelle, essayer le français
        if (lang !== 'fr') {
          let fallback = translations['fr'];
          for (const fk of keys) {
            if (fallback && typeof fallback === 'object' && fk in fallback) {
              fallback = fallback[fk];
            } else {
              // Retourner la clé si la traduction n'existe pas
              return key;
            }
          }
          value = fallback;
          break;
        }
        // Retourner la clé si la traduction n'existe pas
        return key;
      }
    }

    // Si la valeur n'est pas une chaîne, retourner la clé
    if (typeof value !== 'string') {
      return key;
    }

    // Interpolation des paramètres (remplace {param} par la valeur)
    let result = value;
    Object.keys(params).forEach(param => {
      result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });

    return result;
  }, [language]);

  return { t };
};

export default useTranslation;
