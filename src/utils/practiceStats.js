// Fonctions pures de calcul de dates, de cycle et de série de pratique.
// Toutes les dates manipulées sont des dates locales (pas UTC).

const DAY_KEYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Date locale -> "YYYY-MM-DD"
export const toLocalDateStr = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// "YYYY-MM-DD" ou "DD/MM/YYYY" -> "YYYY-MM-DD"
export const normalizeDate = (dateStr) => {
  if (!dateStr) return dateStr;
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
};

// "YYYY-MM-DD" ou "DD/MM/YYYY" -> Date locale à minuit
// (new Date("YYYY-MM-DD") interprète la chaîne en UTC, d'où un décalage selon le fuseau)
export const parseLocalDate = (dateStr) => {
  const [year, month, day] = normalizeDate(dateStr).split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Nombre de jours calendaires entre deux dates locales (insensible aux changements d'heure)
const daysBetween = (from, to) => {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
};

// Clé du jour utilisée dans le planning ('lundi', 'mardi', ...)
export const getDayKey = (date) => DAY_KEYS[date.getDay()];

// Semaine du cycle de 4 semaines (1-4) pour une date donnée.
// Fonctionne aussi si la date de début du cycle est dans le futur.
export const getCycleWeekNumber = (date, cycleStartDate) => {
  if (!cycleStartDate) return 1;
  const diffDays = daysBetween(parseLocalDate(cycleStartDate), date);
  const weekIndex = Math.floor(diffDays / 7);
  return (((weekIndex % 4) + 4) % 4) + 1;
};

// IDs des sessions prévues au planning pour une date donnée
export const getScheduledWorkoutIds = (weeklySchedule, cycleStartDate, date) => {
  const weekKey = `semaine${getCycleWeekNumber(date, cycleStartDate)}`;
  const value = weeklySchedule?.[weekKey]?.[getDayKey(date)];
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
};

/**
 * Calcule la série actuelle et la meilleure série de jours de pratique.
 *
 * Un jour sans pratique casse la série, sauf :
 * - aujourd'hui (la journée n'est pas finie) ;
 * - un jour de repos prévu au planning (aucune session programmée), qui est neutre :
 *   il ne casse pas la série et ne l'augmente pas.
 *
 * @param {string[]} sessionDates - dates des sessions ("YYYY-MM-DD" ou "DD/MM/YYYY")
 * @param {(date: Date) => boolean} isRestDay - true si aucun entraînement n'est prévu ce jour-là
 * @param {Date} today
 * @returns {{ current: number, best: number }}
 */
export const computeStreaks = (sessionDates, isRestDay, today = new Date()) => {
  const practiced = new Set(sessionDates.map(normalizeDate));
  if (practiced.size === 0) return { current: 0, best: 0 };

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayStr = toLocalDateStr(todayMidnight);
  const firstDate = [...practiced].sort()[0];
  const start = parseLocalDate(firstDate);

  let run = 0;
  let best = 0;
  const cursor = new Date(start);
  while (cursor <= todayMidnight) {
    const dateStr = toLocalDateStr(cursor);
    if (practiced.has(dateStr)) {
      run++;
      best = Math.max(best, run);
    } else if (dateStr !== todayStr && !isRestDay(cursor)) {
      run = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { current: run, best };
};
