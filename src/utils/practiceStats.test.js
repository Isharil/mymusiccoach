import { describe, it, expect } from 'vitest';
import {
  computeStreaks,
  getCycleWeekNumber,
  getScheduledWorkoutIds,
  normalizeDate,
  parseLocalDate,
  toLocalDateStr,
} from './practiceStats';

const d = (s) => parseLocalDate(s);
const never = () => false;

describe('dates locales', () => {
  it('normalise le format DD/MM/YYYY', () => {
    expect(normalizeDate('5/3/2026')).toBe('2026-03-05');
    expect(normalizeDate('2026-03-05')).toBe('2026-03-05');
  });

  it('lit une date en heure locale (pas en UTC)', () => {
    const date = parseLocalDate('2026-03-05');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(5);
    expect(date.getHours()).toBe(0);
    expect(toLocalDateStr(date)).toBe('2026-03-05');
  });
});

describe('getCycleWeekNumber', () => {
  it('compte les semaines à partir du début du cycle', () => {
    expect(getCycleWeekNumber(d('2026-10-12'), '2026-10-12')).toBe(1);
    expect(getCycleWeekNumber(d('2026-10-18'), '2026-10-12')).toBe(1);
    expect(getCycleWeekNumber(d('2026-10-19'), '2026-10-12')).toBe(2);
    expect(getCycleWeekNumber(d('2026-11-09'), '2026-10-12')).toBe(1);
  });

  it('reste entre 1 et 4 si la date de début est dans le futur', () => {
    expect(getCycleWeekNumber(d('2026-10-11'), '2026-10-12')).toBe(4);
    expect(getCycleWeekNumber(d('2026-10-05'), '2026-10-12')).toBe(4);
    expect(getCycleWeekNumber(d('2026-10-04'), '2026-10-12')).toBe(3);
  });

  it("n'est pas décalé par le passage à l'heure d'hiver", () => {
    expect(getCycleWeekNumber(d('2026-10-25'), '2026-10-19')).toBe(1);
    expect(getCycleWeekNumber(d('2026-10-26'), '2026-10-19')).toBe(2);
  });

  it('renvoie la semaine 1 sans date de début', () => {
    expect(getCycleWeekNumber(d('2026-10-26'), '')).toBe(1);
  });
});

describe('getScheduledWorkoutIds', () => {
  const schedule = { semaine1: { lundi: [1], mardi: [] }, semaine2: { lundi: 2 } };

  it('renvoie les sessions prévues ce jour-là', () => {
    expect(getScheduledWorkoutIds(schedule, '2026-10-12', d('2026-10-12'))).toEqual([1]);
    expect(getScheduledWorkoutIds(schedule, '2026-10-12', d('2026-10-13'))).toEqual([]);
  });

  it("accepte l'ancien format (un seul id)", () => {
    expect(getScheduledWorkoutIds(schedule, '2026-10-12', d('2026-10-19'))).toEqual([2]);
  });
});

describe('computeStreaks', () => {
  const today = d('2026-10-15');

  it('renvoie 0 sans historique', () => {
    expect(computeStreaks([], never, today)).toEqual({ current: 0, best: 0 });
  });

  it('compte les jours consécutifs', () => {
    expect(computeStreaks(['2026-10-13', '2026-10-14', '2026-10-15'], never, today))
      .toEqual({ current: 3, best: 3 });
  });

  it("ne casse pas la série si on n'a pas encore pratiqué aujourd'hui", () => {
    expect(computeStreaks(['2026-10-13', '2026-10-14'], never, today))
      .toEqual({ current: 2, best: 2 });
  });

  it('casse la série après un jour manqué', () => {
    expect(computeStreaks(['2026-10-12', '2026-10-13'], never, today))
      .toEqual({ current: 0, best: 2 });
  });

  it('accepte le format DD/MM/YYYY', () => {
    expect(computeStreaks(['14/10/2026', '2026-10-15'], never, today))
      .toEqual({ current: 2, best: 2 });
  });

  it('conserve la meilleure série après une rupture', () => {
    const history = [
      '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
      '2026-09-05', '2026-09-06', '2026-09-07', '2026-10-15',
    ];
    expect(computeStreaks(history, never, today)).toEqual({ current: 1, best: 7 });
  });

  it('ignore les jours de repos prévus au planning', () => {
    const restOnWednesday = (date) => date.getDay() === 3;
    // lun 12, mar 13, mer 14 (repos), jeu 15
    expect(computeStreaks(['2026-10-12', '2026-10-13', '2026-10-15'], restOnWednesday, today))
      .toEqual({ current: 3, best: 3 });
    expect(computeStreaks(['2026-10-12', '2026-10-13', '2026-10-15'], never, today))
      .toEqual({ current: 1, best: 2 });
  });
});
