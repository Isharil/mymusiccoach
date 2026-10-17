import { describe, it, expect } from 'vitest';
import {
  detectPitch, frequencyToNote, median, midiToFrequency, noteLabel, rms, transposeNote
} from './pitch';

const SAMPLE_RATE = 48000;
const BUFFER = 4096;

// Son de synthèse : fondamentale + harmoniques (proche d'un instrument réel)
const tone = (frequency, { harmonics = [1, 0.5, 0.33, 0.25], amplitude = 0.5, noise = 0 } = {}) => {
  const random = seededRandom();
  const buffer = new Float32Array(BUFFER);
  for (let i = 0; i < BUFFER; i++) {
    let value = 0;
    harmonics.forEach((weight, h) => { value += weight * Math.sin(2 * Math.PI * frequency * (h + 1) * i / SAMPLE_RATE); });
    buffer[i] = amplitude * value / harmonics.length + noise * (random() * 2 - 1);
  }
  return buffer;
};

// Bruit pseudo-aléatoire reproductible (même suite à chaque lancement)
const seededRandom = (seed = 42) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

const centsBetween = (a, b) => 1200 * Math.log2(a / b);

describe('detectPitch', () => {
  // Du La grave du piano au haut du piccolo
  const cases = [
    ['La0 (piano, grave)', 27.5],
    ['Si0 (basse 5 cordes)', 30.87],
    ['Mi1 (contrebasse)', 41.2],
    ['Mi2 (guitare, 6e corde)', 82.41],
    ['Do3 (violoncelle)', 130.81],
    ['La4 (diapason)', 440],
    ['Mi5 (violon)', 659.26],
    ['Do7 (piccolo)', 2093],
    ['Do8 (piano, aigu)', 4186],
  ];

  for (const [label, frequency] of cases) {
    it(`reconnaît ${label} à moins de 2 cents`, () => {
      const result = detectPitch(tone(frequency), SAMPLE_RATE);
      expect(result).not.toBeNull();
      expect(Math.abs(centsBetween(result.frequency, frequency))).toBeLessThan(2);
    });
  }

  it('reconnaît une sinusoïde pure et un son bruité', () => {
    expect(Math.abs(centsBetween(detectPitch(tone(196, { harmonics: [1] }), SAMPLE_RATE).frequency, 196))).toBeLessThan(2);
    expect(Math.abs(centsBetween(detectPitch(tone(196, { noise: 0.05 }), SAMPLE_RATE).frequency, 196))).toBeLessThan(5);
  });

  it('ne se trompe pas d\'octave sur un son à fondamentale faible', () => {
    // Harmonique 2 plus forte que la fondamentale (fréquent pour les cordes graves)
    const result = detectPitch(tone(110, { harmonics: [0.4, 1, 0.6, 0.3] }), SAMPLE_RATE);
    expect(Math.abs(centsBetween(result.frequency, 110))).toBeLessThan(5);
  });

  it('ignore le silence et le bruit', () => {
    expect(detectPitch(new Float32Array(BUFFER), SAMPLE_RATE)).toBeNull();
    const random = seededRandom(7);
    const noise = Float32Array.from({ length: BUFFER }, () => (random() * 2 - 1) * 0.3);
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull();
  });
});

describe('conversion en notes', () => {
  it('trouve la note et l\'écart en cents', () => {
    expect(frequencyToNote(440)).toEqual({ midi: 69, pitchClass: 9, octave: 4, cents: 0 });
    expect(frequencyToNote(261.63)).toMatchObject({ pitchClass: 0, octave: 4, cents: 0 });
    expect(frequencyToNote(445)).toMatchObject({ pitchClass: 9, cents: 20 });
    expect(frequencyToNote(82.0)).toMatchObject({ pitchClass: 4, octave: 2, cents: -9 });
  });

  it('tient compte du La de référence', () => {
    expect(frequencyToNote(442, 442)).toMatchObject({ pitchClass: 9, cents: 0 });
    expect(frequencyToNote(440, 442)).toMatchObject({ pitchClass: 9, cents: -8 });
    expect(midiToFrequency(69, 415)).toBe(415);
  });

  it('donne la note écrite pour un instrument transpositeur', () => {
    const concertBb = frequencyToNote(233.08); // Si♭3 réel
    expect(transposeNote(concertBb, 'Bb')).toMatchObject({ pitchClass: 0, octave: 4 }); // Do4 écrit (trompette)
    expect(transposeNote(frequencyToNote(277.18), 'Eb')).toMatchObject({ pitchClass: 10 }); // Do♯4 réel -> La♯ écrit (sax alto)
    expect(transposeNote(frequencyToNote(349.23), 'F')).toMatchObject({ pitchClass: 0, octave: 5 }); // Fa4 réel -> Do5 écrit (cor)
    expect(transposeNote(concertBb, 'C')).toMatchObject(concertBb);
  });

  it('nomme la note selon la notation', () => {
    const a4 = frequencyToNote(440);
    expect(noteLabel(a4)).toEqual({ name: 'A', octave: 4 });
    const solfege = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
    expect(noteLabel(a4, solfege, -1)).toEqual({ name: 'La', octave: 3 });
  });
});

describe('utilitaires', () => {
  it('calcule le niveau sonore et la médiane', () => {
    expect(rms(new Float32Array([1, -1, 1, -1]))).toBe(1);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});
