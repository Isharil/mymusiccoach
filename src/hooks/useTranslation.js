import { useCallback } from 'react';
import { translations } from '../locales';

// Langue utilisée quand la langue choisie n'existe pas ou qu'une clé y manque
const FALLBACK_LANGUAGE = 'en';

// Cherche une clé pointée ('nav.home') dans un objet de traduction
const lookup = (dictionary, keys) => {
  let value = dictionary;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  return value;
};

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
 *   t('workout.exerciseCount', { count: 1 }) => "1 exercice"
 *     (valeur "{count} exercice | {count} exercices" : la forme est choisie selon count)
 *   t('schedule.dayAbbr') => ["L", "M", ...] (les listes sont renvoyées telles quelles)
 */
export const useTranslation = (language = FALLBACK_LANGUAGE) => {
  const t = useCallback((key, params) => translate(language, key, params), [language]);
  return { t };
};

/**
 * Fonction de traduction
 * @param {string} language - Code de la langue
 * @param {string} key - Clé de traduction (ex: 'nav.home', 'messages.loading')
 * @param {Object} params - Paramètres optionnels pour l'interpolation (ex: { name: 'Jean' })
 * @returns {string|string[]} - Texte traduit (ou la clé si elle n'existe nulle part)
 */
export const translate = (language, key, params = {}) => {
  const lang = translations[language] ? language : FALLBACK_LANGUAGE;
  const keys = key.split('.');

  let value = lookup(translations[lang], keys);
  if (value === undefined && lang !== FALLBACK_LANGUAGE) {
    value = lookup(translations[FALLBACK_LANGUAGE], keys);
  }

  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return key;
  }

  let result = value;

  // Pluriel : "singulier | pluriel", choisi avec les règles de la langue
  if (params.count !== undefined && result.includes(' | ')) {
    const forms = result.split(' | ');
    const category = new Intl.PluralRules(lang).select(Number(params.count));
    result = category === 'one' ? forms[0] : forms[forms.length - 1];
  }

  // Interpolation des paramètres (remplace {param} par la valeur)
  Object.keys(params).forEach(param => {
    result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
  });

  return result;
};

export default useTranslation;
