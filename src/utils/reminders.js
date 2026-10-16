// Planification des rappels de pratique (notifications locales Android).
//
// Une notification répétée chaque jour ne peut pas sauter certains jours : on programme donc
// des rappels ponctuels pour les REMINDER_DAYS prochains jours, recalculés à chaque ouverture
// de l'app et à chaque changement (session terminée, planning, réglages).
import { getScheduledWorkoutIds, normalizeDate, toLocalDateStr } from './practiceStats';

// Un cycle complet du planning
export const REMINDER_DAYS = 28;
// Identifiants des rappels : REMINDER_BASE_ID + numéro du jour (0 = aujourd'hui)
export const REMINDER_BASE_ID = 1000;
// Ancien rappel quotidien répété (versions antérieures à la 1.12)
export const LEGACY_DAILY_REMINDER_ID = 1;

export const isReminderId = (id) =>
  id === LEGACY_DAILY_REMINDER_ID || (id >= REMINDER_BASE_ID && id < REMINDER_BASE_ID + REMINDER_DAYS);

/**
 * Calcule les rappels à programmer.
 * - Avec un planning : seulement les jours où une session est prévue.
 * - Sans planning (aucune session programmée) : tous les jours.
 * - Aujourd'hui : pas de rappel si les sessions prévues sont faites
 *   (ou, sans session prévue, si une pratique a déjà été enregistrée).
 * @param {string} time - heure du rappel "HH:MM"
 * @returns {Array<{ id: number, at: Date, workouts: Array }>} workouts : sessions prévues ce jour-là
 */
export const planReminders = ({ now = new Date(), time, weeklySchedule, workouts, cycleStartDate, sessionHistory }) => {
  const [hours, minutes] = (time || '18:00').split(':').map(Number);
  const workoutsById = new Map(workouts.map(w => [w.id, w]));
  const plannedOn = (date) => getScheduledWorkoutIds(weeklySchedule, cycleStartDate, date)
    .map(id => workoutsById.get(id))
    .filter(Boolean);
  const hasSchedule = Object.values(weeklySchedule || {}).some(week =>
    Object.values(week || {}).some(ids => (Array.isArray(ids) ? ids : [ids]).some(id => workoutsById.has(id)))
  );

  const todayStr = toLocalDateStr(now);
  const practicedToday = sessionHistory.filter(s => normalizeDate(s.date) === todayStr);

  const reminders = [];
  for (let day = 0; day < REMINDER_DAYS; day++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hours, minutes, 0, 0);
    if (at <= now) continue;

    const planned = plannedOn(at);
    if (hasSchedule && planned.length === 0) continue;

    if (day === 0) {
      const done = planned.length > 0
        ? planned.every(w => practicedToday.some(s => s.workoutId === w.id))
        : practicedToday.length > 0;
      if (done) continue;
    }

    reminders.push({ id: REMINDER_BASE_ID + day, at, workouts: planned });
  }
  return reminders;
};
