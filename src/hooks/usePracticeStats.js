import { useMemo } from 'react';
import { BADGES } from '../constants/appData';
import { computeStreaks, getScheduledWorkoutIds, normalizeDate, parseLocalDate, toLocalDateStr } from '../utils/practiceStats';

// Statistiques de pratique (séries, sessions récentes) et badges
export const usePracticeStats = ({ sessionHistory, weeklySchedule, workouts, cycleStartDate, t }) => {
  // Calcul des statistiques réelles (memoïsé pour éviter les recalculs)
  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Sessions des 7 derniers jours
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Sessions des 28 derniers jours
    const twentyEightDaysAgo = new Date(now);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const sessionsLast7Days = sessionHistory.filter(session => {
      const sessionDate = parseLocalDate(session.date);
      return sessionDate >= sevenDaysAgo;
    }).length;

    const sessionsLast28Days = sessionHistory.filter(session => {
      const sessionDate = parseLocalDate(session.date);
      return sessionDate >= twentyEightDaysAgo;
    }).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Obtenir les dates uniques normalisées
    const uniqueDates = new Set(sessionHistory.map(s => normalizeDate(s.date)));

    // Un jour de repos prévu au planning ne casse pas la série.
    // Si le planning est entièrement vide, aucun jour n'est considéré comme repos
    // (sinon la série ne pourrait jamais être perdue).
    const existingWorkoutIds = new Set(workouts.map(w => w.id));
    const hasPlannedDay = Object.values(weeklySchedule).some(week =>
      Object.values(week || {}).some(ids =>
        (Array.isArray(ids) ? ids : [ids]).some(id => existingWorkoutIds.has(id))
      )
    );
    const isRestDay = (date) => hasPlannedDay &&
      !getScheduledWorkoutIds(weeklySchedule, cycleStartDate, date)
        .some(id => existingWorkoutIds.has(id));

    const { current: currentStreak, best: bestStreak } = computeStreaks(
      [...uniqueDates],
      isRestDay,
      today
    );

    // Nombre de jours avec pratique sur les 7 derniers jours
    let daysWithPractice = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (uniqueDates.has(toLocalDateStr(checkDate))) {
        daysWithPractice++;
      }
    }

    return {
      last7Days: sessionsLast7Days,
      streak: currentStreak, // Streak actuel pour l'accueil
      bestStreak, // Meilleure série de tous les temps (badges acquis définitivement)
      daysWithPractice: daysWithPractice, // Jours pratiqués sur 7 jours pour les stats
      last28Days: sessionsLast28Days,
      totalSessions: sessionHistory.length // Gardé pour les badges
    };
  }, [sessionHistory, weeklySchedule, workouts, cycleStartDate]);

  // Helper pour obtenir le nom et la description traduits d'un badge
  const getBadgeName = (badge) => t(badge.nameKey);
  const getBadgeDescription = (badge) => {
    if (badge.type === 'streak') {
      return t('badges.consecutiveDays', { count: badge.threshold });
    }
    return t('badges.sessionsCompleted', { count: badge.threshold });
  };

  // Calculer les badges obtenus (memoïsé)
  const earnedBadges = useMemo(() => {
    return BADGES.filter(badge => {
      if (badge.type === 'streak') {
        // Basé sur la meilleure série : un badge obtenu n'est jamais perdu
        return stats.bestStreak >= badge.threshold;
      } else if (badge.type === 'sessions') {
        return stats.totalSessions >= badge.threshold;
      }
      return false;
    });
  }, [stats.bestStreak, stats.totalSessions]);

  // Obtenir le prochain badge à débloquer (memoïsé)
  const nextBadge = useMemo(() => {
    const earnedIds = earnedBadges.map(b => b.id);
    return BADGES.find(badge => !earnedIds.includes(badge.id));
  }, [earnedBadges]);

  return { stats, earnedBadges, nextBadge, getBadgeName, getBadgeDescription };
};
