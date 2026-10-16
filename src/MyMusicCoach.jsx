import { useState, useEffect, useCallback, useRef } from 'react';
import { useIndexedDB, exportAppData, importAppData, migrateFromLocalStorage, requestStoragePersistence } from './hooks/useIndexedDB';
import { App as CapacitorApp } from '@capacitor/app';
import Metronome from './components/Metronome';
import { useTranslation } from './hooks/useTranslation';
import { useDisplayHelpers } from './hooks/useDisplayHelpers';
import { usePracticeStats } from './hooks/usePracticeStats';
import { useNotifications } from './hooks/useNotifications';
import { useTheme } from './hooks/useTheme';
import { useFileExport } from './hooks/useFileExport';
import { useTimer } from './hooks/useTimer';
import { DEFAULT_SETTINGS, DEFAULT_EXERCISES, DEFAULT_WORKOUTS, DEFAULT_SCHEDULE } from './constants/appData';
import { getCycleWeekNumber, getDayKey, getMondayOf } from './utils/practiceStats';
import { maxIdOf, normalizeExerciseFields } from './utils/exercises';
import { buildProgressReport } from './utils/progressReport';
import { elapsedMinutes, formatMinutes, parseMinutesInput, plannedMinutes } from './utils/practiceTime';
import { parseBackup } from './utils/backup';
import {
  MAX_ATTACHMENT_MB, MAX_ATTACHMENT_SIZE, deleteAttachment, deleteOrphanAttachments, loadAttachment,
  moveInlineFiles, saveAttachment
} from './utils/attachments';

// Erreur de lecture d'une sauvegarde (utils/backup.js) -> message affiché
const BACKUP_ERROR_MESSAGES = {
  invalid: 'messages.backupInvalid',
  sessionFile: 'messages.backupIsSessionFile',
  notABackup: 'messages.backupNotABackup',
  newerVersion: 'messages.backupNewerVersion',
};
import { AppContext } from './context/AppContext';
import HomePage from './components/pages/HomePage';
import ScheduleModal from './components/modals/ScheduleModal';
import ActiveWorkoutPage from './components/pages/ActiveWorkoutPage';
import LibraryPage from './components/pages/LibraryPage';
import StatsPage from './components/pages/StatsPage';
import SettingsPage from './components/pages/SettingsPage';
import ExerciseFormModal from './components/modals/ExerciseFormModal';
import WorkoutFormModal from './components/modals/WorkoutFormModal';
import ExerciseDetailModal from './components/modals/ExerciseDetailModal';
import BadgesModal from './components/modals/BadgesModal';
import ReportPeriodModal from './components/modals/ReportPeriodModal';
import PrivacyPolicyModal from './components/modals/PrivacyPolicyModal';
import ImportSessionModal from './components/modals/ImportSessionModal';
import EditSessionModal from './components/modals/EditSessionModal';
import ExportChoiceModal from './components/modals/ExportChoiceModal';
import Toasts from './components/Toasts';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';

const MyMusicCoach = () => {
  // État pour la migration et l'initialisation
  const [isAppReady, setIsAppReady] = useState(false);
  const [, setStoragePersisted] = useState(false);

  const [activeTab, setActiveTab] = useState('home');
  const [activeWorkout, setActiveWorkout, activeWorkoutLoading] = useIndexedDB('mmc_activeWorkout', null);
  const [workoutProgress, setWorkoutProgress, workoutProgressLoading] = useIndexedDB('mmc_workoutProgress', {});
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [metronomeTempo, setMetronomeTempo] = useState(null);
  const [currentTempo, setCurrentTempo, currentTempoLoading] = useIndexedDB('mmc_currentTempo', {});
  const [exerciseNotes, setExerciseNotes, exerciseNotesLoading] = useIndexedDB('mmc_exerciseNotes', {}); // Notes/commentaires par exercice
  const [showSchedule, setShowSchedule] = useState(false);
  const [sessionHistory, setSessionHistory, sessionHistoryLoading] = useIndexedDB('mmc_sessionHistory', []);
  const [libraryFilter, setLibraryFilter] = useState('Tous');
  const [librarySubTab, setLibrarySubTab] = useState('exercises');
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionProgress, setEditingSessionProgress] = useState({});
  const [editingSessionDuration, setEditingSessionDuration] = useState(''); // minutes saisies (texte)
  const [showExerciseMenu, setShowExerciseMenu] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState('none');
  const [editingExercise, setEditingExercise] = useState(null);

  // États pour les réglages
  const [settings, setSettings, settingsLoading] = useIndexedDB('mmc_settings', DEFAULT_SETTINGS);

  // Hook de traduction
  const { t } = useTranslation(settings.language);

  // Traductions et mise en forme (catégories, contenu d'exemple, dates...)
  const { translateCategory, translateDifficulty, exerciseName, exerciseDescription, workoutName, formatSets, formatDisplayDate, renderBold } = useDisplayHelpers(t, settings.language);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [deletedExercises, setDeletedExercises, deletedExercisesLoading] = useIndexedDB('mmc_deletedExercises', []);
  const [showTrash, setShowTrash] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [archivedWorkouts, setArchivedWorkouts, archivedWorkoutsLoading] = useIndexedDB('mmc_archivedWorkouts', []);
  const [showArchive, setShowArchive] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Fonction pour afficher un toast (remplace alert())
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const [exercises, setExercises, exercisesLoading] = useIndexedDB('mmc_exercises', DEFAULT_EXERCISES);
  const [workouts, setWorkouts, workoutsLoading] = useIndexedDB('mmc_workouts', DEFAULT_WORKOUTS);
  const [weeklySchedule, setWeeklySchedule, weeklyScheduleLoading] = useIndexedDB('mmc_weeklySchedule', DEFAULT_SCHEDULE);

  const [viewingWeek, setViewingWeek] = useState(1); // Pour le modal de planning

  // Vérifier si toutes les données sont chargées
  const isDataLoading = sessionHistoryLoading || settingsLoading ||
    deletedExercisesLoading || archivedWorkoutsLoading || exercisesLoading ||
    workoutsLoading || weeklyScheduleLoading || activeWorkoutLoading ||
    workoutProgressLoading || currentTempoLoading || exerciseNotesLoading;

  // Migration weeklySchedule : ancien format (number|null) → nouveau format (array)
  useEffect(() => {
    if (weeklyScheduleLoading) return;
    let needsMigration = false;
    const migrated = {};
    for (const weekKey of Object.keys(weeklySchedule)) {
      migrated[weekKey] = {};
      for (const day of Object.keys(weeklySchedule[weekKey])) {
        const val = weeklySchedule[weekKey][day];
        if (val === null) { migrated[weekKey][day] = []; needsMigration = true; }
        else if (typeof val === 'number') { migrated[weekKey][day] = [val]; needsMigration = true; }
        else { migrated[weekKey][day] = val; }
      }
    }
    if (needsMigration) setWeeklySchedule(migrated);
  }, [weeklyScheduleLoading, weeklySchedule, setWeeklySchedule]);

  // Migration (une fois par lancement) : fichiers joints sortis des exercices (ancien champ fileData),
  // puis suppression des fichiers que plus aucun exercice ne référence
  const attachmentsCheckedRef = useRef(false);
  useEffect(() => {
    if (exercisesLoading || deletedExercisesLoading || attachmentsCheckedRef.current) return;
    attachmentsCheckedRef.current = true;
    const startedAt = Date.now();

    // Remplace uniquement les exercices migrés : la liste a pu changer pendant la migration
    const applyMigrated = (setList, migrated) => {
      const byId = new Map(migrated.filter(ex => ex.attachment).map(ex => [ex.id, ex]));
      setList(prev => prev.map(ex => (ex.fileData && byId.has(ex.id) ? byId.get(ex.id) : ex)));
    };

    (async () => {
      try {
        const active = await moveInlineFiles(exercises);
        if (active.changed) applyMigrated(setExercises, active.exercises);
        const deleted = await moveInlineFiles(deletedExercises);
        if (deleted.changed) applyMigrated(setDeletedExercises, deleted.exercises);
        await deleteOrphanAttachments([active.exercises, deleted.exercises], startedAt);
      } catch (error) {
        console.error('Erreur migration des pièces jointes:', error);
      }
    })();
  }, [exercisesLoading, deletedExercisesLoading, exercises, deletedExercises, setExercises, setDeletedExercises]);

  // Migration depuis localStorage et demande de persistance au démarrage
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Migrer les données de localStorage vers IndexedDB
        const migrationResult = await migrateFromLocalStorage();
        if (migrationResult.migrated && migrationResult.count > 0) {
          console.log(`Migration réussie: ${migrationResult.count} éléments migrés`);
        }

        // Demander la persistance des données
        const persisted = await requestStoragePersistence();
        setStoragePersisted(persisted);

        setIsAppReady(true);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du stockage:', error);
        setIsAppReady(true); // Continuer même en cas d'erreur
      }
    };

    initializeStorage();
  }, []);

  // Statistiques et badges
  const { stats, earnedBadges, nextBadge, getBadgeName, getBadgeDescription } = usePracticeStats({
    sessionHistory, weeklySchedule, workouts, exercises, cycleStartDate: settings.cycleStartDate, t
  });

  // Notifications locales (Android)
  const { isNativePlatform, notificationPermission, requestNotificationPermission, sendTestNotification, sendImmediateNotification } =
    useNotifications({ settings, t, showToast });

  // Version de l'app native installée (Android), pour vérifier que le code web embarqué est à jour
  const [nativeAppInfo, setNativeAppInfo] = useState(null);
  useEffect(() => {
    if (!isNativePlatform) return;
    CapacitorApp.getInfo()
      .then(setNativeAppInfo)
      .catch(error => console.error('Erreur lecture version native:', error));
  }, [isNativePlatform]);

  const isDarkMode = useTheme(settings.theme);

  // Scroll en haut à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Export de fichiers (sauvegarde, sessions, rapport)
  const { exportModalData, setExportModalData, downloadFile, saveToDownloads, shareFile } = useFileExport({ t, showToast });

  // Fonctions d'export/import des données
  const handleExportData = async () => {
    try {
      const dataToExport = await exportAppData(__APP_VERSION__);
      if (!dataToExport) {
        showToast(t('messages.exportPrepError'), 'error');
        return;
      }
      const fileName = `mymusiccoach-backup-${new Date().toISOString().split('T')[0]}.json`;
      await downloadFile(dataToExport, fileName, 'application/json');
    } catch (error) {
      showToast(t('messages.exportError'), 'error');
      console.error(error);
    }
  };

  // Restauration d'une sauvegarde : vérification complète, puis confirmation avant de remplacer les données
  const handleImportData = (event) => {
    const file = event.target.files[0];
    // Permet de re-sélectionner le même fichier ensuite
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const backup = parseBackup(e.target.result);
      if (!backup.ok) {
        if (backup.key) console.error(`Sauvegarde refusée : donnée "${backup.key}" invalide`);
        showToast(t(BACKUP_ERROR_MESSAGES[backup.error]), 'error', 6000);
        return;
      }

      const { exportDate, exercises: exerciseCount, workouts: workoutCount, sessions } = backup.summary;
      const date = exportDate
        ? new Date(exportDate).toLocaleDateString(settings.language || 'en', { dateStyle: 'long' })
        : '?';
      if (!window.confirm(t('messages.backupConfirm', { date, exercises: exerciseCount, workouts: workoutCount, sessions }))) {
        return;
      }

      try {
        await importAppData(backup.values, backup.files);
        showToast(t('messages.dataImported'), 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        console.error(error);
        showToast(t('messages.importError'), 'error');
      }
    };
    reader.readAsText(file);
  };

  // Jour actuel, sous la forme des clés du planning ('lundi', 'mardi', ...)
  const getCurrentDay = () => getDayKey(new Date());

  // Auto-initialisation du cycleStartDate au premier lancement : lundi de la semaine en cours
  useEffect(() => {
    if (settingsLoading || settings.cycleStartDate) return;
    setSettings(prev => ({ ...prev, cycleStartDate: getMondayOf(new Date()) }));
  }, [settingsLoading, settings.cycleStartDate, setSettings]);

  // Semaine actuelle du cycle de 4 semaines (1-4)
  const getCurrentWeekNumber = () => {
    return getCycleWeekNumber(new Date(), settings.cycleStartDate || getMondayOf(new Date()));
  };

  // Fonction pour obtenir la date d'aujourd'hui au format ISO (heure locale, pas UTC)
  const getTodayDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Fonction pour obtenir les sessions du jour (tableau)
  const getTodayWorkouts = () => {
    const currentDay = getCurrentDay();
    const currentWeek = getCurrentWeekNumber();
    const weekKey = `semaine${currentWeek}`;
    const workoutIds = weeklySchedule[weekKey]?.[currentDay] || [];
    if (!Array.isArray(workoutIds)) return workoutIds ? [workouts.find(w => w.id === workoutIds)].filter(Boolean) : [];
    return workoutIds.map(id => workouts.find(w => w.id === id)).filter(Boolean);
  };

  // Vérifier si une session spécifique est complétée aujourd'hui
  const isWorkoutCompletedToday = (workoutId) => {
    const today = getTodayDate();
    return sessionHistory.some(s => s.date === today && s.workoutId === workoutId);
  };

  // Vérifier si TOUTES les sessions d'aujourd'hui ont été faites
  const isTodaySessionCompleted = () => {
    const todayWorkouts = getTodayWorkouts();
    if (todayWorkouts.length === 0) return false;
    return todayWorkouts.every(workout => isWorkoutCompletedToday(workout.id));
  };

  // Récupérer la session terminée pour un workout spécifique aujourd'hui
  const getCompletedSessionForWorkout = (workoutId) => {
    const today = getTodayDate();
    return sessionHistory.find(s => s.date === today && s.workoutId === workoutId);
  };

  const saveTempo = (exerciseId) => {
    const tempo = parseInt(currentTempo[exerciseId]);
    if (!tempo || tempo < 20 || tempo > 300) {
      showToast(t('messages.validTempo'), 'warning');
      return;
    }

    const today = new Date();
    // Utiliser la date locale (pas UTC)
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const updatedExercises = exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          tempoHistory: [...ex.tempoHistory, { date: dateStr, tempo }]
        };
      }
      return ex;
    });

    setExercises(updatedExercises);
    setCurrentTempo({...currentTempo, [exerciseId]: ''});
    
    const updatedExercise = updatedExercises.find(ex => ex.id === exerciseId);
    setSelectedExercise(updatedExercise);
  };

  // durationMinutes : durée saisie à la fin de la session ; à défaut, temps écoulé depuis le début
  // (ou durée prévue des exercices validés pour une session commencée avant la mesure du temps)
  const saveSession = (workout, durationMinutes = null) => {
    const now = new Date();
    // Utiliser la date locale (pas UTC) pour éviter les décalages de fuseau horaire
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const workoutExercises = workout.exercises;
    let completed = 0;
    let skipped = 0;
    const exerciseProgress = {}; // Statut par exercice, nécessaire pour modifier la session plus tard

    workoutExercises.forEach(exId => {
      const status = workoutProgress[`${workout.id}-${exId}`];
      if (status === 'completed') completed++;
      if (status === 'skipped') skipped++;
      if (status) exerciseProgress[exId] = status;
    });
    
    // Collecter les notes pour cette session
    const sessionNotes = {};
    workoutExercises.forEach(exId => {
      if (exerciseNotes[exId]) {
        sessionNotes[exId] = exerciseNotes[exId];
      }
    });

    const newSession = {
      id: sessionHistory.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1,
      date: dateStr,
      time: timeStr,
      workoutId: workout.id,
      workoutName: workoutName(workout),
      completed,
      skipped,
      total: workoutExercises.length,
      exerciseProgress,
      durationMinutes: durationMinutes
        ?? (workout.startedAt
          ? elapsedMinutes(workout.startedAt)
          : plannedMinutes(Object.keys(exerciseProgress).filter(id => exerciseProgress[id] === 'completed').map(Number), exercises)),
      notes: sessionNotes // Notes/observations de l'élève
    };

    setSessionHistory([...sessionHistory, newSession]);
    setActiveWorkout(null);
    setWorkoutProgress({});
    setExerciseNotes({}); // Réinitialiser les notes

    // Notification de félicitations (uniquement sur mobile natif)
    sendImmediateNotification(
      `🎉 ${t('messages.sessionFinished')}`,
      t('messages.congratulations', { name: settings.userName, count: completed, total: workoutExercises.length }),
      100
    );
  };

  // Fonction pour démarrer l'édition d'une session terminée
  const startEditSession = (session) => {
    const workout = workouts.find(w => w.id === session.workoutId);
    if (!workout) {
      showToast(t('messages.sessionNoLongerExists'), 'error');
      return;
    }

    // Initialiser le progress avec les données existantes ou des valeurs par défaut
    const progress = {};
    if (session.exerciseProgress) {
      workout.exercises.forEach(exId => {
        if (session.exerciseProgress[exId]) {
          progress[exId] = session.exerciseProgress[exId];
        }
      });
    } else {
      // Anciennes sessions sans statut par exercice : on ne sait pas lesquels ont été sautés.
      // On reconstitue un statut cohérent avec les compteurs enregistrés
      // (les N premiers validés, les suivants sautés) pour ne pas fausser les stats.
      let remainingCompleted = session.completed ?? workout.exercises.length;
      workout.exercises.forEach(exId => {
        progress[exId] = remainingCompleted > 0 ? 'completed' : 'skipped';
        remainingCompleted--;
      });
    }

    setEditingSession(session);
    setEditingSessionProgress(progress);
    setEditingSessionDuration(session.durationMinutes ? String(session.durationMinutes) : '');
  };

  // Fonction pour sauvegarder les modifications d'une session
  const updateSession = () => {
    if (!editingSession) return;

    let completed = 0;
    let skipped = 0;

    Object.values(editingSessionProgress).forEach(status => {
      if (status === 'completed') completed++;
      if (status === 'skipped') skipped++;
    });

    const updatedSessions = sessionHistory.map(session => {
      if (session.id === editingSession.id) {
        return {
          ...session,
          completed,
          skipped,
          exerciseProgress: { ...editingSessionProgress },
          // Durée modifiée ; si le champ est vide ou invalide, on garde l'ancienne
          durationMinutes: parseMinutesInput(editingSessionDuration) ?? session.durationMinutes
        };
      }
      return session;
    });

    setSessionHistory(updatedSessions);
    setEditingSession(null);
    setEditingSessionProgress({});
  };

  // Fonction pour démarrer une session avec notification
  const startWorkout = (workout) => {
    // L'heure de début sert à mesurer le temps de pratique
    setActiveWorkout({ ...workout, startedAt: Date.now() });

    // Notification de début de session (uniquement sur mobile natif)
    sendImmediateNotification(
      `🎵 ${t('messages.sessionStarted')}`,
      `${workoutName(workout)} - ${t('messages.exercisesToPractice', { count: workout.exercises.length })} ${t('messages.goodLuck')}`,
      101
    );
  };

  const deleteExercise = (exerciseId) => {
    const exerciseToDelete = exercises.find(ex => ex.id === exerciseId);
    if (exerciseToDelete) {
      setDeletedExercises([...deletedExercises, exerciseToDelete]);
      setExercises(exercises.filter(ex => ex.id !== exerciseId));
      setSelectedExercise(null);
    }
  };

  const restoreExercise = (exerciseId) => {
    const exerciseToRestore = deletedExercises.find(ex => ex.id === exerciseId);
    if (exerciseToRestore) {
      setExercises([...exercises, exerciseToRestore]);
      setDeletedExercises(deletedExercises.filter(ex => ex.id !== exerciseId));
    }
  };

  const permanentlyDeleteExercise = (exerciseId) => {
    if (window.confirm(t('messages.deleteExerciseConfirm'))) {
      const exercise = deletedExercises.find(ex => ex.id === exerciseId);
      if (exercise?.attachment) deleteAttachment(exercise.attachment.id);
      setDeletedExercises(deletedExercises.filter(ex => ex.id !== exerciseId));
    }
  };

  // Les ids des éléments en corbeille / archivés restent réservés : ils peuvent être restaurés
  // et le planning peut encore y faire référence.
  const getNextExerciseId = () => maxIdOf([...exercises, ...deletedExercises]) + 1;
  const getNextWorkoutId = () => maxIdOf([...workouts, ...archivedWorkouts]) + 1;

  // Archive la session. Elle reste dans le planning pour retrouver sa place si on la restaure.
  const deleteWorkout = (workoutId) => {
    const workoutToArchive = workouts.find(w => w.id === workoutId);
    if (workoutToArchive) {
      setArchivedWorkouts([...archivedWorkouts, workoutToArchive]);
      setWorkouts(workouts.filter(w => w.id !== workoutId));
      if (editingWorkout && editingWorkout.id === workoutId) {
        setEditingWorkout(null);
        setShowCreateWorkout(false);
      }
    }
  };

  // Retire une session de toutes les journées du planning
  const removeWorkoutFromSchedule = (workoutId) => {
    setWeeklySchedule(prev => Object.fromEntries(
      Object.entries(prev).map(([weekKey, days]) => [
        weekKey,
        Object.fromEntries(Object.entries(days).map(([day, ids]) => [
          day,
          (Array.isArray(ids) ? ids : (ids ? [ids] : [])).filter(id => id !== workoutId)
        ]))
      ])
    ));
  };

  const restoreWorkout = (workoutId) => {
    const workoutToRestore = archivedWorkouts.find(w => w.id === workoutId);
    if (workoutToRestore) {
      setWorkouts([...workouts, workoutToRestore]);
      setArchivedWorkouts(archivedWorkouts.filter(w => w.id !== workoutId));
    }
  };

  const permanentlyDeleteWorkout = (workoutId) => {
    if (window.confirm(t('messages.deleteSessionConfirm'))) {
      setArchivedWorkouts(archivedWorkouts.filter(w => w.id !== workoutId));
      removeWorkoutFromSchedule(workoutId);
    }
  };

  // Fichier choisi dans le formulaire d'exercice : gardé en mémoire jusqu'à l'enregistrement
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_SIZE) {
      showToast(t('messages.fileTooLarge', { max: MAX_ATTACHMENT_MB }), 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFile({
        name: file.name,
        data: event.target.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Enregistre le fichier choisi dans le formulaire (s'il y en a un) et renvoie sa référence
  const storeUploadedFile = (type) =>
    uploadedFile && type === 'file' ? saveAttachment(uploadedFile) : Promise.resolve(null);

  const createExercise = async (formData) => {
    const id = getNextExerciseId();
    const attachment = await storeUploadedFile(formData.type);
    const newExercise = {
      id,
      ...normalizeExerciseFields(formData),
      ...(attachment && { attachment }),
      tempoHistory: []
    };
    setExercises(prev => [...prev, newExercise]);
  };

  const updateExercise = async (exercise, formData) => {
    const attachment = await storeUploadedFile(formData.type);
    if (attachment && exercise.attachment) {
      await deleteAttachment(exercise.attachment.id);
    }
    const updated = {
      ...exercise,
      ...normalizeExerciseFields(formData),
      ...(attachment && { attachment }),
      isExample: false,
    };
    setExercises(prev => prev.map(ex => (ex.id === exercise.id ? updated : ex)));
  };

  const createOrUpdateWorkout = (workoutData) => {
    if (editingWorkout) {
      setWorkouts(workouts.map(w => w.id === editingWorkout.id ? { ...w, ...workoutData, isExample: false } : w));
      setEditingWorkout(null);
      setShowCreateWorkout(false);
    } else {
      const newWorkout = {
        id: getNextWorkoutId(),
        ...workoutData
      };
      setWorkouts([...workouts, newWorkout]);
      setShowCreateWorkout(false);
    }
  };

  // ===== IMPORT/EXPORT DE SESSIONS =====
  const exportWorkout = async (workout) => {
    try {
      if (!workout || !workout.exercises) {
        showToast(t('messages.invalidSession'), 'error');
        return;
      }

      // Récupérer les exercices de la session
      const workoutExercises = (await Promise.all(workout.exercises.map(async exId => {
        const exercise = exercises.find(ex => ex.id === exId);
        if (!exercise) return null;
        // Retirer l'ID (conflits à l'import) et la référence locale à la pièce jointe
        // eslint-disable-next-line no-unused-vars
        const { id, attachment, ...exerciseData } = exercise;
        // Le fichier joint voyage avec la session (format fileData, lisible par toutes les versions)
        const file = attachment ? await loadAttachment(attachment.id) : null;
        // Le contenu d'exemple est exporté dans la langue affichée
        return {
          ...exerciseData,
          ...(file && { fileData: file }),
          name: exerciseName(exercise),
          description: exerciseDescription(exercise),
          isExample: false
        };
      }))).filter(Boolean);

      // Créer l'objet à exporter
      const exportData = {
        version: "1.0",
        appName: "MyMusicCoach",
        exportDate: new Date().toISOString(),
        workout: {
          name: workoutName(workout),
          duration: workout.duration,
          category: workout.category,
          exerciseCount: workoutExercises.length
        },
        exercises: workoutExercises
      };

      // Créer le fichier JSON et télécharger
      const jsonContent = JSON.stringify(exportData, null, 2);
      const fileName = `mymusiccoach-session-${new Date().toISOString().split('T')[0]}.json`;
      await downloadFile(jsonContent, fileName, 'application/json');
    } catch (error) {
      showToast(t('messages.workoutExportError', { error: error.message }), 'error');
      console.error('Export workout error:', error);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast(t('messages.fileMustBeJson'), 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importData = JSON.parse(event.target.result);

        // Vérifier la structure du fichier
        if (!importData.version || !importData.workout || !importData.exercises) {
          showToast(t('messages.invalidFileFormat'), 'error');
          return;
        }

        if (importData.appName !== "MyMusicCoach") {
          if (!window.confirm(t('messages.notFromApp'))) {
            return;
          }
        }

        // Importer les exercices avec de nouveaux ids
        const firstNewExerciseId = getNextExerciseId();
        const workoutId = getNextWorkoutId();
        const newExercises = importData.exercises.map((exerciseData, index) => {
          // Une éventuelle référence de pièce jointe désigne un fichier de l'autre appareil
          // eslint-disable-next-line no-unused-vars
          const { attachment, ...data } = exerciseData;
          return { ...data, id: firstNewExerciseId + index, tempoHistory: data.tempoHistory || [] };
        });

        // Les fichiers joints arrivent dans l'exercice (fileData) : on les range à part
        const { exercises: storedExercises } = await moveInlineFiles(newExercises);
        setExercises(prev => [...prev, ...storedExercises]);

        // Créer la session avec les nouveaux IDs
        const newWorkout = {
          id: workoutId,
          name: importData.workout.name,
          duration: importData.workout.duration,
          category: importData.workout.category,
          exercises: storedExercises.map(ex => ex.id)
        };

        setWorkouts(prev => [...prev, newWorkout]);

        setShowImportModal(false);

      } catch (error) {
        console.error('Erreur import:', error);
        showToast(t('messages.importError'), 'error');
      }
    };
    reader.readAsText(file);
  };

  // Chronomètre d'exercice
  const { timerActive, timerPaused, timerSeconds, timerFinished, setTimerFinished, startTimer, pauseTimer, resumeTimer, stopTimer } = useTimer();

  // Rapport de progression (HTML à imprimer en PDF)
  const generateProgressReport = async (weeks) => {
    setShowExportModal(false);
    const { html, fileName } = buildProgressReport({
      weeks, sessionHistory, exercises, settings, t, exerciseName, formatDisplayDate
    });
    await downloadFile(html, fileName, 'text/html');
  };

  // Écran de chargement pendant l'initialisation
  if (!isAppReady || isDataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-700 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">{t('messages.loading')}</p>
        </div>
      </div>
    );
  }

  // Valeurs partagées avec les pages et fenêtres (voir context/AppContext.js)
  const appContext = {
    activeTab, activeWorkout, archivedWorkouts, calendarMonth, calendarYear, createExercise,
    createOrUpdateWorkout, currentTempo, deleteExercise, deleteWorkout, deletedExercises,
    earnedBadges, editingExercise, editingSession, editingSessionProgress, editingWorkout,
    exerciseDescription, exerciseName, exerciseNotes, exercises, exportModalData, exportWorkout,
    formatDisplayDate, formatSets, generateProgressReport, getBadgeDescription, getBadgeName,
    getCompletedSessionForWorkout, getCurrentDay, getCurrentWeekNumber, getNextWorkoutId,
    getTodayWorkouts, handleExportData, handleFileUpload, handleImportData, handleImportFile,
    isDarkMode, isNativePlatform, isTodaySessionCompleted, isWorkoutCompletedToday, libraryFilter,
    librarySubTab, metronomeTempo, nativeAppInfo, newExerciseType, nextBadge, notificationPermission,
    onboardingStep, pauseTimer, permanentlyDeleteExercise, permanentlyDeleteWorkout, renderBold,
    requestNotificationPermission, restoreExercise, restoreWorkout, resumeTimer, saveSession,
    saveTempo, saveToDownloads, selectedExercise, sendTestNotification, sessionHistory, setActiveTab,
    setActiveWorkout, setCalendarMonth, setCalendarYear, setCurrentTempo, setEditingExercise,
    setEditingSession, setEditingSessionProgress, setEditingWorkout, setExerciseNotes, setExercises,
    setExportModalData, setLibraryFilter, setLibrarySubTab, setMetronomeTempo, setNewExerciseType,
    setOnboardingStep, setSelectedExercise, setSettings, setShowAllBadges, setShowAllHistory,
    setShowArchive, setShowCreateExercise, setShowCreateWorkout, setShowExerciseMenu,
    setShowExportModal, setShowImportModal, setShowMetronome, setShowPrivacyPolicy, setShowSchedule,
    setShowTrash, setTimerFinished, setToasts, setUploadedFile, setViewingWeek, setWeeklySchedule,
    setWorkoutProgress, setWorkouts, settings, shareFile, showAllHistory, showArchive,
    showExerciseMenu, showToast, showTrash, startEditSession, startTimer, startWorkout, stats,
    stopTimer, t, timerActive, timerFinished, timerPaused, timerSeconds, toasts, translateCategory,
    translateDifficulty, updateExercise, updateSession, uploadedFile, viewingWeek, weeklySchedule, workoutName,
    workoutProgress, workouts,
    // Temps de pratique
    editingSessionDuration, setEditingSessionDuration, formatMinutes
  };

  return (
    <AppContext.Provider value={appContext}>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{paddingTop: 'env(safe-area-inset-top, 12px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'}}>
        {activeTab === 'home' && !activeWorkout && <HomePage />}
        {showSchedule && <ScheduleModal />}
        {activeWorkout && <ActiveWorkoutPage />}
        {activeTab === 'library' && <LibraryPage />}
        {activeTab === 'stats' && <StatsPage />}
        {activeTab === 'settings' && <SettingsPage />}
        {showCreateExercise && <ExerciseFormModal />}
        {showCreateWorkout && <WorkoutFormModal />}
        {selectedExercise && <ExerciseDetailModal />}

        {/* Modal Métronome */}
        {showMetronome && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6"
            onClick={() => setShowMetronome(false)}
          >
            <div className="w-full max-w-xs sm:max-w-sm landscape:max-w-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <Metronome onClose={() => setShowMetronome(false)} t={t} soundType={settings.metronomeSound} theme={settings.theme} />
            </div>
          </div>
        )}

        {showAllBadges && <BadgesModal />}
        {showExportModal && <ReportPeriodModal />}
        {showPrivacyPolicy && <PrivacyPolicyModal />}
        {showImportModal && <ImportSessionModal />}
        {editingSession && !selectedExercise && <EditSessionModal />}
        {exportModalData && <ExportChoiceModal />}
        {toasts.length > 0 && <Toasts />}
        {!selectedExercise && <BottomNav />}
        {!settings.onboardingDone && !isDataLoading && <Onboarding />}
      </div>
    </AppContext.Provider>
  );
};

export default MyMusicCoach;
