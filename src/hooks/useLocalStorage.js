import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour synchroniser un state avec le localStorage
 * @param {string} key - Clé utilisée dans le localStorage
 * @param {any} initialValue - Valeur initiale si aucune donnée n'existe
 * @returns {[any, Function]} - [valeur, setter] comme useState
 */
export function useLocalStorage(key, initialValue) {
  // Récupérer la valeur initiale depuis le localStorage ou utiliser la valeur par défaut
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erreur lors de la lecture de ${key} depuis le localStorage:`, error);
      return initialValue;
    }
  });

  // Sauvegarder dans le localStorage à chaque changement
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de ${key} dans le localStorage:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

/**
 * Fonction utilitaire pour effacer toutes les données de l'application
 */
export function clearAppStorage() {
  const keys = [
    'mmc_exercises',
    'mmc_workouts',
    'mmc_sessionHistory',
    'mmc_goals',
    'mmc_settings',
    'mmc_weeklySchedule',
    'mmc_deletedExercises',
    'mmc_archivedWorkouts'
  ];

  keys.forEach(key => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erreur lors de la suppression de ${key}:`, error);
    }
  });
}

/**
 * Fonction pour exporter toutes les données de l'application
 */
export function exportAppData() {
  const data = {
    exercises: localStorage.getItem('mmc_exercises'),
    workouts: localStorage.getItem('mmc_workouts'),
    sessionHistory: localStorage.getItem('mmc_sessionHistory'),
    goals: localStorage.getItem('mmc_goals'),
    settings: localStorage.getItem('mmc_settings'),
    weeklySchedule: localStorage.getItem('mmc_weeklySchedule'),
    deletedExercises: localStorage.getItem('mmc_deletedExercises'),
    archivedWorkouts: localStorage.getItem('mmc_archivedWorkouts'),
    exportDate: new Date().toISOString()
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Fonction pour importer des données dans l'application
 */
export function importAppData(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    Object.keys(data).forEach(key => {
      if (key !== 'exportDate' && data[key]) {
        localStorage.setItem(`mmc_${key}`, data[key]);
      }
    });

    return { success: true, message: 'Données importées avec succès' };
  } catch (error) {
    return { success: false, message: `Erreur d'importation: ${error.message}` };
  }
}
