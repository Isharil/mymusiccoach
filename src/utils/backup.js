// Format des sauvegardes complètes (Réglages > Exporter / Importer une sauvegarde).
//
// Fichier JSON : un en-tête (appName, formatVersion, appVersion, exportDate) puis une entrée
// par donnée, dont la valeur est elle-même sérialisée en JSON (format historique, conservé
// pour que les anciennes versions de l'app puissent encore relire une sauvegarde récente).
// Les sauvegardes antérieures, sans en-tête, sont considérées comme formatVersion 1.

export const BACKUP_APP_NAME = 'MyMusicCoach';
export const BACKUP_FORMAT_VERSION = 2;

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasId = (v) => isObject(v) && v.id !== undefined && Number.isFinite(Number(v.id));
const isExerciseList = (v) => Array.isArray(v) && v.every(e => hasId(e) && typeof e.name === 'string');
const isWorkout = (w) => hasId(w) && typeof w.name === 'string' && Array.isArray(w.exercises);
const isWorkoutList = (v) => Array.isArray(v) && v.every(isWorkout);

// Données reconnues (clé sans le préfixe mmc_) et vérification de leur forme
const VALIDATORS = {
  exercises: isExerciseList,
  workouts: isWorkoutList,
  sessionHistory: (v) => Array.isArray(v) && v.every(s => isObject(s) && typeof s.date === 'string'),
  goals: () => true, // donnée historique, plus utilisée
  settings: isObject,
  weeklySchedule: (v) => isObject(v) && Object.values(v).every(isObject),
  deletedExercises: isExerciseList,
  archivedWorkouts: isWorkoutList,
  activeWorkout: (v) => v === null || isWorkout(v),
  workoutProgress: isObject,
  currentTempo: isObject,
  exerciseNotes: isObject,
};

export const BACKUP_KEYS = Object.keys(VALIDATORS);

// Une sauvegarde doit contenir au moins une de ces données
const CORE_KEYS = ['exercises', 'workouts', 'sessionHistory', 'settings'];

/**
 * Crée le contenu d'un fichier de sauvegarde.
 * @param {Object} values - données par clé courte (exercises, workouts...) ; undefined = ignorée
 */
export const createBackup = (values, { appVersion, now = new Date() } = {}) => {
  const data = {
    appName: BACKUP_APP_NAME,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    exportDate: now.toISOString(),
  };
  for (const key of BACKUP_KEYS) {
    if (values[key] !== undefined) data[key] = JSON.stringify(values[key]);
  }
  return JSON.stringify(data, null, 2);
};

/**
 * Lit et vérifie un fichier de sauvegarde, sans rien écrire.
 * @returns {{ ok: true, values: Object, summary: Object } | { ok: false, error: string, key?: string }}
 *   error : 'invalid' (illisible ou endommagé), 'sessionFile' (fichier de session partagée),
 *           'notABackup', 'newerVersion'
 */
export const parseBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalid' };
  }
  if (!isObject(data)) return { ok: false, error: 'invalid' };

  // Fichier de session exporté depuis la bibliothèque, pas une sauvegarde complète
  if (data.version && isObject(data.workout) && Array.isArray(data.exercises)) {
    return { ok: false, error: 'sessionFile' };
  }

  if (Number(data.formatVersion) > BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'newerVersion' };
  }

  const values = {};
  for (const [key, isValid] of Object.entries(VALIDATORS)) {
    // Les toutes premières sauvegardes pouvaient utiliser les clés complètes (mmc_...)
    const raw = key in data ? data[key] : data[`mmc_${key}`];
    if (raw === undefined) continue;

    let value = raw;
    if (typeof raw === 'string') {
      try {
        value = JSON.parse(raw);
      } catch {
        return { ok: false, error: 'invalid', key };
      }
    }
    if (!isValid(value)) return { ok: false, error: 'invalid', key };
    values[key] = value;
  }

  if (!CORE_KEYS.some(key => key in values)) {
    return { ok: false, error: 'notABackup' };
  }

  return {
    ok: true,
    values,
    summary: {
      exportDate: typeof data.exportDate === 'string' ? data.exportDate : null,
      exercises: values.exercises?.length ?? 0,
      workouts: values.workouts?.length ?? 0,
      sessions: values.sessionHistory?.length ?? 0,
    },
  };
};
