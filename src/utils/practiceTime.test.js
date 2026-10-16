import { describe, it, expect } from 'vitest';
import {
  elapsedMinutes, formatMinutes, MAX_SESSION_MINUTES, parseMinutesInput, plannedMinutes,
  practiceTimeStats, sessionCategoryMinutes
} from './practiceTime';
import { parseLocalDate } from './practiceStats';

const exercises = [
  { id: 1, category: 'Technique', duration: '10 min' },
  { id: 2, category: 'Rythme', duration: '5 min' },
  { id: 3, category: 'Gammes', duration: '15 min' },
];
const byId = new Map(exercises.map(ex => [ex.id, ex]));

describe('durée d\'une session', () => {
  it('mesure le temps écoulé en minutes, borné', () => {
    const start = Date.UTC(2026, 9, 12, 10, 0);
    expect(elapsedMinutes(start, start + 34.6 * 60000)).toBe(35);
    expect(elapsedMinutes(start, start + 10000)).toBe(1);
    expect(elapsedMinutes(start, start + 26 * 3600000)).toBe(MAX_SESSION_MINUTES);
  });

  it('utilise la durée prévue des exercices quand le début est inconnu', () => {
    expect(plannedMinutes([1, 2], exercises)).toBe(15);
    expect(plannedMinutes([99], exercises)).toBeNull();
  });

  it('lit une durée saisie', () => {
    expect(parseMinutesInput('35')).toBe(35);
    expect(parseMinutesInput('')).toBeNull();
    expect(parseMinutesInput('0')).toBeNull();
    expect(parseMinutesInput('abc')).toBeNull();
  });

  it('affiche les minutes et les heures', () => {
    expect(formatMinutes(40)).toBe('40 min');
    expect(formatMinutes(60)).toBe('1 h');
    expect(formatMinutes(85)).toBe('1 h 25');
    expect(formatMinutes(125)).toBe('2 h 05');
  });
});

describe('sessionCategoryMinutes', () => {
  it('répartit au prorata de la durée prévue des exercices validés', () => {
    const session = { durationMinutes: 30, exerciseProgress: { 1: 'completed', 2: 'completed', 3: 'skipped' } };
    expect(sessionCategoryMinutes(session, byId)).toEqual({ Technique: 20, Rythme: 10 });
  });

  it('range en "autre" ce qu\'on ne peut pas attribuer', () => {
    expect(sessionCategoryMinutes({ durationMinutes: 20 }, byId)).toEqual({ other: 20 });
    expect(sessionCategoryMinutes({ durationMinutes: 20, exerciseProgress: { 99: 'completed' } }, byId)).toEqual({ other: 20 });
  });

  it('utilise la catégorie choisie pour une pratique libre', () => {
    expect(sessionCategoryMinutes({ free: true, durationMinutes: 25, category: 'Morceaux' }, byId)).toEqual({ Morceaux: 25 });
    expect(sessionCategoryMinutes({ free: true, durationMinutes: 25 }, byId)).toEqual({ other: 25 });
  });

  it('ignore les sessions sans durée', () => {
    expect(sessionCategoryMinutes({ exerciseProgress: { 1: 'completed' } }, byId)).toEqual({});
  });
});

describe('practiceTimeStats', () => {
  // Jeudi 15 octobre 2026 : la semaine commence le lundi 12
  const today = parseLocalDate('2026-10-15');

  it('compte les minutes de la semaine et des 28 derniers jours', () => {
    const stats = practiceTimeStats({
      today,
      exercises,
      sessionHistory: [
        { date: '2026-10-15', durationMinutes: 30, exerciseProgress: { 1: 'completed' } },
        { date: '2026-10-12', durationMinutes: 20, free: true, category: 'Morceaux' },
        { date: '2026-10-11', durationMinutes: 40, exerciseProgress: { 2: 'completed' } }, // dimanche précédent
        { date: '2026-09-18', durationMinutes: 15, exerciseProgress: { 1: 'completed' } }, // 28e jour
        { date: '2026-09-17', durationMinutes: 99, exerciseProgress: { 1: 'completed' } }, // trop ancien
        { date: '2026-10-14' }, // ancienne session sans durée
      ],
    });
    expect(stats.minutesThisWeek).toBe(50);
    expect(stats.minutesLast28Days).toBe(105);
    expect(stats.categoryMinutes).toEqual([
      { category: 'Technique', minutes: 45 },
      { category: 'Rythme', minutes: 40 },
      { category: 'Morceaux', minutes: 20 },
    ]);
  });

  it('renvoie zéro sans données', () => {
    expect(practiceTimeStats({ today, exercises, sessionHistory: [] }))
      .toEqual({ minutesThisWeek: 0, minutesLast28Days: 0, categoryMinutes: [] });
  });
});
