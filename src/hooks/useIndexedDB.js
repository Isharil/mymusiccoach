import { useState, useEffect, useCallback } from 'react';
import { get, set, del, keys, clear } from 'idb-keyval';

// Liste des clés utilisées par l'application
const APP_KEYS = [
  'mmc_exercises',
  'mmc_workouts',
  'mmc_sessionHistory',
  'mmc_goals',
  'mmc_settings',
  'mmc_weeklySchedule',
  'mmc_deletedExercises',
  'mmc_archivedWorkouts',
  'mmc_activeWorkout',
  'mmc_workoutProgress',
  'mmc_currentTempo',
  'mmc_exerciseNotes'
];

/**
 * Migrer les données de localStorage vers IndexedDB (une seule fois)
 */
export async function migrateFromLocalStorage() {
  try {
    // Vérifier si la migration a déjà été faite
    const migrationDone = await get('mmc_migration_done');
    if (migrationDone) {
      return { migrated: false, message: 'Migration déjà effectuée' };
    }

    let migratedCount = 0;

    for (const key of APP_KEYS) {
      const localData = window.localStorage.getItem(key);
      if (localData) {
        // Vérifier si la donnée existe déjà dans IndexedDB
        const existingData = await get(key);
        if (!existingData) {
          await set(key, JSON.parse(localData));
          migratedCount++;
        }
      }
    }

    // Marquer la migration comme terminée
    await set('mmc_migration_done', true);

    if (migratedCount > 0) {
      console.log(`Migration terminée: ${migratedCount} clé(s) migrée(s) vers IndexedDB`);
    }

    return { migrated: true, count: migratedCount };
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return { migrated: false, error: error.message };
  }
}

/**
 * Demander la persistance des données au navigateur
 */
export async function requestStoragePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistance des données: ${isPersisted ? 'accordée' : 'refusée'}`);
      return isPersisted;
    } catch (error) {
      console.error('Erreur lors de la demande de persistance:', error);
      return false;
    }
  }
  return false;
}

/**
 * Vérifier si la persistance est active
 */
export async function checkStoragePersistence() {
  if (navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch (error) {
      return false;
    }
  }
  return false;
}

/**
 * Hook personnalisé pour synchroniser un state avec IndexedDB
 * @param {string} key - Clé utilisée dans IndexedDB
 * @param {any} initialValue - Valeur initiale si aucune donnée n'existe
 * @returns {[any, Function, boolean]} - [valeur, setter, isLoading]
 */
export function useIndexedDB(key, initialValue) {
  const [storedValue, setStoredValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Charger la valeur depuis IndexedDB au montage
  useEffect(() => {
    let isMounted = true;

    const loadValue = async () => {
      try {
        const value = await get(key);
        if (isMounted) {
          if (value !== undefined) {
            setStoredValue(value);
          } else {
            // Si aucune valeur n'existe, sauvegarder la valeur initiale
            await set(key, initialValue);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Erreur lors de la lecture de ${key} depuis IndexedDB:`, error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [key]);

  // Fonction pour mettre à jour la valeur
  const setValue = useCallback(async (value) => {
    try {
      // Permettre les fonctions comme avec useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await set(key, valueToStore);
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de ${key} dans IndexedDB:`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, isLoading];
}

/**
 * Fonction utilitaire pour effacer toutes les données de l'application
 */
export async function clearAppStorage() {
  try {
    for (const key of APP_KEYS) {
      await del(key);
    }
    // Aussi nettoyer localStorage pour être sûr
    APP_KEYS.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch (e) {}
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des données:', error);
  }
}

/**
 * Fonction pour exporter toutes les données de l'application
 */
export async function exportAppData() {
  try {
    const data = {
      exportDate: new Date().toISOString()
    };

    for (const key of APP_KEYS) {
      const value = await get(key);
      if (value !== undefined) {
        // Stocker directement la valeur (déjà en JSON)
        data[key.replace('mmc_', '')] = JSON.stringify(value);
      }
    }

    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    return null;
  }
}

/**
 * Fonction pour importer des données dans l'application
 */
export async function importAppData(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    for (const key of Object.keys(data)) {
      if (key !== 'exportDate' && data[key]) {
        const fullKey = key.startsWith('mmc_') ? key : `mmc_${key}`;
        await set(fullKey, JSON.parse(data[key]));
      }
    }

    return { success: true, message: 'Données importées avec succès' };
  } catch (error) {
    return { success: false, message: `Erreur d'importation: ${error.message}` };
  }
}
