import { createElement } from 'react';
import { CATEGORY_KEYS, DIFFICULTY_KEYS, EXAMPLE_EXERCISE_KEYS, EXAMPLE_WORKOUT_KEYS } from '../constants/appData';
import { parseLocalDate } from '../utils/practiceStats';

// Fonctions d'affichage dépendant de la langue choisie
export const useDisplayHelpers = (t, language) => {
  // Les catégories inconnues (session en texte libre, import) restent telles quelles
  const translateCategory = (cat) => CATEGORY_KEYS[cat] ? t(`categories.${CATEGORY_KEYS[cat]}`) : cat;
  const translateDifficulty = (diff) => DIFFICULTY_KEYS[diff] ? t(`difficulties.${DIFFICULTY_KEYS[diff]}`) : diff;

  // Le contenu d'exemple est affiché dans la langue choisie tant qu'il n'a pas été modifié
  const exerciseName = (ex) =>
    ex?.isExample && EXAMPLE_EXERCISE_KEYS[ex.id] ? t(`examples.${EXAMPLE_EXERCISE_KEYS[ex.id]}Name`) : ex?.name;
  const exerciseDescription = (ex) =>
    ex?.isExample && EXAMPLE_EXERCISE_KEYS[ex.id] ? t(`examples.${EXAMPLE_EXERCISE_KEYS[ex.id]}Desc`) : ex?.description;
  const workoutName = (w) =>
    w?.isExample && EXAMPLE_WORKOUT_KEYS[w.id] ? t(`examples.${EXAMPLE_WORKOUT_KEYS[w.id]}Name`) : w?.name;

  // Les séries sont stockées sous la forme "3 séries" : on réaffiche le nombre dans la langue choisie
  const formatSets = (sets) => {
    const match = String(sets ?? '').match(/^(\d+)/);
    return match ? t('common.setsCount', { count: Number(match[1]) }) : sets;
  };

  // "YYYY-MM-DD" -> date lisible dans la langue choisie
  const formatDisplayDate = (dateStr, options = { day: 'numeric', month: 'short', year: 'numeric' }) =>
    dateStr ? parseLocalDate(dateStr).toLocaleDateString(language || 'en', options) : '';

  // Affiche en gras les passages entourés de ** dans un texte traduit
  const renderBold = (text) => text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? createElement('strong', { key: i }, part) : part
  );

  return { translateCategory, translateDifficulty, exerciseName, exerciseDescription, workoutName, formatSets, formatDisplayDate, renderBold };
};
