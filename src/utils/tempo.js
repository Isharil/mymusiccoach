// Progression du tempo d'un exercice vers son tempo cible.

export const MIN_TEMPO = 20;
export const MAX_TEMPO = 300;
// Hausse proposée quand le tempo actuel est tenu
export const TEMPO_STEP = 5;

const clampTempo = (tempo) => Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(tempo)));

/** Tempo actuel : dernier tempo enregistré, sinon tempo de base (null s'il n'y en a pas) */
export const currentTempoOf = ({ tempoHistory = [], baseTempo = 0 }) =>
  tempoHistory.length > 0 ? tempoHistory[tempoHistory.length - 1].tempo : (baseTempo > 0 ? baseTempo : null);

/**
 * Tempo à travailler à la prochaine séance.
 * Si les deux derniers enregistrements sont stables ou en hausse, le tempo est tenu :
 * on propose +TEMPO_STEP BPM, sans dépasser le tempo cible.
 * @returns {{ tempo: number, increased: boolean } | null}
 */
export const suggestNextTempo = (exercise) => {
  const current = currentTempoOf(exercise);
  if (!current) return null;

  const history = exercise.tempoHistory || [];
  const target = Number(exercise.targetTempo) || 0;
  const held = history.length >= 2 && history[history.length - 1].tempo >= history[history.length - 2].tempo;
  const reachedTarget = target > 0 && current >= target;

  if (!held || reachedTarget) return { tempo: clampTempo(current), increased: false };

  const next = target > 0 ? Math.min(target, current + TEMPO_STEP) : current + TEMPO_STEP;
  return { tempo: clampTempo(next), increased: next > current };
};

/**
 * Progression vers le tempo cible, en pourcentage du chemin entre le tempo de départ
 * (tempo de base, sinon premier enregistrement) et la cible.
 * @returns {{ current: number, target: number, percent: number, reached: boolean } | null}
 */
export const tempoProgress = (exercise) => {
  const target = Number(exercise.targetTempo) || 0;
  const current = currentTempoOf(exercise);
  if (!target || !current) return null;

  const history = exercise.tempoHistory || [];
  const start = exercise.baseTempo > 0 ? exercise.baseTempo : history[0]?.tempo ?? current;
  const reached = current >= target;
  const percent = reached ? 100 : target > start ? Math.max(0, ((current - start) / (target - start)) * 100) : 0;
  return { current, target, percent: Math.round(percent), reached };
};
