// Détection de hauteur et conversion fréquence -> note, pour l'accordeur chromatique.

// Étendue détectée : du La le plus grave du piano (27,5 Hz) au haut du piccolo et du piano (~4 200 Hz)
export const MIN_FREQUENCY = 27;
export const MAX_FREQUENCY = 4200;

// La de référence (A4) réglable
export const DEFAULT_A4 = 440;
export const MIN_A4 = 415;
export const MAX_A4 = 466;

// Écart toléré pour considérer la note juste, en cents
export const IN_TUNE_CENTS = 5;

// Instruments transpositeurs : demi-tons à ajouter au son réel pour obtenir la note écrite
export const TRANSPOSITIONS = {
  C: 0,    // instruments en Ut : piano, guitare, cordes, voix, flûte, hautbois...
  Bb: 2,   // en Si♭ : trompette, clarinette, saxophones ténor et soprano (le son réel est un ton plus bas)
  Eb: 9,   // en Mi♭ : saxophones alto et baryton
  F: 7,    // en Fa : cor
};

// Noms des notes en lettres (notation internationale)
export const LETTER_NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
// Mêmes notes, altérations écrites en bémols
export const LETTER_NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

// Seuil de silence adaptatif : un son est analysé s'il dépasse NOISE_GATE_RATIO fois le bruit
// de fond mesuré, dans ces limites (un instrument doux, comme une guitare électrique non
// branchée, arrive très faible sur le micro d'un téléphone)
export const NOISE_GATE_RATIO = 3;
export const MIN_NOISE_GATE = 0.0005;
export const MAX_NOISE_GATE = 0.01;
export const INITIAL_NOISE_FLOOR = 0.001;

/**
 * Suit le bruit de fond : descend tout de suite vers les niveaux plus bas, remonte très
 * lentement (une note tenue ne doit pas être prise pour du bruit).
 */
export const updateNoiseFloor = (floor, level) =>
  level < floor ? level : floor + (level - floor) * 0.01;

/** Niveau minimal pour analyser un son, d'après le bruit de fond */
export const noiseGate = (floor) =>
  Math.min(MAX_NOISE_GATE, Math.max(MIN_NOISE_GATE, floor * NOISE_GATE_RATIO));

/** Niveau sonore (moyenne quadratique) d'un échantillon */
export const rms = (buffer) => {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
};

/**
 * Détecte la fréquence fondamentale d'un échantillon audio (algorithme YIN,
 * de Cheveigné & Kawahara, 2002), avec interpolation parabolique pour la précision.
 * @param {Float32Array} buffer - échantillon mono, au moins deux périodes de la note la plus grave
 * @returns {{ frequency: number, clarity: number } | null} null si aucune note nette n'est détectée
 */
export const detectPitch = (buffer, sampleRate, {
  minFrequency = MIN_FREQUENCY,
  maxFrequency = MAX_FREQUENCY,
  threshold = 0.15,
  minRms = MIN_NOISE_GATE,
} = {}) => {
  if (rms(buffer) < minRms) return null; // silence

  const window = Math.floor(buffer.length / 2);
  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const tauMax = Math.min(window - 1, Math.ceil(sampleRate / minFrequency));
  if (tauMax <= tauMin) return null;

  // Fonction de différence et différence normalisée cumulée, calculées au fur et à mesure :
  // on s'arrête dès le premier creux, ce qui évite l'essentiel du calcul pour les notes aiguës
  const diff = new Float32Array(tauMax + 2);
  const cmnd = new Float32Array(tauMax + 2);
  cmnd[0] = 1;
  let runningSum = 0;
  let computed = 0; // dernier décalage calculé
  const computeUpTo = (tau) => {
    while (computed < tau) {
      const t = ++computed;
      let sum = 0;
      for (let i = 0; i < window; i++) {
        const delta = buffer[i] - buffer[i + t];
        sum += delta * delta;
      }
      diff[t] = sum;
      runningSum += sum;
      cmnd[t] = runningSum > 0 ? (sum * t) / runningSum : 1;
    }
  };

  // Premier creux sous le seuil (évite de tomber sur une sous-harmonique)
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    computeUpTo(t);
    if (cmnd[t] < threshold) {
      // Descendre jusqu'au fond du creux
      computeUpTo(t + 1);
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) {
        t++;
        computeUpTo(t + 1);
      }
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;
  computeUpTo(tau + 1);

  // Interpolation parabolique autour du creux, sur la différence brute (plus précise dans l'aigu,
  // où une période ne dure que quelques échantillons)
  const prev = diff[tau - 1];
  const next = diff[tau + 1];
  const denominator = prev + next - 2 * diff[tau];
  const shift = denominator !== 0 ? (prev - next) / (2 * denominator) : 0;
  const frequency = sampleRate / (tau + Math.max(-1, Math.min(1, shift)));

  if (frequency < minFrequency || frequency > maxFrequency) return null;
  return { frequency, clarity: 1 - cmnd[tau] };
};

/**
 * Note la plus proche d'une fréquence.
 * @returns {{ midi: number, pitchClass: number, octave: number, cents: number }}
 *   pitchClass : 0 = Do/C ... 11 = Si/B ; octave en notation scientifique (A4 = La 440 Hz) ;
 *   cents : écart avec la note juste (-50 à +50)
 */
export const frequencyToNote = (frequency, a4 = DEFAULT_A4) => {
  const exactMidi = 69 + 12 * Math.log2(frequency / a4);
  const midi = Math.round(exactMidi);
  return {
    midi,
    pitchClass: ((midi % 12) + 12) % 12,
    octave: Math.floor(midi / 12) - 1,
    cents: Math.round((exactMidi - midi) * 100),
  };
};

/** Fréquence d'une note MIDI */
export const midiToFrequency = (midi, a4 = DEFAULT_A4) => a4 * 2 ** ((midi - 69) / 12);

/** Note écrite pour un instrument transpositeur (même écart en cents) */
export const transposeNote = (note, transposition = 'C') => {
  const midi = note.midi + (TRANSPOSITIONS[transposition] ?? 0);
  return { ...note, midi, pitchClass: ((midi % 12) + 12) % 12, octave: Math.floor(midi / 12) - 1 };
};

/**
 * Nom affiché d'une note.
 * @param {string[]} names - 12 noms, de Do/C à Si/B
 * @param {number} octaveOffset - décalage de numérotation (ex. -1 en France : La3 = 440 Hz)
 */
export const noteLabel = (note, names = LETTER_NOTE_NAMES, octaveOffset = 0) => ({
  name: names[note.pitchClass],
  octave: note.octave + octaveOffset,
});

/** Médiane d'une liste de nombres (lissage des mesures successives) */
export const median = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
