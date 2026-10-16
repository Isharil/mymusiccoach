import { describe, it, expect, beforeEach } from 'vitest';
import { clear, get, set } from 'idb-keyval';
import { BACKUP_FORMAT_VERSION, createBackup, parseBackup } from './backup';
import { exportAppData, importAppData } from '../hooks/useIndexedDB';

const exercises = [{ id: 1, name: 'Scales', sets: '3 séries', tempoHistory: [] }];
const workouts = [{ id: 1, name: 'Routine', exercises: [1] }];
const sessionHistory = [{ id: 1, date: '2026-10-12', workoutId: 1, completed: 1, skipped: 0, total: 1 }];
const settings = { userName: 'Léa', language: 'fr' };

describe('createBackup / parseBackup', () => {
  it('relit une sauvegarde créée par l\'app', () => {
    const text = createBackup({ exercises, workouts, sessionHistory, settings }, {
      appVersion: '1.11.0', now: new Date('2026-10-16T10:00:00Z'),
    });
    const header = JSON.parse(text);
    expect(header).toMatchObject({ appName: 'MyMusicCoach', formatVersion: BACKUP_FORMAT_VERSION, appVersion: '1.11.0' });
    // Valeurs sérialisées, comme dans l'ancien format
    expect(typeof header.exercises).toBe('string');

    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    expect(result.values).toEqual({ exercises, workouts, sessionHistory, settings });
    expect(result.summary).toEqual({ exportDate: '2026-10-16T10:00:00.000Z', exercises: 1, workouts: 1, sessions: 1 });
  });

  it('accepte les anciennes sauvegardes sans en-tête', () => {
    const old = JSON.stringify({
      exportDate: '2025-05-01T08:00:00.000Z',
      exercises: JSON.stringify(exercises),
      settings: JSON.stringify(settings),
      activeWorkout: 'null',
    });
    const result = parseBackup(old);
    expect(result.ok).toBe(true);
    expect(result.values).toEqual({ exercises, settings, activeWorkout: null });
  });

  it('ignore les clés inconnues', () => {
    const result = parseBackup(JSON.stringify({ exercises: JSON.stringify(exercises), mmc_evil: '"x"', other: 1 }));
    expect(result.ok).toBe(true);
    expect(Object.keys(result.values)).toEqual(['exercises']);
  });

  it('refuse un fichier illisible', () => {
    expect(parseBackup('pas du json')).toEqual({ ok: false, error: 'invalid' });
    expect(parseBackup('[1, 2]')).toEqual({ ok: false, error: 'invalid' });
  });

  it('refuse une donnée de forme incorrecte et indique laquelle', () => {
    const result = parseBackup(JSON.stringify({ exercises: JSON.stringify([{ name: 'sans id' }]) }));
    expect(result).toEqual({ ok: false, error: 'invalid', key: 'exercises' });
    expect(parseBackup(JSON.stringify({ workouts: '{cassé' }))).toEqual({ ok: false, error: 'invalid', key: 'workouts' });
  });

  it('reconnaît un fichier de session partagée', () => {
    const sessionFile = { version: '1.0', appName: 'MyMusicCoach', workout: { name: 'R' }, exercises: [] };
    expect(parseBackup(JSON.stringify(sessionFile))).toEqual({ ok: false, error: 'sessionFile' });
  });

  it("refuse un JSON qui n'est pas une sauvegarde", () => {
    expect(parseBackup(JSON.stringify({ hello: 'world' }))).toEqual({ ok: false, error: 'notABackup' });
  });

  it("refuse une sauvegarde d'une version plus récente du format", () => {
    const future = JSON.stringify({ formatVersion: BACKUP_FORMAT_VERSION + 1, exercises: JSON.stringify(exercises) });
    expect(parseBackup(future)).toEqual({ ok: false, error: 'newerVersion' });
  });
});

describe('exportAppData / importAppData', () => {
  beforeEach(() => clear());

  it('restaure les données exportées', async () => {
    await set('mmc_exercises', exercises);
    await set('mmc_workouts', workouts);
    await set('mmc_sessionHistory', sessionHistory);
    await set('mmc_settings', settings);
    const text = await exportAppData('1.11.0');

    await clear();
    await set('mmc_exercises', [{ id: 9, name: 'Autre appareil' }]);
    await set('mmc_activeWorkout', { id: 9, name: 'En cours', exercises: [] });

    await importAppData(parseBackup(text).values);
    expect(await get('mmc_exercises')).toEqual(exercises);
    expect(await get('mmc_workouts')).toEqual(workouts);
    expect(await get('mmc_settings')).toEqual(settings);
    // La session en cours de l'appareil n'est pas mélangée aux données restaurées
    expect(await get('mmc_activeWorkout')).toBeUndefined();
  });
});
