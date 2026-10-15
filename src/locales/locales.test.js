import { describe, it, expect } from 'vitest';
import { translations, availableLanguages } from './index';

// Liste les clés d'un fichier de traduction ('nav.home', ...) avec le type de valeur
const flatten = (obj, prefix = '') => Object.entries(obj).flatMap(([key, value]) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? flatten(value, `${prefix}${key}.`)
    : [[`${prefix}${key}`, value]]
);

const reference = Object.fromEntries(flatten(translations.en));

describe('fichiers de traduction', () => {
  it('chaque langue proposée a un fichier', () => {
    for (const { code } of availableLanguages) {
      expect(translations[code], code).toBeDefined();
    }
  });

  for (const [lang, dictionary] of Object.entries(translations)) {
    describe(lang, () => {
      const entries = Object.fromEntries(flatten(dictionary));

      it("a exactement les mêmes clés que l'anglais", () => {
        expect(Object.keys(entries).sort()).toEqual(Object.keys(reference).sort());
      });

      it('garde les mêmes paramètres {..} et les mêmes formes de pluriel', () => {
        for (const [key, value] of Object.entries(entries)) {
          const ref = reference[key];
          if (typeof value !== 'string' || typeof ref !== 'string') continue;
          const params = (s) => [...new Set(s.match(/\{\w+\}/g) || [])].sort();
          expect(params(value), key).toEqual(params(ref));
          expect(value.includes(' | '), key).toBe(ref.includes(' | '));
        }
      });

      it("n'a pas de texte vide", () => {
        for (const [key, value] of Object.entries(entries)) {
          if (typeof value === 'string') expect(value.trim(), key).not.toBe('');
        }
      });
    });
  }
});
