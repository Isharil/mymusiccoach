// Temps de pratique : durée des sessions, minutes de la semaine, répartition par catégorie.
import { parseDuration } from './exercises';
import { getMondayOf, normalizeDate, toLocalDateStr } from './practiceStats';

// Au-delà, la durée mesurée correspond sûrement à une session laissée ouverte
export const MAX_SESSION_MINUTES = 240;

// Catégorie des minutes qu'on ne peut pas rattacher à un exercice
export const OTHER_CATEGORY = 'other';

const clampMinutes = (minutes) => Math.min(MAX_SESSION_MINUTES, Math.max(1, Math.round(minutes)));

/** Minutes écoulées depuis le début d'une session (entre 1 et MAX_SESSION_MINUTES) */
export const elapsedMinutes = (startedAt, now = Date.now()) => clampMinutes((now - startedAt) / 60000);

/** Durée prévue des exercices donnés, en minutes (sessions commencées avant la mesure du temps) */
export const plannedMinutes = (exerciseIds, exercises) => {
  const total = exerciseIds
    .map(id => exercises.find(ex => ex.id === id))
    .filter(Boolean)
    .reduce((sum, ex) => sum + parseDuration(ex.duration) / 60, 0);
  return total > 0 ? clampMinutes(total) : null;
};

/** Lit une durée saisie ("35") ; null si elle n'est pas valide */
export const parseMinutesInput = (value) => {
  const minutes = parseInt(value, 10);
  return Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes, 24 * 60) : null;
};

/**
 * Répartit la durée d'une session entre catégories d'exercices.
 * Session guidée : au prorata de la durée prévue des exercices validés.
 * Pratique libre : catégorie choisie (ou "autre").
 * @returns {Object} { catégorie: minutes }
 */
export const sessionCategoryMinutes = (session, exercisesById) => {
  const minutes = Number(session.durationMinutes) || 0;
  if (!minutes) return {};
  if (session.free) return { [session.category || OTHER_CATEGORY]: minutes };

  const weights = Object.entries(session.exerciseProgress || {})
    .filter(([, status]) => status === 'completed')
    .map(([id]) => exercisesById.get(Number(id)))
    .filter(Boolean)
    .map(ex => [ex.category || OTHER_CATEGORY, parseDuration(ex.duration)]);
  const totalWeight = weights.reduce((sum, [, w]) => sum + w, 0);
  if (!totalWeight) return { [OTHER_CATEGORY]: minutes };

  const result = {};
  for (const [category, weight] of weights) {
    result[category] = (result[category] || 0) + (minutes * weight) / totalWeight;
  }
  return result;
};

/**
 * Statistiques de temps de pratique.
 * La semaine va du lundi à aujourd'hui ; les 28 jours incluent aujourd'hui.
 * Les sessions sans durée (avant la 1.12) ne comptent pas.
 */
export const practiceTimeStats = ({ sessionHistory, exercises, today = new Date() }) => {
  const todayStr = toLocalDateStr(today);
  const weekStart = getMondayOf(today);
  const start28 = toLocalDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27));
  const exercisesById = new Map(exercises.map(ex => [ex.id, ex]));

  let minutesThisWeek = 0;
  let minutesLast28Days = 0;
  const byCategory = {};

  for (const session of sessionHistory) {
    const minutes = Number(session.durationMinutes) || 0;
    if (!minutes) continue;
    const date = normalizeDate(session.date);
    if (date > todayStr) continue;
    if (date >= weekStart) minutesThisWeek += minutes;
    if (date >= start28) {
      minutesLast28Days += minutes;
      for (const [category, value] of Object.entries(sessionCategoryMinutes(session, exercisesById))) {
        byCategory[category] = (byCategory[category] || 0) + value;
      }
    }
  }

  const categoryMinutes = Object.entries(byCategory)
    .map(([category, value]) => ({ category, minutes: Math.round(value) }))
    .filter(({ minutes }) => minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return { minutesThisWeek, minutesLast28Days, categoryMinutes };
};

/** 85 -> "1 h 25", 40 -> "40 min" */
export const formatMinutes = (minutes) => {
  const value = Math.round(Number(minutes) || 0);
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`;
};
