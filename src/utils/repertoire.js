// Répertoire de morceaux : statuts, rappels de travail et révisions espacées.
import { normalizeDate, parseLocalDate, toLocalDateStr } from './practiceStats';
import { sessionPieceMinutes } from './practiceTime';

export const PIECE_STATUSES = ['toLearn', 'learning', 'mastered'];

// Morceau à apprendre ou en cours : rappel tous les LEARNING_INTERVAL_DAYS jours
export const LEARNING_INTERVAL_DAYS = 2;
// Morceau maîtrisé : révisions de plus en plus espacées tant qu'il reste au point
export const REVIEW_INTERVALS_DAYS = [3, 7, 14, 30, 60, 120];

const addDays = (dateStr, days) => {
  const date = parseLocalDate(dateStr);
  return toLocalDateStr(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
};

/** Intervalle avant le prochain rappel, selon le statut et l'étape de révision */
export const reminderIntervalDays = (piece) =>
  piece.status === 'mastered'
    ? REVIEW_INTERVALS_DAYS[Math.min(piece.reviewStage || 0, REVIEW_INTERVALS_DAYS.length - 1)]
    : LEARNING_INTERVAL_DAYS;

/**
 * Date du prochain rappel ("YYYY-MM-DD"), ou null si aucun rappel n'est demandé.
 * Le délai part de la dernière séance (ou de l'activation du rappel).
 */
export const nextReminderDate = (piece) => {
  if (!piece.reminder) return null;
  const from = piece.lastPracticedAt || piece.reminderSince || piece.addedAt;
  if (!from) return null;
  return addDays(normalizeDate(from), reminderIntervalDays(piece));
};

/** Le morceau est-il à travailler aujourd'hui (rappel demandé et délai écoulé) ? */
export const isPieceDue = (piece, today = new Date()) => {
  const next = nextReminderDate(piece);
  return next !== null && next <= toLocalDateStr(today);
};

/** Morceaux à travailler aujourd'hui, du plus en retard au plus récent */
export const duePieces = (pieces, today = new Date()) =>
  pieces
    .filter(piece => isPieceDue(piece, today))
    .sort((a, b) => nextReminderDate(a).localeCompare(nextReminderDate(b)));

/**
 * Enregistre une séance de travail sur le morceau.
 * Pour un morceau maîtrisé, `stillMastered` indique le résultat de la révision :
 * true -> l'intervalle s'allonge ; false -> le morceau repasse « en cours ».
 */
export const recordPiecePractice = (piece, { date, stillMastered = null }) => {
  const updated = { ...piece, lastPracticedAt: date };
  if (piece.status === 'mastered' && stillMastered !== null) {
    if (stillMastered) {
      updated.reviewStage = Math.min((piece.reviewStage || 0) + 1, REVIEW_INTERVALS_DAYS.length - 1);
    } else {
      updated.status = 'learning';
      updated.reviewStage = 0;
    }
  }
  return updated;
};

/** Changement de statut : les révisions d'un morceau maîtrisé repartent du début */
export const changePieceStatus = (piece, status) =>
  status === piece.status ? piece : { ...piece, status, reviewStage: 0 };

/**
 * Temps total passé sur un morceau (minutes) et nombre de séances, d'après l'historique :
 * séances notées depuis la fiche, et part des sessions où il a été travaillé.
 * @param {Map} exercisesById - exercices, pour répartir la durée des sessions
 */
export const piecePracticeSummary = (pieceId, sessionHistory, exercisesById = new Map()) => {
  let minutes = 0;
  let sessions = 0;
  for (const session of sessionHistory) {
    if (session.pieceId === pieceId) {
      minutes += Number(session.durationMinutes) || 0;
      sessions++;
    } else if (session.pieceProgress?.[pieceId] === 'completed') {
      minutes += sessionPieceMinutes(session, exercisesById)[pieceId] || 0;
      sessions++;
    }
  }
  return { minutes: Math.round(minutes), sessions };
};

// Statut d'un morceau dans la session en cours de modification (à côté des ids d'exercices)
export const PIECE_PROGRESS_PREFIX = 'piece-';

/** Morceaux d'une session (les morceaux supprimés sont ignorés) */
export const workoutPieces = (workout, pieces) =>
  (workout?.pieces || []).map(id => pieces.find(piece => piece.id === id)).filter(Boolean);
