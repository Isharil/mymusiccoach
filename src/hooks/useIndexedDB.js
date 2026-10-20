import { useState, useEffect, useCallback, useRef } from 'react';
import { get, set, del } from 'idb-keyval';
import { BACKUP_KEYS, createBackup } from '../utils/backup';
import { deleteAllAttachments, exportAttachments, importAttachments } from '../utils/attachments';

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
  'mmc_exerciseNotes',
  'mmc_pieces'
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
    } catch {
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
  // Dernière valeur connue, pour que les mises à jour fonctionnelles successives
  // ne partent pas d'une valeur périmée (closure du dernier rendu)
  const valueRef = useRef(initialValue);

  // Charger la valeur depuis IndexedDB au montage
  useEffect(() => {
    let isMounted = true;

    const loadValue = async () => {
      try {
        const value = await get(key);
        if (isMounted) {
          if (value !== undefined) {
            valueRef.current = value;
            setStoredValue(value);
          } else {
            // Si aucune valeur n'existe, sauvegarder la valeur initiale
            // (via la ref : la valeur passée au hook peut être recréée à chaque rendu)
            await set(key, valueRef.current);
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
    // Permettre les fonctions comme avec useState
    const valueToStore = value instanceof Function ? value(valueRef.current) : value;
    valueRef.current = valueToStore;
    setStoredValue(valueToStore);
    try {
      await set(key, valueToStore);
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de ${key} dans IndexedDB:`, error);
    }
  }, [key]);

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
    await deleteAllAttachments();
    // Aussi nettoyer localStorage pour être sûr
    APP_KEYS.forEach(key => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // localStorage indisponible (navigation privée...) : rien à nettoyer
      }
    });
  } catch (error) {
    console.error('Erreur lors de la suppression des données:', error);
  }
}

/**
 * Exporte toutes les données de l'application (format décrit dans utils/backup.js)
 * @returns {Promise<string|null>} contenu du fichier, ou null en cas d'erreur
 */
export async function exportAppData(appVersion) {
  try {
    const values = {};
    for (const key of BACKUP_KEYS) {
      values[key] = await get(`mmc_${key}`);
    }
    return createBackup(values, { appVersion, files: await exportAttachments() });
  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    return null;
  }
}

// Session en cours : effacée si la sauvegarde n'en contient pas, pour ne pas
// mélanger une session de l'appareil avec les données restaurées
const TRANSIENT_KEYS = ['activeWorkout', 'workoutProgress', 'currentTempo', 'exerciseNotes'];

/**
 * Écrit dans IndexedDB les données d'une sauvegarde déjà vérifiée par parseBackup.
 * Les données absentes de la sauvegarde sont conservées, sauf la session en cours.
 * @param {Object|null} files - pièces jointes de la sauvegarde ; null pour une ancienne sauvegarde
 *   (fichiers encore dans les exercices, rangés à part au prochain démarrage)
 */
export async function importAppData(values, files = null) {
  if (files) {
    await deleteAllAttachments();
    await importAttachments(files);
  }
  for (const key of BACKUP_KEYS) {
    if (key in values) {
      await set(`mmc_${key}`, values[key]);
    } else if (TRANSIENT_KEYS.includes(key)) {
      await del(`mmc_${key}`);
    }
  }
}
