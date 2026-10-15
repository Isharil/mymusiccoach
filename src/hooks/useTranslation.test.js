import { describe, it, expect } from 'vitest';
import { translate } from './useTranslation';

describe('translate', () => {
  it('traduit une clé dans la langue demandée', () => {
    expect(translate('fr', 'nav.home')).toBe('Accueil');
    expect(translate('en', 'nav.home')).toBe('Home');
  });

  it('remplace les paramètres', () => {
    expect(translate('fr', 'home.greeting', { name: 'Léa' })).toBe('Bonjour, Léa');
  });

  it('choisit la forme du pluriel selon la langue', () => {
    expect(translate('fr', 'workout.exerciseCount', { count: 0 })).toBe('0 exercice');
    expect(translate('fr', 'workout.exerciseCount', { count: 1 })).toBe('1 exercice');
    expect(translate('fr', 'workout.exerciseCount', { count: 3 })).toBe('3 exercices');
    expect(translate('en', 'workout.exerciseCount', { count: 0 })).toBe('0 exercises');
    expect(translate('en', 'workout.exerciseCount', { count: 1 })).toBe('1 exercise');
  });

  it('renvoie les listes telles quelles', () => {
    expect(translate('fr', 'schedule.dayAbbr')).toHaveLength(7);
  });

  it("utilise l'anglais pour une langue inconnue", () => {
    expect(translate('xx', 'nav.home')).toBe('Home');
  });

  it("renvoie la clé si elle n'existe nulle part", () => {
    expect(translate('fr', 'cle.inexistante')).toBe('cle.inexistante');
  });
});
