import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildProgressReport } from './progressReport';
import { translate } from '../hooks/useTranslation';

const t = (key, params) => translate('en', key, params);

const baseParams = {
  weeks: 1,
  settings: { userName: 'Léa', language: 'en' },
  t,
  exerciseName: (ex) => ex.name,
  formatDisplayDate: (date) => date,
  exercises: [
    { id: 1, name: 'Scales', baseTempo: 60, tempoHistory: [{ date: '2026-10-10', tempo: 60 }, { date: '2026-10-14', tempo: 72 }] },
    { id: 2, name: 'No tempo yet', baseTempo: 80, tempoHistory: [] },
  ],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 15, 12, 0));
});
afterEach(() => vi.useRealTimers());

describe('buildProgressReport', () => {
  it('ne garde que les sessions de la période choisie', () => {
    const { html } = buildProgressReport({
      ...baseParams,
      sessionHistory: [
        { id: 1, date: '2026-09-01', time: '10:00', workoutName: 'Too old', completed: 1, skipped: 0, total: 1 },
        { id: 2, date: '2026-10-14', time: '18:30', workoutName: 'Recent', completed: 2, skipped: 1, total: 3 },
      ],
    });
    expect(html).toContain('Recent');
    expect(html).not.toContain('Too old');
    expect(html).toContain('Last 7 days');
  });

  it('affiche la progression des tempos', () => {
    const { html } = buildProgressReport({ ...baseParams, sessionHistory: [] });
    expect(html).toContain('Scales');
    expect(html).toContain('+12 BPM');
    expect(html).not.toContain('No tempo yet');
  });

  it('échappe les textes saisis (noms, notes)', () => {
    const { html } = buildProgressReport({
      ...baseParams,
      settings: { userName: '<b>Léa</b>', language: 'en' },
      sessionHistory: [{
        id: 1, date: '2026-10-14', time: '18:30', workoutName: '<script>alert(1)</script>',
        completed: 1, skipped: 0, total: 1, notes: { 1: 'Tempo <img src=x onerror=alert(1)>' },
      }],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;Léa&lt;/b&gt;');
  });

  it('propose un nom de fichier daté', () => {
    const { fileName } = buildProgressReport({ ...baseParams, settings: { userName: 'Léa Martin', language: 'en' }, sessionHistory: [] });
    expect(fileName).toMatch(/^Report_Léa_Martin_\d{4}-\d{2}-\d{2}\.html$/);
  });
});
