// Format des sauvegardes complètes (Réglages > Exporter / Importer une sauvegarde).
//
// Fichier JSON : un en-tête (appName, formatVersion, appVersion, exportDate), une entrée par
// donnée dont la valeur est elle-même sérialisée en JSON (format historique), et une section
// `files` pour les pièces jointes.
// Les sauvegardes antérieures, sans en-tête, sont considérées comme formatVersion 1 et restent
// lisibles. L'inverse n'est pas vrai : les versions de l'app antérieures à la 1.11 refusent ce
// format (sans rien modifier) ; il faut une app à jour pour restaurer une sauvegarde récente.

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

// Pièces jointes (utils/attachments.js) : { id: { name, data } }, stockées hors des exercices
const isFileMap = (v) => isObject(v) &&
  Object.values(v).every(f => isObject(f) && typeof f.name === 'string' && typeof f.data === 'string');

// Une sauvegarde doit contenir au moins une de ces données
const CORE_KEYS = ['exercises', 'workouts', 'sessionHistory', 'settings'];

/**
 * Crée le contenu d'un fichier de sauvegarde.
 * @param {Object} values - données par clé courte (exercises, workouts...) ; undefined = ignorée
 * @param {Object} [options.files] - pièces jointes { id: { name, data } }
 */
export const createBackup = (values, { files, appVersion, now = new Date() } = {}) => {
  const data = {
    appName: BACKUP_APP_NAME,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    exportDate: now.toISOString(),
  };
  for (const key of BACKUP_KEYS) {
    if (values[key] !== undefined) data[key] = JSON.stringify(values[key]);
  }
  if (files && Object.keys(files).length > 0) {
    // Seuls le nom et le contenu sont utiles pour restaurer
    data.files = Object.fromEntries(Object.entries(files).map(([id, f]) => [id, { name: f.name, data: f.data }]));
  }
  return JSON.stringify(data, null, 2);
};

/**
 * Lit et vérifie un fichier de sauvegarde, sans rien écrire.
 * @returns {{ ok: true, values: Object, files: Object|null, summary: Object }
 *   | { ok: false, error: string, key?: string }}
 *   files : pièces jointes, ou null pour une sauvegarde qui n'en a pas de section
 *           (anciennes sauvegardes : les fichiers sont alors dans les exercices)
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

  if (data.files !== undefined && !isFileMap(data.files)) {
    return { ok: false, error: 'invalid', key: 'files' };
  }

  return {
    ok: true,
    values,
    files: data.files ?? null,
    summary: {
      exportDate: typeof data.exportDate === 'string' ? data.exportDate : null,
      exercises: values.exercises?.length ?? 0,
      workouts: values.workouts?.length ?? 0,
      sessions: values.sessionHistory?.length ?? 0,
    },
  };
};
