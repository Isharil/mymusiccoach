// Temps de pratique : durée des sessions, minutes de la semaine, répartition par catégorie.
import { parseDuration } from './exercises';
import { getMondayOf, normalizeDate, toLocalDateStr } from './practiceStats';

// Au-delà, la durée mesurée correspond sûrement à une session laissée ouverte
export const MAX_SESSION_MINUTES = 240;

// Catégorie des minutes qu'on ne peut pas rattacher à un exercice
export const OTHER_CATEGORY = 'other';

// Morceau du répertoire travaillé dans une session : catégorie, et durée prévue qui sert à répartir
// le temps de la session (en secondes, comme parseDuration)
export const PIECE_CATEGORY = 'Morceaux';
export const PIECE_PLANNED_SECONDS = 10 * 60;

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

  const shares = sessionShares(session, exercisesById);
  if (!shares.length) return { [OTHER_CATEGORY]: minutes };

  const result = {};
  for (const share of shares) {
    result[share.category] = (result[share.category] || 0) + share.minutes;
  }
  return result;
};

/**
 * Part de chaque élément validé dans la durée d'une session guidée, au prorata de sa durée prévue :
 * exercices validés et morceaux travaillés (PIECE_PLANNED_SECONDS chacun).
 * @returns {Array<{ category: string, minutes: number, pieceId?: number }>}
 */
const sessionShares = (session, exercisesById) => {
  const minutes = Number(session.durationMinutes) || 0;
  const completed = (progress) => Object.entries(progress || {}).filter(([, status]) => status === 'completed');
  const weights = [
    ...completed(session.exerciseProgress)
      .map(([id]) => exercisesById.get(Number(id)))
      .filter(Boolean)
      .map(ex => ({ category: ex.category || OTHER_CATEGORY, weight: parseDuration(ex.duration) })),
    ...completed(session.pieceProgress)
      .map(([id]) => ({ category: PIECE_CATEGORY, weight: PIECE_PLANNED_SECONDS, pieceId: Number(id) })),
  ];
  const totalWeight = weights.reduce((sum, { weight }) => sum + weight, 0);
  if (!minutes || !totalWeight) return [];
  return weights.map(({ weight, ...share }) => ({ ...share, minutes: (minutes * weight) / totalWeight }));
};

/** Minutes d'une session guidée attribuées à chaque morceau travaillé : { pieceId: minutes } */
export const sessionPieceMinutes = (session, exercisesById) => {
  if (session.free) return {};
  const result = {};
  for (const share of sessionShares(session, exercisesById)) {
    if (share.pieceId != null) result[share.pieceId] = share.minutes;
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
