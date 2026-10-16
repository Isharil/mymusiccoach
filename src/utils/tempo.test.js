import { describe, it, expect } from 'vitest';
import { currentTempoOf, suggestNextTempo, tempoProgress } from './tempo';

const record = (...tempos) => tempos.map((tempo, i) => ({ date: `2026-10-0${i + 1}`, tempo }));

describe('currentTempoOf', () => {
  it('prend le dernier tempo enregistré, sinon le tempo de base', () => {
    expect(currentTempoOf({ baseTempo: 60, tempoHistory: record(70, 75) })).toBe(75);
    expect(currentTempoOf({ baseTempo: 60, tempoHistory: [] })).toBe(60);
    expect(currentTempoOf({ baseTempo: 0, tempoHistory: [] })).toBeNull();
  });
});

describe('suggestNextTempo', () => {
  it('propose +5 BPM quand les deux dernières séances sont stables ou en hausse', () => {
    expect(suggestNextTempo({ baseTempo: 60, tempoHistory: record(80, 80) })).toEqual({ tempo: 85, increased: true });
    expect(suggestNextTempo({ baseTempo: 60, tempoHistory: record(75, 80) })).toEqual({ tempo: 85, increased: true });
  });

  it('garde le tempo après une baisse ou une seule séance', () => {
    expect(suggestNextTempo({ baseTempo: 60, tempoHistory: record(85, 80) })).toEqual({ tempo: 80, increased: false });
    expect(suggestNextTempo({ baseTempo: 60, tempoHistory: record(80) })).toEqual({ tempo: 80, increased: false });
    expect(suggestNextTempo({ baseTempo: 60, tempoHistory: [] })).toEqual({ tempo: 60, increased: false });
  });

  it('ne dépasse pas le tempo cible', () => {
    expect(suggestNextTempo({ baseTempo: 60, targetTempo: 82, tempoHistory: record(80, 80) })).toEqual({ tempo: 82, increased: true });
    expect(suggestNextTempo({ baseTempo: 60, targetTempo: 80, tempoHistory: record(80, 80) })).toEqual({ tempo: 80, increased: false });
  });

  it('ne propose rien sans tempo', () => {
    expect(suggestNextTempo({ baseTempo: 0, tempoHistory: [] })).toBeNull();
  });
});

describe('tempoProgress', () => {
  it('situe le tempo actuel entre le tempo de base et la cible', () => {
    expect(tempoProgress({ baseTempo: 60, targetTempo: 120, tempoHistory: record(90) }))
      .toEqual({ current: 90, target: 120, percent: 50, reached: false });
  });

  it('signale la cible atteinte', () => {
    expect(tempoProgress({ baseTempo: 60, targetTempo: 120, tempoHistory: record(118, 124) }))
      .toEqual({ current: 124, target: 120, percent: 100, reached: true });
  });

  it('part du premier enregistrement sans tempo de base', () => {
    expect(tempoProgress({ baseTempo: 0, targetTempo: 100, tempoHistory: record(60, 80) }).percent).toBe(50);
  });

  it("renvoie null sans tempo cible", () => {
    expect(tempoProgress({ baseTempo: 60, tempoHistory: record(70) })).toBeNull();
  });
});
