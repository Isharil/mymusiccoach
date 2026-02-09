import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Check, Clock, TrendingUp, Plus, Home, Book, BarChart3, Settings, Video, FileText, Activity, Calendar, X, Edit2, Trash2, Award, ChevronRight, Bell, Music, Archive, Download, Upload, MoreVertical } from 'lucide-react';
import { useIndexedDB, exportAppData, importAppData, migrateFromLocalStorage, requestStoragePersistence, clearAppStorage } from './hooks/useIndexedDB';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import Metronome from './components/Metronome';
import { useTranslation } from './hooks/useTranslation';
import { availableLanguages } from './locales';

const MyMusicCoach = () => {
  // État pour la migration et l'initialisation
  const [isAppReady, setIsAppReady] = useState(false);
  const [, setStoragePersisted] = useState(false);

  const [activeTab, setActiveTab] = useState('home');
  const [activeWorkout, setActiveWorkout, activeWorkoutLoading] = useIndexedDB('mmc_activeWorkout', null);
  const [workoutProgress, setWorkoutProgress, workoutProgressLoading] = useIndexedDB('mmc_workoutProgress', {});
  const [selectedExercise, setSelectedExercise] = useState(null);
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
  const [exportModalData, setExportModalData] = useState(null); // { content, fileName, mimeType }
  const [showExerciseMenu, setShowExerciseMenu] = useState(false);
  const [newExerciseType, setNewExerciseType] = useState('none');
  const [editingExercise, setEditingExercise] = useState(null);

  // États pour les réglages
  const [settings, setSettings, settingsLoading] = useIndexedDB('mmc_settings', {
    notifications: true,
    practiceReminder: "18:00",
    reminderEnabled: true,
    theme: "light",
    userName: "Musician",
    language: "en",
    metronomeSound: "click",
    longTermGoal: "",
    cycleStartDate: ""
  });

  // Hook de traduction
  const { t } = useTranslation(settings.language);

  // Helper pour traduire les catégories
  const categoryKeys = {
    'Tous': 'all',
    'Technique': 'technique',
    'Gammes': 'scales',
    'Rythme': 'rhythm',
    'Théorie': 'theory',
    'Morceaux': 'pieces',
    'Improvisation': 'improvisation',
    'Oreille': 'earTraining'
  };
  const translateCategory = (cat) => t(`categories.${categoryKeys[cat] || cat.toLowerCase()}`);

  // Helper pour traduire les difficultés
  const difficultyKeys = {
    'Débutant': 'beginner',
    'Intermédiaire': 'intermediate',
    'Avancé': 'advanced'
  };
  const translateDifficulty = (diff) => t(`difficulties.${difficultyKeys[diff] || diff.toLowerCase()}`);

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const [uploadedFile, setUploadedFile] = useState(null);
  const [deletedExercises, setDeletedExercises, deletedExercisesLoading] = useIndexedDB('mmc_deletedExercises', []);
  const [showTrash, setShowTrash] = useState(false);
  const [archivedWorkouts, setArchivedWorkouts, archivedWorkoutsLoading] = useIndexedDB('mmc_archivedWorkouts', []);
  const [showArchive, setShowArchive] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerFinished, setTimerFinished] = useState(false); // Notification de fin de chrono
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

  // Refs pour le chrono basé sur timestamps (résistant à la mise en veille)
  const timerEndTimeRef = useRef(null);
  const timerAnimationRef = useRef(null);
  const wakeLockRef = useRef(null);
  const pausedRemainingRef = useRef(null);

  // Catégories d'exercices disponibles
  const exerciseCategories = ["Technique", "Gammes", "Rythme", "Théorie", "Morceaux", "Improvisation", "Oreille"];

  // Exercices par défaut
  const defaultExercises = [
    {
      id: 1,
      name: "Échauffement technique",
      duration: "5 min",
      sets: "3 séries",
      type: "video",
      difficulty: "Débutant",
      baseTempo: 60,
      category: "Technique",
      description: "Exercice d'échauffement pour préparer ta session.",
      videoUrl: "",
      tempoHistory: []
    },
    {
      id: 2,
      name: "Exercice de rythme",
      duration: "8 min",
      sets: "4 séries",
      type: "video",
      difficulty: "Intermédiaire",
      baseTempo: 80,
      category: "Rythme",
      description: "Travail du sens rythmique.",
      videoUrl: "",
      tempoHistory: []
    }
  ];

  const [exercises, setExercises, exercisesLoading] = useIndexedDB('mmc_exercises', defaultExercises);

  const [workouts, setWorkouts, workoutsLoading] = useIndexedDB('mmc_workouts', [
    {
      id: 1,
      name: "Routine Débutant",
      duration: "30 min",
      exercises: [1, 2],
      category: "Technique"
    },
    {
      id: 2,
      name: "Improvisation Blues",
      duration: "45 min",
      exercises: [1],
      category: "Improvisation"
    }
  ]);

  const [weeklySchedule, setWeeklySchedule, weeklyScheduleLoading] = useIndexedDB('mmc_weeklySchedule', {
    semaine1: {
      lundi: [1],
      mardi: [],
      mercredi: [2],
      jeudi: [],
      vendredi: [1],
      samedi: [],
      dimanche: []
    },
    semaine2: {
      lundi: [2],
      mardi: [],
      mercredi: [1],
      jeudi: [],
      vendredi: [],
      samedi: [2],
      dimanche: []
    },
    semaine3: {
      lundi: [1],
      mardi: [1],
      mercredi: [],
      jeudi: [2],
      vendredi: [],
      samedi: [],
      dimanche: []
    },
    semaine4: {
      lundi: [],
      mardi: [2],
      mercredi: [],
      jeudi: [1],
      vendredi: [2],
      samedi: [],
      dimanche: [1]
    }
  });

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
  }, [weeklyScheduleLoading]);

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

    // Fonction pour parser une date de session
    const parseSessionDate = (dateStr) => {
      if (dateStr.includes('-')) {
        return new Date(dateStr);
      } else if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };

    const sessionsLast7Days = sessionHistory.filter(session => {
      const sessionDate = parseSessionDate(session.date);
      return sessionDate >= sevenDaysAgo;
    }).length;

    const sessionsLast28Days = sessionHistory.filter(session => {
      const sessionDate = parseSessionDate(session.date);
      return sessionDate >= twentyEightDaysAgo;
    }).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fonction pour formater une date locale en YYYY-MM-DD (sans conversion UTC)
    const toLocalDateStr = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Normaliser toutes les dates au format ISO (YYYY-MM-DD)
    const normalizeDate = (dateStr) => {
      if (dateStr.includes('-')) {
        return dateStr; // Déjà en format ISO
      } else if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateStr;
    };

    // Obtenir les dates uniques normalisées
    const uniqueDates = [...new Set(sessionHistory.map(s => normalizeDate(s.date)))];

    // Calcul du streak actuel (jours consécutifs depuis aujourd'hui/hier)
    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      let checkDate = new Date(today);
      const todayStr = toLocalDateStr(today);
      const yesterdayDate = new Date(today);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = toLocalDateStr(yesterdayDate);

      // Si pas de session aujourd'hui ET pas hier, le streak est perdu
      if (!uniqueDates.includes(todayStr) && !uniqueDates.includes(yesterdayStr)) {
        currentStreak = 0;
      } else {
        // Si pas de session aujourd'hui, commencer à vérifier depuis hier
        if (!uniqueDates.includes(todayStr)) {
          checkDate.setDate(checkDate.getDate() - 1);
        }

        // Compter les jours consécutifs
        for (let i = 0; i < 365; i++) {
          const dateStr = toLocalDateStr(checkDate);
          if (uniqueDates.includes(dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Nombre de jours avec pratique sur les 7 derniers jours
    let daysWithPractice = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = toLocalDateStr(checkDate);
      if (uniqueDates.includes(dateStr)) {
        daysWithPractice++;
      }
    }

    return {
      last7Days: sessionsLast7Days,
      streak: currentStreak, // Streak actuel pour l'accueil
      daysWithPractice: daysWithPractice, // Jours pratiqués sur 7 jours pour les stats
      last28Days: sessionsLast28Days,
      totalSessions: sessionHistory.length // Gardé pour les badges
    };
  }, [sessionHistory]);

  // Définition des badges (les noms/descriptions sont traduits via les clés)
  const BADGES = [
    // Badges de streak (jours consécutifs de pratique)
    { id: 'streak_3', nameKey: 'badges.firstFlame', icon: '🔥', type: 'streak', threshold: 3 },
    { id: 'streak_7', nameKey: 'badges.perfectWeek', icon: '🔥🔥', type: 'streak', threshold: 7 },
    { id: 'streak_14', nameKey: 'badges.twoWeeks', icon: '💪', type: 'streak', threshold: 14 },
    { id: 'streak_21', nameKey: 'badges.threeWeeks', icon: '💪💪', type: 'streak', threshold: 21 },
    { id: 'streak_30', nameKey: 'badges.oneMonth', icon: '⭐', type: 'streak', threshold: 30 },
    { id: 'streak_45', nameKey: 'badges.fortyFiveDays', icon: '✨', type: 'streak', threshold: 45 },
    { id: 'streak_60', nameKey: 'badges.unstoppable', icon: '🌟', type: 'streak', threshold: 60 },
    { id: 'streak_90', nameKey: 'badges.threeMonths', icon: '💎', type: 'streak', threshold: 90 },
    { id: 'streak_100', nameKey: 'badges.legend', icon: '👑', type: 'streak', threshold: 100 },
    { id: 'streak_125', nameKey: 'badges.master', icon: '🎖️', type: 'streak', threshold: 125 },
    { id: 'streak_150', nameKey: 'badges.grandMaster', icon: '🏅', type: 'streak', threshold: 150 },
    { id: 'streak_175', nameKey: 'badges.virtuoso', icon: '🎯', type: 'streak', threshold: 175 },
    { id: 'streak_200', nameKey: 'badges.immortal', icon: '💫', type: 'streak', threshold: 200 },
    // Badges de sessions totales
    { id: 'sessions_5', nameKey: 'badges.firstSteps', icon: '🎵', type: 'sessions', threshold: 5 },
    { id: 'sessions_10', nameKey: 'badges.neverGiveUp', icon: '🎸', type: 'sessions', threshold: 10 },
    { id: 'sessions_15', nameKey: 'badges.onTrack', icon: '🎼', type: 'sessions', threshold: 15 },
    { id: 'sessions_25', nameKey: 'badges.dedicatedMusician', icon: '🎹', type: 'sessions', threshold: 25 },
    { id: 'sessions_35', nameKey: 'badges.regular', icon: '🎺', type: 'sessions', threshold: 35 },
    { id: 'sessions_50', nameKey: 'badges.halfHundred', icon: '🏆', type: 'sessions', threshold: 50 },
    { id: 'sessions_75', nameKey: 'badges.threeQuarters', icon: '🎻', type: 'sessions', threshold: 75 },
    { id: 'sessions_100', nameKey: 'badges.centurion', icon: '🥇', type: 'sessions', threshold: 100 },
    { id: 'sessions_125', nameKey: 'badges.sessionMaster', icon: '🎖️', type: 'sessions', threshold: 125 },
    { id: 'sessions_150', nameKey: 'badges.sessionGrandMaster', icon: '🏅', type: 'sessions', threshold: 150 },
    { id: 'sessions_175', nameKey: 'badges.sessionVirtuoso', icon: '🎯', type: 'sessions', threshold: 175 },
    { id: 'sessions_200', nameKey: 'badges.bicentennial', icon: '💫', type: 'sessions', threshold: 200 },
  ];

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
        return stats.streak >= badge.threshold;
      } else if (badge.type === 'sessions') {
        return stats.totalSessions >= badge.threshold;
      }
      return false;
    });
  }, [stats.streak, stats.totalSessions]);

  // Obtenir le prochain badge à débloquer (memoïsé)
  const nextBadge = useMemo(() => {
    const earnedIds = earnedBadges.map(b => b.id);
    return BADGES.find(badge => !earnedIds.includes(badge.id));
  }, [earnedBadges]);

  // Fonctions de notification avec Capacitor LocalNotifications
  const isNativePlatform = Capacitor.isNativePlatform();

  const requestNotificationPermission = async () => {
    if (!isNativePlatform) {
      showToast('Les notifications sont disponibles uniquement sur l\'application mobile.', 'warning');
      return;
    }

    try {
      const permStatus = await LocalNotifications.checkPermissions();

      if (permStatus.display === 'granted') {
        setNotificationPermission('granted');
        showToast('Les notifications sont déjà autorisées.', 'success');
        return;
      }

      const result = await LocalNotifications.requestPermissions();
      setNotificationPermission(result.display);

      if (result.display === 'granted') {
        await sendTestNotification();
        // Planifier le rappel quotidien
        await scheduleDailyReminder();
      }
    } catch (error) {
      console.error('Erreur permissions notification:', error);
      showToast('Erreur lors de la demande de permission.', 'error');
    }
  };

  const sendTestNotification = async () => {
    if (!isNativePlatform) return;

    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: '🎵 MyMusicCoach',
          body: `Bonjour ${settings.userName} ! Les notifications sont activées.`,
          id: 9999,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }]
      });
    } catch (error) {
      console.error('Erreur envoi notification test:', error);
    }
  };

  const scheduleDailyReminder = async () => {
    if (!isNativePlatform) return;
    if (!settings.notifications || !settings.reminderEnabled) return;

    try {
      // Annuler les anciennes notifications planifiées
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

      // Parser l'heure du rappel
      const [hours, minutes] = settings.practiceReminder.split(':').map(Number);

      // Créer la date du prochain rappel
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Si l'heure est déjà passée aujourd'hui, planifier pour demain
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [{
          title: '🎵 MyMusicCoach - Session du jour',
          body: `Il est temps de pratiquer ! Ouvre l'app pour voir ta session.`,
          id: 1,
          schedule: {
            at: scheduledDate,
            repeats: true,
            every: 'day'
          },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }]
      });

      console.log('Rappel quotidien planifié pour:', scheduledDate);
    } catch (error) {
      console.error('Erreur planification rappel:', error);
    }
  };

  const cancelDailyReminder = async () => {
    if (!isNativePlatform) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      console.log('Rappel quotidien annulé');
    } catch (error) {
      console.error('Erreur annulation rappel:', error);
    }
  };

  // Envoyer une notification immédiate (pour session terminée, etc.)
  const sendImmediateNotification = async (title, body, id = 9998) => {
    if (!isNativePlatform) return;
    if (!settings.notifications) return;

    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id,
          schedule: { at: new Date(Date.now() + 500) },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }]
      });
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  // Vérifier et mettre à jour les permissions au démarrage
  React.useEffect(() => {
    const checkPermissions = async () => {
      if (!isNativePlatform) return;

      try {
        const permStatus = await LocalNotifications.checkPermissions();
        setNotificationPermission(permStatus.display);
      } catch (error) {
        console.error('Erreur vérification permissions:', error);
      }
    };

    checkPermissions();
  }, []);

  // Mettre à jour le rappel quotidien quand les settings changent
  React.useEffect(() => {
    if (!isNativePlatform) return;

    const updateReminder = async () => {
      if (settings.notifications && settings.reminderEnabled) {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'granted') {
          await scheduleDailyReminder();
        }
      } else {
        await cancelDailyReminder();
      }
    };

    updateReminder();
  }, [settings.notifications, settings.practiceReminder, settings.reminderEnabled]);

  // Appliquer le thème sombre
  useEffect(() => {
    const isDark = settings.theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#7c3aed');
    }
    localStorage.setItem('mmc_theme', settings.theme);
  }, [settings.theme]);

  // Scroll en haut à chaque changement d'onglet
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Sauvegarder dans le dossier Downloads (Android natif)
  const saveToDownloads = async (dataStr, fileName) => {
    try {
      await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: dataStr,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
        recursive: true
      });
      showToast(`Fichier sauvegardé : ${fileName}`, 'success');
      setExportModalData(null);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde Downloads:', error);
      // Fallback : essayer avec Documents si ExternalStorage échoue
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        showToast(`Fichier sauvegardé : ${fileName}`, 'success');
        setExportModalData(null);
        return true;
      } catch (err) {
        showToast('Erreur lors de la sauvegarde. Essayez l\'option Partager.', 'error');
        return false;
      }
    }
  };

  // Partager le fichier (Android/iOS natif)
  const shareFile = async (dataStr, fileName) => {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: dataStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: 'Partager le fichier'
      });
      setExportModalData(null);
      return true;
    } catch (error) {
      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        // L'utilisateur a annulé, pas une vraie erreur
        return true;
      }
      console.error('Erreur partage:', error);
      showToast('Erreur lors du partage.', 'error');
      return false;
    }
  };

  // Fonction utilitaire pour télécharger un fichier (compatible mobile via Capacitor)
  const downloadFile = async (content, fileName, mimeType = 'application/json') => {
    // Convertir le contenu en string si c'est un Blob
    let dataStr;
    if (content instanceof Blob) {
      dataStr = await content.text();
    } else {
      dataStr = content;
    }

    // Vérifier si on est sur une plateforme native (Android/iOS avec Capacitor)
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    // Détecter iOS en mode PWA ou navigateur (sans Capacitor natif)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSWeb = isIOS && !isNative;

    if (isNative && platform === 'android') {
      // Sur Android natif : afficher la modal de choix
      setExportModalData({ content: dataStr, fileName, mimeType });
      return true;
    } else if (isNative && platform === 'ios') {
      // Sur iOS natif : utiliser directement le partage
      return await shareFile(dataStr, fileName);
    } else if (isIOSWeb) {
      // Sur iOS PWA/Safari : copier dans le presse-papier (seule méthode fiable)
      try {
        await navigator.clipboard.writeText(dataStr);
        showToast(`Contenu copié ! Collez-le dans Fichiers ou Notes sous le nom : ${fileName}`, 'success', 6000);
        return true;
      } catch (error) {
        console.error('Erreur clipboard:', error);
        prompt('Impossible de copier automatiquement.\nSélectionnez et copiez le contenu :', dataStr.substring(0, 500) + '...');
        return false;
      }
    } else {
      // Sur web desktop : utiliser la méthode classique avec Data URL
      const dataUrl = `data:${mimeType};charset=utf-8,${encodeURIComponent(dataStr)}`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 500);

      return true;
    }
  };

  // Fonctions d'export/import des données
  const handleExportData = async () => {
    try {
      const dataToExport = await exportAppData();
      if (!dataToExport) {
        showToast('Erreur lors de la préparation des données', 'error');
        return;
      }
      const fileName = `mymusiccoach-backup-${new Date().toISOString().split('T')[0]}.json`;
      await downloadFile(dataToExport, fileName, 'application/json');
    } catch (error) {
      showToast('Erreur lors de l\'export des données.', 'error');
      console.error(error);
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const result = await importAppData(e.target.result);
        if (result.success) {
          showToast('Données importées. Rechargement...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showToast(result.message, 'error');
        }
      } catch (error) {
        showToast('Fichier invalide.', 'error');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // Fonction pour obtenir le jour actuel
  const getCurrentDay = () => {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const today = new Date();
    return days[today.getDay()];
  };

  // Fonction pour obtenir le lundi de la semaine en cours
  const getMondayOfCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay(); // 0=dim, 1=lun, ...
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  };

  // Auto-initialisation du cycleStartDate au premier lancement
  useEffect(() => {
    if (settingsLoading) return;
    if (!settings.cycleStartDate) {
      setSettings({ ...settings, cycleStartDate: getMondayOfCurrentWeek() });
    }
  }, [settingsLoading]);

  // Fonction pour obtenir la semaine actuelle du cycle de 4 semaines (1-4)
  const getCurrentWeekNumber = () => {
    const today = new Date();
    const startDate = new Date(settings.cycleStartDate || getMondayOfCurrentWeek());
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) % 4;
    return weekNumber + 1;
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
      showToast('Veuillez entrer un tempo valide (entre 20 et 300 BPM)', 'warning');
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

  const saveSession = (workout) => {
    const now = new Date();
    // Utiliser la date locale (pas UTC) pour éviter les décalages de fuseau horaire
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const workoutExercises = workout.exercises;
    let completed = 0;
    let skipped = 0;
    
    workoutExercises.forEach(exId => {
      const key = `${workout.id}-${exId}`;
      if (workoutProgress[key] === 'completed') completed++;
      if (workoutProgress[key] === 'skipped') skipped++;
    });
    
    // Collecter les notes pour cette session
    const sessionNotes = {};
    workoutExercises.forEach(exId => {
      if (exerciseNotes[exId]) {
        sessionNotes[exId] = exerciseNotes[exId];
      }
    });

    const newSession = {
      id: sessionHistory.length + 1,
      date: dateStr,
      time: timeStr,
      workoutId: workout.id,
      workoutName: workout.name,
      completed,
      skipped,
      total: workoutExercises.length,
      notes: sessionNotes // Notes/observations de l'élève
    };

    setSessionHistory([...sessionHistory, newSession]);
    setActiveWorkout(null);
    setWorkoutProgress({});
    setExerciseNotes({}); // Réinitialiser les notes

    // Notification de félicitations (uniquement sur mobile natif)
    sendImmediateNotification(
      '🎉 Session terminée !',
      `Bravo ${settings.userName} ! ${completed} exercice${completed > 1 ? 's' : ''} complété${completed > 1 ? 's' : ''} sur ${workoutExercises.length}.`,
      100
    );
  };

  // Fonction pour démarrer l'édition d'une session terminée
  const startEditSession = (session) => {
    const workout = workouts.find(w => w.id === session.workoutId);
    if (!workout) {
      showToast('La session originale n\'existe plus.', 'error');
      return;
    }

    // Initialiser le progress avec les données existantes ou des valeurs par défaut
    const progress = {};
    workout.exercises.forEach(exId => {
      if (session.exerciseProgress && session.exerciseProgress[exId]) {
        progress[exId] = session.exerciseProgress[exId];
      } else {
        // Pour les anciennes sessions sans exerciseProgress, marquer comme "completed" par défaut
        progress[exId] = 'completed';
      }
    });

    setEditingSession(session);
    setEditingSessionProgress(progress);
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
          exerciseProgress: { ...editingSessionProgress }
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
    setActiveWorkout(workout);

    // Notification de début de session (uniquement sur mobile natif)
    sendImmediateNotification(
      '🎵 Session démarrée !',
      `${workout.name} - ${workout.exercises.length} exercice${workout.exercises.length > 1 ? 's' : ''} à pratiquer. Bon courage !`,
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
    if (window.confirm('Supprimer définitivement cet exercice ? Cette action est irréversible.')) {
      setDeletedExercises(deletedExercises.filter(ex => ex.id !== exerciseId));
    }
  };

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

  const restoreWorkout = (workoutId) => {
    const workoutToRestore = archivedWorkouts.find(w => w.id === workoutId);
    if (workoutToRestore) {
      setWorkouts([...workouts, workoutToRestore]);
      setArchivedWorkouts(archivedWorkouts.filter(w => w.id !== workoutId));
    }
  };

  const permanentlyDeleteWorkout = (workoutId) => {
    if (window.confirm('Supprimer définitivement cette session ? Cette action est irréversible.')) {
      setArchivedWorkouts(archivedWorkouts.filter(w => w.id !== workoutId));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFile({
        name: file.name,
        data: event.target.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Helper pour normaliser les champs durée et séries
  const normalizeExerciseFields = (data) => {
    let { duration, sets, baseTempo, ...rest } = data;

    // Normaliser la durée: extraire le nombre, limiter à 60 min, ajouter "min"
    if (duration) {
      const durationTrimmed = duration.trim();
      const durationMatch = durationTrimmed.match(/^(\d+)/);
      if (durationMatch) {
        const minutes = Math.min(60, Math.max(1, parseInt(durationMatch[1])));
        duration = `${minutes} min`;
      }
    }

    // Normaliser les séries: extraire le nombre, limiter à 20, afficher "séries"
    if (sets) {
      const setsTrimmed = sets.trim();
      const setsMatch = setsTrimmed.match(/^(\d+)/);
      if (setsMatch) {
        const numSets = Math.min(20, Math.max(1, parseInt(setsMatch[1])));
        sets = `${numSets} séries`;
      }
    }

    // Normaliser le tempo: limiter entre 0 et 300 BPM (0 = non applicable)
    if (baseTempo !== undefined) {
      const tempoValue = parseInt(baseTempo);
      baseTempo = isNaN(tempoValue) ? 0 : Math.min(300, Math.max(0, tempoValue));
    }

    return { ...rest, duration, sets, baseTempo };
  };

  const createExercise = (formData) => {
    const maxId = exercises.length > 0 ? Math.max(...exercises.map(ex => ex.id)) : 0;
    const normalizedData = normalizeExerciseFields(formData);
    const newExercise = {
      id: maxId + 1,
      ...normalizedData,
      tempoHistory: []
    };

    // Ajouter les données du fichier si uploadé
    if (uploadedFile && formData.type === 'file') {
      newExercise.fileData = uploadedFile;
    }

    setExercises([...exercises, newExercise]);
    setShowCreateExercise(false);
    setNewExerciseType('none');
    setUploadedFile(null); // Réinitialiser le fichier uploadé
  };

  const createOrUpdateWorkout = (workoutData) => {
    if (editingWorkout) {
      setWorkouts(workouts.map(w => w.id === editingWorkout.id ? { ...w, ...workoutData } : w));
      setEditingWorkout(null);
      setShowCreateWorkout(false);
    } else {
      const maxId = workouts.length > 0 ? Math.max(...workouts.map(w => w.id)) : 0;
      const newWorkout = {
        id: maxId + 1,
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
        showToast('Session invalide', 'error');
        return;
      }

      // Récupérer les exercices de la session
      const workoutExercises = workout.exercises.map(exId => {
        const exercise = exercises.find(ex => ex.id === exId);
        if (!exercise) return null;
        // Retirer l'ID pour éviter les conflits lors de l'import
        const { id, ...exerciseData } = exercise;
        return exerciseData;
      }).filter(Boolean);

      // Créer l'objet à exporter
      const exportData = {
        version: "1.0",
        appName: "MyMusicCoach",
        exportDate: new Date().toISOString(),
        workout: {
          name: workout.name,
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
      showToast(`Erreur lors de l'export: ${error.message}`, 'error');
      console.error('Export workout error:', error);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      showToast('Le fichier doit être au format JSON', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result);

        // Vérifier la structure du fichier
        if (!importData.version || !importData.workout || !importData.exercises) {
          showToast('Format de fichier invalide', 'error');
          return;
        }

        if (importData.appName !== "MyMusicCoach") {
          if (!window.confirm('Ce fichier ne provient pas de MyMusicCoach. Continuer quand même ?')) {
            return;
          }
        }

        // Importer les exercices
        const newExercises = [];
        const exerciseIdMapping = {}; // Ancien ID -> Nouveau ID
        const maxExerciseId = exercises.length > 0 ? Math.max(...exercises.map(ex => ex.id)) : 0;

        importData.exercises.forEach((exerciseData, index) => {
          const newId = maxExerciseId + index + 1;
          const newExercise = {
            id: newId,
            ...exerciseData,
            tempoHistory: exerciseData.tempoHistory || []
          };
          newExercises.push(newExercise);
          exerciseIdMapping[index] = newId; // Mapper l'index à l'ID
        });

        // Ajouter les exercices
        setExercises([...exercises, ...newExercises]);

        // Créer la session avec les nouveaux IDs
        const maxWorkoutId = workouts.length > 0 ? Math.max(...workouts.map(w => w.id)) : 0;
        const newWorkout = {
          id: maxWorkoutId + 1,
          name: importData.workout.name,
          duration: importData.workout.duration,
          category: importData.workout.category,
          exercises: newExercises.map(ex => ex.id)
        };

        setWorkouts([...workouts, newWorkout]);

        setShowImportModal(false);
        setImportFile(null);

      } catch (error) {
        console.error('Erreur import:', error);
        showToast('Erreur lors de l\'importation du fichier', 'error');
      }
    };
    reader.readAsText(file);
  };

  // ===== CHRONOMÈTRE D'EXERCICE =====
  const parseDuration = (durationStr) => {
    // Parse "5 min", "10 min", "8 min", etc. vers secondes
    const match = durationStr.match(/(\d+)\s*min/i);
    if (match) {
      return parseInt(match[1]) * 60;
    }
    return 300; // Default 5 minutes
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Demander le Wake Lock pour empêcher la mise en veille
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activé');
      } catch (err) {
        console.log('Wake Lock non disponible:', err);
      }
    }
  }, []);

  // Libérer le Wake Lock
  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Wake Lock libéré');
    }
  }, []);

  // Jouer un son de notification de fin de chrono
  const playTimerFinishedSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Jouer 3 bips courts
      const playBeep = (startTime, frequency) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      };

      const now = audioContext.currentTime;
      playBeep(now, 880);       // La5
      playBeep(now + 0.2, 880); // La5
      playBeep(now + 0.4, 1760); // La6 (plus aigu pour la fin)

      // Fermer le contexte après les sons
      setTimeout(() => audioContext.close(), 1000);
    } catch (e) {
      console.log('Impossible de jouer le son de notification');
    }
  }, []);

  // Boucle de mise à jour du timer basée sur timestamps
  const updateTimer = useCallback(() => {
    if (!timerEndTimeRef.current) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));

    if (remaining <= 0) {
      // Temps écoulé - notification non-bloquante
      setTimerSeconds(0);
      setTimerActive(false);
      timerEndTimeRef.current = null;
      releaseWakeLock();

      // Afficher la notification visuelle et jouer le son
      setTimerFinished(true);
      playTimerFinishedSound();

      // Masquer la notification après 5 secondes
      setTimeout(() => setTimerFinished(false), 5000);
      return;
    }

    setTimerSeconds(remaining);
    timerAnimationRef.current = requestAnimationFrame(updateTimer);
  }, [releaseWakeLock, playTimerFinishedSound]);

  const startTimer = useCallback((exercise) => {
    // Arrêter le timer précédent s'il existe
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
    }

    const totalSeconds = parseDuration(exercise.duration);

    // Stocker l'heure de fin (timestamp)
    timerEndTimeRef.current = Date.now() + (totalSeconds * 1000);
    setTimerSeconds(totalSeconds);
    setTimerActive(true);
    setTimerPaused(false);
    pausedRemainingRef.current = null;

    // Activer le Wake Lock pour empêcher la mise en veille
    requestWakeLock();

    // Démarrer la boucle de mise à jour
    timerAnimationRef.current = requestAnimationFrame(updateTimer);
  }, [requestWakeLock, updateTimer]);

  const pauseTimer = useCallback(() => {
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
      timerAnimationRef.current = null;
    }
    // Sauvegarder le temps restant
    if (timerEndTimeRef.current) {
      const now = Date.now();
      pausedRemainingRef.current = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
    }
    timerEndTimeRef.current = null;
    setTimerActive(false);
    setTimerPaused(true);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resumeTimer = useCallback(() => {
    if (pausedRemainingRef.current && pausedRemainingRef.current > 0) {
      // Reprendre avec le temps restant
      timerEndTimeRef.current = Date.now() + (pausedRemainingRef.current * 1000);
      setTimerActive(true);
      setTimerPaused(false);
      pausedRemainingRef.current = null;

      // Activer le Wake Lock
      requestWakeLock();

      // Démarrer la boucle de mise à jour
      timerAnimationRef.current = requestAnimationFrame(updateTimer);
    }
  }, [requestWakeLock, updateTimer]);

  const stopTimer = useCallback(() => {
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
      timerAnimationRef.current = null;
    }
    timerEndTimeRef.current = null;
    pausedRemainingRef.current = null;
    setTimerActive(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    releaseWakeLock();
  }, [releaseWakeLock]);

  // Reprendre le timer quand l'app redevient visible (après mise en veille)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerEndTimeRef.current) {
        // Recalculer le temps restant et relancer la boucle
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));

        if (remaining <= 0) {
          setTimerSeconds(0);
          setTimerActive(false);
          timerEndTimeRef.current = null;
          releaseWakeLock();
          // Notification non-bloquante
          setTimerFinished(true);
          playTimerFinishedSound();
          setTimeout(() => setTimerFinished(false), 5000);
        } else {
          setTimerSeconds(remaining);
          // Re-demander le Wake Lock (il peut avoir été perdu)
          requestWakeLock();
          timerAnimationRef.current = requestAnimationFrame(updateTimer);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [releaseWakeLock, requestWakeLock, updateTimer]);

  // Nettoyer le timer quand on quitte la page
  useEffect(() => {
    return () => {
      if (timerAnimationRef.current) {
        cancelAnimationFrame(timerAnimationRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // ===== GÉNÉRATION DU RAPPORT PDF =====
  const generateProgressReport = async (weeks) => {
    // Calculer la date limite selon la période choisie (X derniers jours)
    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - (weeks * 7));
    cutoffDate.setHours(0, 0, 0, 0); // Début de journée pour inclure toute la journée

    // Filtrer les sessions par période
    const filteredSessions = sessionHistory.filter(session => {
      // Parser la date de la session (formats: "2025-02-02" ou "02/02/2025")
      let sessionDate;
      if (session.date.includes('-')) {
        // Format ISO: YYYY-MM-DD
        sessionDate = new Date(session.date);
      } else if (session.date.includes('/')) {
        // Format FR: DD/MM/YYYY
        const parts = session.date.split('/');
        if (parts.length === 3) {
          sessionDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
      }
      return sessionDate && sessionDate >= cutoffDate;
    }).reverse();

    // Libellé de la période
    const periodLabel = weeks === 1 ? 'les 7 derniers jours' :
                        weeks === 2 ? 'les 14 derniers jours' :
                        weeks === 3 ? 'les 21 derniers jours' :
                        'les 28 derniers jours';

    // Créer le contenu du rapport
    // Calculer les stats pour la période
    const sessionsCount = filteredSessions.length;
    const uniqueDaysWithPractice = new Set(filteredSessions.map(s => s.date)).size;

    // Calculer le meilleur streak sur la période sélectionnée
    const periodDays = weeks * 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const toLocalDateStr = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const normalizeDate = (dateStr) => {
      if (dateStr.includes('-')) {
        return dateStr;
      } else if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return dateStr;
    };

    const uniqueDates = [...new Set(sessionHistory.map(s => normalizeDate(s.date)))];

    // Créer un tableau des jours de la période avec un booléen pour chaque jour pratiqué
    const periodDaysSessions = [];
    for (let i = 0; i < periodDays; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = toLocalDateStr(checkDate);
      periodDaysSessions.push(uniqueDates.includes(dateStr));
    }

    // Trouver le meilleur streak sur la période
    let bestStreakInPeriod = 0;
    let currentStreakCount = 0;
    for (let i = 0; i < periodDaysSessions.length; i++) {
      if (periodDaysSessions[i]) {
        currentStreakCount++;
        if (currentStreakCount > bestStreakInPeriod) {
          bestStreakInPeriod = currentStreakCount;
        }
      } else {
        currentStreakCount = 0;
      }
    }

    const reportData = {
      userName: settings.userName,
      date: new Date().toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      periodLabel,
      stats: {
        sessionsCount,
        streak: bestStreakInPeriod,
        daysWithPractice: uniqueDaysWithPractice
      },
      recentSessions: filteredSessions,
      exercisesWithProgress: exercises.filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0)
    };

    setShowExportModal(false);

    // Helper pour formater les dates
    const formatDate = (dateStr) => {
      if (dateStr.includes('-')) {
        // Format ISO: YYYY-MM-DD -> DD/MM/YYYY
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
      }
      return dateStr; // Déjà au bon format
    };

    // Créer le document HTML pour le PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport de Progression - ${reportData.userName}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #9333EA;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(147, 51, 234, 0.3);
          }
          .print-button:hover {
            background: #7C3AED;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #9333EA;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #9333EA;
            margin: 0;
            font-size: 32px;
          }
          .header p {
            color: #666;
            margin: 5px 0;
          }
          .section {
            margin: 30px 0;
            page-break-inside: avoid;
          }
          .section h2 {
            color: #9333EA;
            border-bottom: 2px solid #E9D5FF;
            padding-bottom: 10px;
            font-size: 24px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 20px 0;
          }
          .stat-card {
            background: #F3F4F6;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
          }
          .stat-card h3 {
            font-size: 36px;
            margin: 0;
            color: #9333EA;
          }
          .stat-card p {
            margin: 5px 0 0 0;
            color: #666;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th {
            background: #9333EA;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #E5E7EB;
          }
          tr:hover {
            background: #F9FAFB;
          }
          .progress-bar {
            background: #E5E7EB;
            height: 8px;
            border-radius: 4px;
            overflow: hidden;
            margin: 5px 0;
          }
          .progress-fill {
            background: linear-gradient(to right, #9333EA, #7C3AED);
            height: 100%;
            transition: width 0.3s;
          }
          .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .badge-success {
            background: #D1FAE5;
            color: #065F46;
          }
          .badge-warning {
            background: #FEF3C7;
            color: #92400E;
          }
          .observation-card {
            background: #FFFBEB;
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
          }
          .observation-card .date {
            font-size: 12px;
            color: #92400E;
            margin-bottom: 5px;
          }
          .observation-card .exercise-name {
            font-weight: bold;
            color: #9333EA;
            margin-bottom: 8px;
          }
          .observation-card .note-text {
            color: #333;
            font-style: italic;
            background: white;
            padding: 10px;
            border-radius: 6px;
            border-left: 3px solid #F59E0B;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 12px;
            border-top: 1px solid #E5E7EB;
            padding-top: 20px;
          }
          .instructions {
            background: #EFF6FF;
            border: 2px solid #3B82F6;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
          }
          .instructions h3 {
            color: #1E40AF;
            margin-top: 0;
          }
          .instructions ol {
            color: #1E3A8A;
            margin: 10px 0;
            padding-left: 20px;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">
          🖨️ Enregistrer en PDF (Ctrl+P)
        </button>

        <div class="instructions no-print">
          <h3>📋 Comment enregistrer en PDF ?</h3>
          <ol>
            <li>Clique sur le bouton violet ci-dessus (ou appuie sur <strong>Ctrl+P</strong> / <strong>Cmd+P</strong>)</li>
            <li>Dans la fenêtre qui s'ouvre, choisis <strong>"Enregistrer au format PDF"</strong> comme imprimante</li>
            <li>Clique sur <strong>"Enregistrer"</strong></li>
            <li>Ton rapport PDF est prêt à être partagé avec ton prof ! 🎓</li>
          </ol>
        </div>

        <div class="header">
          <h1>📊 Rapport de Progression</h1>
          <p><strong>${reportData.userName}</strong></p>
          <p>${reportData.date}</p>
          <p style="color: #9333EA; font-weight: bold;">Période : ${reportData.periodLabel}</p>
        </div>

        <div class="section">
          <h2>📈 Statistiques de la période</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <h3>${reportData.stats.sessionsCount}</h3>
              <p>Sessions<br/>pratiquées</p>
            </div>
            <div class="stat-card">
              <h3>${reportData.stats.streak}</h3>
              <p>Meilleur streak<br/>(jours d'affilée)</p>
            </div>
            <div class="stat-card">
              <h3>${reportData.stats.daysWithPractice}</h3>
              <p>Jours<br/>avec pratique</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>📅 Historique des Sessions (${reportData.periodLabel})</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Session</th>
                <th>Complété</th>
                <th>Sauté</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.recentSessions.map(session => `
                <tr>
                  <td>${formatDate(session.date)} ${session.time}</td>
                  <td><strong>${session.workoutName}</strong></td>
                  <td><span class="badge badge-success">${session.completed}</span></td>
                  <td>${session.skipped > 0 ? `<span class="badge badge-warning">${session.skipped}</span>` : '-'}</td>
                  <td>${session.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${(() => {
          const sessionsWithNotes = reportData.recentSessions.filter(s => s.notes && Object.keys(s.notes).length > 0);
          if (sessionsWithNotes.length === 0) return '';
          return `
        <div class="section">
          <h2>📝 Observations de l'élève</h2>
          ${sessionsWithNotes.map(session => {
            const noteEntries = Object.entries(session.notes);
            return noteEntries.map(([exId, note]) => {
              const exercise = exercises.find(e => e.id === parseInt(exId));
              const exerciseName = exercise ? exercise.name : 'Exercice inconnu';
              return `
              <div class="observation-card">
                <div class="date">📅 ${formatDate(session.date)} ${session.time} — ${session.workoutName}</div>
                <div class="exercise-name">🎵 ${exerciseName}</div>
                <div class="note-text">${note}</div>
              </div>
              `;
            }).join('');
          }).join('')}
        </div>
          `;
        })()}

        ${reportData.exercisesWithProgress.length > 0 ? `
        <div class="section">
          <h2>📊 Progression des Tempos</h2>
          <table>
            <thead>
              <tr>
                <th>Exercice</th>
                <th>Tempo de base</th>
                <th>Dernier tempo</th>
                <th>Progression</th>
                <th>Enregistrements</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.exercisesWithProgress.map(ex => {
                const lastTempo = ex.tempoHistory[ex.tempoHistory.length - 1];
                const firstTempo = ex.tempoHistory[0];
                const progression = lastTempo.tempo - firstTempo.tempo;
                return `
                  <tr>
                    <td><strong>${ex.name}</strong></td>
                    <td>${ex.baseTempo} BPM</td>
                    <td>${lastTempo.tempo} BPM</td>
                    <td style="color: ${progression >= 0 ? '#059669' : '#DC2626'};">
                      ${progression >= 0 ? '+' : ''}${progression} BPM
                    </td>
                    <td>${ex.tempoHistory.length}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Rapport généré par MyMusicCoach - Application de coaching musical</p>
          <p>Ce rapport peut être partagé avec votre professeur pour suivre votre progression</p>
        </div>

        <script>
          // Rapport prêt à être imprimé
        </script>
      </body>
      </html>
    `;

    // Télécharger le fichier HTML
    const fileName = `Rapport_${reportData.userName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    await downloadFile(htmlContent, fileName, 'text/html');
  };

  const categories = ['Tous', ...exerciseCategories];
  const filteredExercises = libraryFilter === 'Tous' 
    ? exercises 
    : exercises.filter(ex => ex.category === libraryFilter);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 pb-20">
      {/* Page d'accueil */}
      {activeTab === 'home' && !activeWorkout && (
        <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {t('home.greeting', { name: settings.userName })} 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
              <span className="text-2xl">🎵</span>
              {t('home.ready')}
            </p>
            {settings.longTermGoal && (
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl px-4 py-3 mt-3 inline-block">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">🎯 {t('goals.myGoal')}</span> {settings.longTermGoal}
                </p>
              </div>
            )}
          </div>

          {/* Section Session du Jour */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold">{t('home.todaySession')}</h2>
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-purple-100 text-sm capitalize">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="p-6">
              {getTodayWorkouts().length > 0 ? (
                <div className="space-y-4">
                  {isTodaySessionCompleted() && (
                    <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
                      <div className="bg-green-500 rounded-full p-2">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-green-900 dark:text-green-200">
                          {getTodayWorkouts().length > 1 ? t('home.allSessionsCompleted') : t('home.sessionCompleted')}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                          {t('home.excellentWork')} 🎵
                        </p>
                      </div>
                    </div>
                  )}

                  {getTodayWorkouts().map((workout) => {
                    const completed = isWorkoutCompletedToday(workout.id);
                    const completedSession = getCompletedSessionForWorkout(workout.id);
                    return (
                      <div key={workout.id} className="space-y-3">
                        <div className={`rounded-xl p-5 ${
                          completed
                            ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30'
                            : 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                              {workout.name}
                            </h3>
                            {completed && (
                              <div className="bg-green-500 rounded-full p-1">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{workout.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              <span>{workout.exercises.length} {t('home.exercises')}</span>
                            </div>
                          </div>
                          {(workout.shortTermGoal || workout.mediumTermGoal) && (
                            <div className="space-y-1 mb-3">
                              {workout.shortTermGoal && (
                                <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-1.5">
                                  🎯 7j : {workout.shortTermGoal}
                                </p>
                              )}
                              {workout.mediumTermGoal && (
                                <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
                                  🗓️ 28j : {workout.mediumTermGoal}
                                </p>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => completed
                              ? startEditSession(completedSession)
                              : startWorkout(workout)
                            }
                            className={`w-full py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                              completed
                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                            }`}
                          >
                            {completed ? (
                              <>
                                <Check className="w-5 h-5" />
                                {t('home.completedEdit')}
                              </>
                            ) : (
                              <>
                                <Play className="w-5 h-5" />
                                {t('home.startSession')}
                              </>
                            )}
                          </button>
                        </div>

                        {/* Aperçu des exercices */}
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('home.sessionExercises')}</p>
                          {workout.exercises.map((exId) => {
                            const exercise = exercises.find(e => e.id === exId);
                            return exercise ? (
                              <div key={exId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {exercise.type === 'video' && <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                                  {exercise.type === 'file' && <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{exercise.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.duration}</p>
                                  </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  exercise.difficulty === 'Débutant' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                                  exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                                  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                }`}>
                                  {translateDifficulty(exercise.difficulty)}
                                </span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">{t('home.noSession')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('home.restOrCustomize')}</p>
                  <button
                    onClick={() => {
                      setViewingWeek(getCurrentWeekNumber());
                      setShowSchedule(true);
                    }}
                    className="bg-purple-600 dark:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                  >
                    {t('home.viewSchedule')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Planning hebdomadaire compact */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {t('home.weekOf', { current: getCurrentWeekNumber() })}
              </h2>
              <button
                onClick={() => {
                  setViewingWeek(getCurrentWeekNumber());
                  setShowSchedule(true);
                }}
                className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-300 flex items-center gap-1"
              >
                {t('home.edit')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div
              onClick={() => {
                setViewingWeek(getCurrentWeekNumber());
                setShowSchedule(true);
              }}
              className="grid grid-cols-7 gap-2 cursor-pointer active:scale-[0.98] transition-transform"
            >
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => {
                const fullDay = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][idx];
                const isToday = getCurrentDay() === fullDay;
                const currentWeek = getCurrentWeekNumber();
                const weekKey = `semaine${currentWeek}`;
                const dayWorkouts = weeklySchedule[weekKey]?.[fullDay] || [];
                const hasWorkout = Array.isArray(dayWorkouts) ? dayWorkouts.length > 0 : dayWorkouts !== null;
                const workoutCount = Array.isArray(dayWorkouts) ? dayWorkouts.length : (dayWorkouts ? 1 : 0);

                return (
                  <div key={idx} className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                      isToday
                        ? 'bg-purple-600 text-white ring-4 ring-purple-200 dark:ring-purple-700'
                        : hasWorkout
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}>
                      {day}
                    </div>
                    {hasWorkout && !isToday && (
                      <div className="flex gap-0.5 justify-center">
                        {Array.from({ length: Math.min(workoutCount, 3) }).map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Outils */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('home.tools')}</h2>
            <button
              onClick={() => setShowMetronome(true)}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-4"
            >
              <div className="bg-white/20 rounded-xl p-3">
                <img src="/metronome.svg" alt="Metronome" className="w-7 h-7 invert" />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg">{t('metronome.title')}</p>
                <p className="text-sm text-white/80">{t('home.metronomeDesc')}</p>
              </div>
              <ChevronRight className="w-6 h-6 ml-auto" />
            </button>
          </div>

          {/* Statistiques rapides avec flammes */}
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setActiveTab('stats')}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg text-center active:scale-95 transition-transform"
            >
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{stats.last7Days}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.sessionsLast7Days')}</p>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`rounded-2xl p-5 shadow-lg text-center active:scale-95 transition-transform ${stats.streak >= 3 ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-white dark:bg-gray-800'}`}
            >
              <div className="flex items-center justify-center gap-1">
                {stats.streak >= 3 && <span className="text-2xl">🔥</span>}
                <p className={`text-3xl font-bold ${stats.streak >= 3 ? 'text-white' : 'text-orange-500'}`}>{stats.streak}</p>
              </div>
              <p className={`text-xs ${stats.streak >= 3 ? 'text-orange-100' : 'text-gray-600 dark:text-gray-400'}`}>{t('home.consecutiveDays')}</p>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg text-center active:scale-95 transition-transform"
            >
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stats.last28Days}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.sessionsLast28Days')}</p>
            </button>
          </div>

          {/* Badges et progression */}
          {(earnedBadges.length > 0 || nextBadge) && (
            <div
              onClick={() => setActiveTab('stats')}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 cursor-pointer active:scale-[0.98] transition-transform"
            >
              {earnedBadges.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('home.earnedBadges')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {earnedBadges.map(badge => (
                      <div
                        key={badge.id}
                        className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-xl px-3 py-2 flex items-center gap-2"
                        title={getBadgeDescription(badge)}
                      >
                        <span className="text-lg">{badge.icon}</span>
                        <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">{getBadgeName(badge)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {nextBadge && (
                <div className={earnedBadges.length > 0 ? 'pt-3 border-t border-gray-100 dark:border-gray-700' : ''}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg opacity-40">{nextBadge.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('home.nextBadge')}</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{getBadgeName(nextBadge)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{getBadgeDescription(nextBadge)}</p>
                      <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {nextBadge.type === 'streak'
                          ? `${stats.streak}/${nextBadge.threshold} ${t('home.days')}`
                          : `${stats.totalSessions}/${nextBadge.threshold} ${t('home.sessions')}`
                        }
                      </p>
                    </div>
                  </div>
                  {/* Barre de progression */}
                  <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (nextBadge.type === 'streak'
                          ? (stats.streak / nextBadge.threshold)
                          : (stats.totalSessions / nextBadge.threshold)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Modal Planning */}
      {showSchedule && (
        <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto h-screen">
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => setShowSchedule(false)}
                className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="font-medium">Retour</span>
              </button>
              <h2 className="text-lg font-bold">Planning sur 4 semaines</h2>
              <div className="w-20"></div>
            </div>

            {/* Navigation entre les semaines */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setViewingWeek(Math.max(1, viewingWeek - 1))}
                disabled={viewingWeek === 1}
                className={`p-2 rounded-lg transition-colors ${
                  viewingWeek === 1 
                    ? 'text-white/30 cursor-not-allowed' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <ChevronRight className="w-6 h-6 rotate-180" />
              </button>
              
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(week => (
                  <button
                    key={week}
                    onClick={() => setViewingWeek(week)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      viewingWeek === week
                        ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    S{week}
                    {getCurrentWeekNumber() === week && (
                      <span className="ml-1 text-xs">●</span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setViewingWeek(Math.min(4, viewingWeek + 1))}
                disabled={viewingWeek === 4}
                className={`p-2 rounded-lg transition-colors ${
                  viewingWeek === 4 
                    ? 'text-white/30 cursor-not-allowed' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
            {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(day => {
              const isToday = getCurrentDay() === day && getCurrentWeekNumber() === viewingWeek;
              const weekKey = `semaine${viewingWeek}`;
              const dayWorkouts = weeklySchedule[weekKey]?.[day] || [];
              const workoutIds = Array.isArray(dayWorkouts) ? dayWorkouts : (dayWorkouts ? [dayWorkouts] : []);

              return (
                <div key={day} className={`border-2 rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-md ${
                  isToday ? 'border-purple-600 ring-2 ring-purple-200 dark:ring-purple-700' : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold capitalize text-base ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                          Aujourd'hui
                        </span>
                      )}
                    </div>
                    {workoutIds.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {workoutIds.length} session{workoutIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Sessions existantes */}
                  {workoutIds.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {workoutIds.map((wId, index) => {
                        const workout = workouts.find(w => w.id === wId);
                        return (
                          <div key={index} className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/30 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🎵</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                {workout ? workout.name : 'Session supprimée'}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                const newSchedule = {...weeklySchedule};
                                newSchedule[weekKey][day] = workoutIds.filter((_, i) => i !== index);
                                setWeeklySchedule(newSchedule);
                              }}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {workoutIds.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">🌙 {t('schedule.restDay')}</p>
                  )}

                  {/* Sélecteur pour ajouter une session */}
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const newSchedule = {...weeklySchedule};
                        newSchedule[weekKey][day] = [...workoutIds, parseInt(e.target.value)];
                        setWeeklySchedule(newSchedule);
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                  >
                    <option value="">+ {t('schedule.addSession')}</option>
                    {workouts.map(w => (
                      <option key={w.id} value={w.id}>🎵 {w.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
            <div className="h-4"></div>
          </div>
          
          <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl">
            <button
              onClick={() => setShowSchedule(false)}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
            >
              ✓ Sauvegarder le planning
            </button>
          </div>
        </div>
      )}

      {/* Page Workout actif */}
      {activeWorkout && (
        <div className="min-h-screen bg-white dark:bg-gray-800 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8">
            <button 
              onClick={() => setActiveWorkout(null)}
              className="text-white text-sm font-medium mb-4"
            >
              ← Retour
            </button>
            <h1 className="text-3xl font-bold mb-2">{activeWorkout.name}</h1>
            <div className="flex items-center gap-4 text-purple-100">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{activeWorkout.duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-4 h-4" />
                <span className="text-sm">{activeWorkout.exercises.length} exercices</span>
              </div>
            </div>
            {(activeWorkout.shortTermGoal || activeWorkout.mediumTermGoal) && (
              <div className="mt-3 space-y-1">
                {activeWorkout.shortTermGoal && (
                  <p className="text-sm text-purple-200">🎯 {activeWorkout.shortTermGoal}</p>
                )}
                {activeWorkout.mediumTermGoal && (
                  <p className="text-sm text-purple-200">🗓️ {activeWorkout.mediumTermGoal}</p>
                )}
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {activeWorkout.exercises.map((exerciseId, index) => {
              const exercise = exercises.find(ex => ex.id === exerciseId);
              if (!exercise) return null;
              
              const key = `${activeWorkout.id}-${exerciseId}`;
              const status = workoutProgress[key];
              
              return (
                <div
                  key={exerciseId}
                  className={`border-2 rounded-2xl p-5 transition-all ${
                    status === 'completed' ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30' :
                    status === 'skipped' ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' :
                    'border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">#{index + 1}</span>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{exercise.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exercise.duration}
                        </span>
                        <span>{exercise.sets}</span>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'skipped' ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400' :
                        'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {status === 'completed' ? <Check className="w-5 h-5" /> :
                       status === 'skipped' ? <X className="w-5 h-5" /> :
                       <Play className="w-5 h-5" />}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedExercise(exercise)}
                    className="w-full bg-purple-600 dark:bg-purple-500 text-white py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                  >
                    Voir les détails
                  </button>
                </div>
              );
            })}

            {(() => {
              // Vérifier si tous les exercices ont été validés ou sautés
              const allExercisesHandled = activeWorkout.exercises.every(exId => {
                const key = `${activeWorkout.id}-${exId}`;
                return workoutProgress[key] === 'completed' || workoutProgress[key] === 'skipped';
              });
              const handledCount = activeWorkout.exercises.filter(exId => {
                const key = `${activeWorkout.id}-${exId}`;
                return workoutProgress[key] === 'completed' || workoutProgress[key] === 'skipped';
              }).length;

              return (
                <div className="mt-6 space-y-2">
                  {!allExercisesHandled && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                      {handledCount}/{activeWorkout.exercises.length} exercices traités
                    </p>
                  )}
                  <button
                    onClick={() => saveSession(activeWorkout)}
                    disabled={!allExercisesHandled}
                    className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${
                      allExercisesHandled
                        ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-xl'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Terminer la session
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Page Bibliothèque */}
      {activeTab === 'library' && (
        <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
          {/* Header + sous-onglets */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {showTrash ? t('library.trash') : showArchive ? t('home.archivedSessions') : t('library.title')}
              </h1>
              <div className="flex items-center gap-2">
                {librarySubTab === 'exercises' && !showTrash && (
                  <button
                    onClick={() => setShowTrash(true)}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-full shadow hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-600 transition-colors relative"
                  >
                    <Archive className="w-5 h-5" />
                    {deletedExercises.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {deletedExercises.length}
                      </span>
                    )}
                  </button>
                )}
                {showTrash && (
                  <button
                    onClick={() => setShowTrash(false)}
                    className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                  >
                    ← {t('common.back')}
                  </button>
                )}
                {showArchive && (
                  <button
                    onClick={() => setShowArchive(false)}
                    className="bg-purple-600 dark:bg-purple-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                  >
                    ← {t('common.back')}
                  </button>
                )}
                {librarySubTab === 'exercises' && !showTrash && (
                  <button
                    onClick={() => setShowCreateExercise(true)}
                    className="bg-purple-600 dark:bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                {librarySubTab === 'sessions' && !showArchive && (
                  <>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 p-3 rounded-full shadow hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => { setEditingWorkout(null); setShowCreateWorkout(true); }}
                      className="bg-purple-600 dark:bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sous-onglets Exercices / Sessions */}
            {!showTrash && !showArchive && (
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                <button
                  onClick={() => setLibrarySubTab('exercises')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    librarySubTab === 'exercises'
                      ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t('library.exercisesTab')}
                </button>
                <button
                  onClick={() => setLibrarySubTab('sessions')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                    librarySubTab === 'sessions'
                      ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t('library.sessionsTab')}
                </button>
              </div>
            )}
          </div>

          {/* ===== SOUS-ONGLET EXERCICES ===== */}
          {librarySubTab === 'exercises' && (
            <>
              {/* Texte d'aide */}
              {!showTrash && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3">
                  <p className="text-xs text-purple-700 dark:text-purple-300">
                    💡 {t('library.exercisesHint')}
                  </p>
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-2">
                {!showTrash && categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setLibraryFilter(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      libraryFilter === cat
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {translateCategory(cat)}
                  </button>
                ))}
              </div>

              {/* Liste des exercices actifs */}
              {!showTrash && (
                <div className="space-y-3">
                  {filteredExercises.length === 0 ? (
                    <div className="text-center py-8">
                      <Book className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{t('library.exercisesHint')}</p>
                    </div>
                  ) : (
                    filteredExercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow relative"
                      >
                        <div
                          onClick={() => setSelectedExercise(exercise)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 pr-2">
                              <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{exercise.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  exercise.difficulty === 'Débutant' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                                  exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                                  'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                                }`}>
                                  {translateDifficulty(exercise.difficulty)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{translateCategory(exercise.category)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            {exercise.type === 'video' && (
                              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                <Video className="w-4 h-4" />
                                <span className="text-xs">{t('exercise.video')}</span>
                              </span>
                            )}
                            {exercise.type === 'file' && (
                              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                <FileText className="w-4 h-4" />
                                <span className="text-xs">{t('exercise.file')}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {exercise.duration}
                            </span>
                            <span>{exercise.sets}</span>
                            {exercise.baseTempo > 0 && (
                              <span className="flex items-center gap-1">
                                <Activity className="w-4 h-4" />
                                {exercise.baseTempo} BPM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Vue Corbeille */}
              {showTrash && (
                <div className="space-y-3">
                  {deletedExercises.length === 0 ? (
                    <div className="text-center py-12">
                      <Trash2 className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('library.emptyTrash')}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{t('library.deletedAppearHere')}</p>
                    </div>
                  ) : (
                    deletedExercises.map(exercise => (
                      <div
                        key={exercise.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-5 shadow-md border-2 border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">{exercise.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                exercise.difficulty === 'Débutant' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                                exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                                'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              }`}>
                                {translateDifficulty(exercise.difficulty)}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">{translateCategory(exercise.category)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => restoreExercise(exercise.id)}
                            className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                          >
                            ↺ {t('library.restoreExercise')}
                          </button>
                          <button
                            onClick={() => permanentlyDeleteExercise(exercise.id)}
                            className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                          >
                            {t('library.deleteForever')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* ===== SOUS-ONGLET SESSIONS ===== */}
          {librarySubTab === 'sessions' && (
            <>
              {/* Texte d'aide */}
              {!showArchive && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 {t('library.sessionsHint')}
                  </p>
                </div>
              )}

              {/* Bouton archive */}
              {!showArchive && archivedWorkouts.length > 0 && (
                <button
                  onClick={() => setShowArchive(true)}
                  className="text-gray-600 dark:text-gray-400 text-sm font-medium hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 relative"
                >
                  <Archive className="w-4 h-4" />
                  <span>{t('home.archive')}</span>
                  <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center ml-1">
                    {archivedWorkouts.length}
                  </span>
                </button>
              )}

              {/* Liste des sessions actives */}
              {!showArchive && (
                <div className="space-y-3">
                  {workouts.length === 0 ? (
                    <div className="text-center py-8">
                      <Music className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">{t('library.noExercises')}</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">{t('library.sessionsHint')}</p>
                    </div>
                  ) : (
                    workouts.map(workout => (
                      <div
                        key={workout.id}
                        className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 hover:shadow-md transition-shadow relative"
                      >
                        <div
                          onClick={() => {
                            setEditingWorkout(workout);
                            setShowCreateWorkout(true);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{workout.name}</h3>
                            <span className="text-xs bg-purple-200 dark:bg-purple-800/40 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                              {workout.category}
                            </span>
                          </div>
                          {(workout.shortTermGoal || workout.mediumTermGoal) && (
                            <div className="space-y-1 mb-2">
                              {workout.shortTermGoal && (
                                <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2 py-1">
                                  🎯 7j : {workout.shortTermGoal}
                                </p>
                              )}
                              {workout.mediumTermGoal && (
                                <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1">
                                  🗓️ 28j : {workout.mediumTermGoal}
                                </p>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 pb-8">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{workout.duration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-4 h-4" />
                              <span>{workout.exercises.length} exercices</span>
                            </div>
                          </div>
                        </div>

                        {/* Boutons en bas à droite */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportWorkout(workout);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all border border-blue-200 dark:border-blue-700"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t('home.export')}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteWorkout(workout.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-all border border-orange-200 dark:border-orange-700"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>{t('home.archiveAction')}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Vue Archive */}
              {showArchive && (
                <div className="space-y-3">
                  {archivedWorkouts.length === 0 ? (
                    <div className="text-center py-12">
                      <Archive className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('home.emptyArchive')}</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{t('home.archivedAppearHere')}</p>
                    </div>
                  ) : (
                    archivedWorkouts.map(workout => (
                      <div
                        key={workout.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-5 shadow-md border-2 border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-gray-700 dark:text-gray-300">{workout.name}</h3>
                          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">
                            {workout.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{workout.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            <span>{workout.exercises.length} exercices</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => restoreWorkout(workout.id)}
                            className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                          >
                            ↺ {t('home.restore')}
                          </button>
                          <button
                            onClick={() => permanentlyDeleteWorkout(workout.id)}
                            className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                          >
                            {t('home.deletePermanently')}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Page Statistiques */}
      {activeTab === 'stats' && (
        <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stats.title')}</h1>
            <button
              onClick={() => setShowExportModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {t('stats.exportReport')}
            </button>
          </div>

          {/* Encadré informatif */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  📊 {t('stats.shareWithTeacher')}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('stats.shareDescription')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-200 mb-1">{stats.last7Days}</p>
              <p className="text-xs text-purple-900 dark:text-purple-300">{t('stats.sessionsLast7Days')}</p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-green-700 dark:text-green-200 mb-1">{stats.daysWithPractice}/7</p>
              <p className="text-xs text-green-900 dark:text-green-300">{t('stats.daysPracticed')}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-200 mb-1">{stats.last28Days}</p>
              <p className="text-xs text-blue-900 dark:text-blue-300">{t('stats.sessionsLast28Days')}</p>
            </div>
          </div>

          {/* Section Badges */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">🏆 {t('stats.myBadges')}</h2>

            {/* Derniers badges obtenus */}
            {earnedBadges.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('stats.unlockedBadges')} ({earnedBadges.length})</p>
                <div className="flex flex-wrap gap-2">
                  {earnedBadges.slice(-4).reverse().map(badge => (
                    <div
                      key={badge.id}
                      className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm"
                    >
                      <span className="text-xl">{badge.icon}</span>
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{getBadgeName(badge)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prochains badges à débloquer */}
            {(() => {
              const notEarnedBadges = BADGES.filter(b => !earnedBadges.some(e => e.id === b.id));
              const nextTwoBadges = notEarnedBadges.slice(0, 2);
              if (nextTwoBadges.length === 0) return null;
              return (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('stats.nextBadges')}</p>
                  <div className="space-y-2">
                    {nextTwoBadges.map(badge => (
                      <div
                        key={badge.id}
                        className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 flex items-center gap-3"
                      >
                        <span className="text-2xl grayscale opacity-50">{badge.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{getBadgeName(badge)}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-400">{getBadgeDescription(badge)}</p>
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-400">
                          {badge.type === 'streak'
                            ? `${stats.streak}/${badge.threshold}`
                            : `${stats.totalSessions}/${badge.threshold}`
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Bouton voir plus */}
            <button
              onClick={() => setShowAllBadges(true)}
              className="w-full py-3 text-purple-600 dark:text-purple-400 font-medium text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:bg-purple-900/30 rounded-xl transition-colors"
            >
              {t('stats.seeAllBadges')} →
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('stats.recentHistory')}</h2>
            <div className="space-y-3">
              {sessionHistory.slice().reverse().map(session => (
                <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">{session.workoutName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{session.date} à {session.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditSession(session)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:bg-purple-900/30 rounded-lg transition-colors"
                        title="Modifier cette session"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ {session.completed} {session.completed > 1 ? t('stats.exercisesCompleted') : t('stats.exerciseCompleted')}
                    </span>
                    {session.skipped > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        × {session.skipped} {session.skipped > 1 ? t('stats.exercisesSkipped') : t('stats.exerciseSkipped')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Graphiques de progression des tempos */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📈 {t('stats.tempoProgress')}</h2>

            {exercises.filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0).length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">{t('stats.noProgress')}</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  {t('stats.recordTempos')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {exercises
                  .filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0)
                  .map(exercise => {
                    const history = exercise.tempoHistory;
                    const minTempo = Math.min(...history.map(h => h.tempo));
                    const maxTempo = Math.max(...history.map(h => h.tempo));
                    const progression = history.length > 1 ? maxTempo - history[0].tempo : 0;

                    return (
                      <div key={exercise.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                        <div className="mb-4">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{exercise.name}</h3>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('stats.base')}: {exercise.baseTempo} BPM
                            </span>
                            {progression > 0 && (
                              <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                +{progression} BPM
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Graphique simple avec SVG */}
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 rounded-xl p-4">
                          <svg viewBox="0 0 300 100" className="w-full h-24">
                            {/* Grille de fond */}
                            <line x1="0" y1="80" x2="300" y2="80" stroke={settings.theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                            <line x1="0" y1="60" x2="300" y2="60" stroke={settings.theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                            <line x1="0" y1="40" x2="300" y2="40" stroke={settings.theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                            <line x1="0" y1="20" x2="300" y2="20" stroke={settings.theme === 'dark' ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                            
                            {/* Ligne de base */}
                            <line 
                              x1="0" 
                              y1={100 - ((exercise.baseTempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90} 
                              x2="300" 
                              y2={100 - ((exercise.baseTempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90}
                              stroke="#9333ea" 
                              strokeWidth="1" 
                              strokeDasharray="4 4"
                              opacity="0.3"
                            />

                            {/* Points et ligne de progression */}
                            <polyline
                              points={history.map((h, i) => {
                                const x = (i / (history.length - 1 || 1)) * 280 + 10;
                                const y = 100 - ((h.tempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90;
                                return `${x},${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#9333ea"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            
                            {/* Points */}
                            {history.map((h, i) => {
                              const x = (i / (history.length - 1 || 1)) * 280 + 10;
                              const y = 100 - ((h.tempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90;
                              return (
                                <g key={i}>
                                  <circle cx={x} cy={y} r="5" fill="#9333ea" stroke={settings.theme === 'dark' ? '#1f2937' : '#fff'} strokeWidth="2" />
                                </g>
                              );
                            })}
                          </svg>
                          
                          {/* Légende des dates */}
                          <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>{history[0].date}</span>
                            {history.length > 1 && (
                              <span>{history[history.length - 1].date}</span>
                            )}
                          </div>
                        </div>

                        {/* Statistiques */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Min</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{minTempo} BPM</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Max</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{maxTempo} BPM</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Enregistrements</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{history.length}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Réglages */}
      {activeTab === 'settings' && (
        <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.yourName')}</label>
              <input
                type="text"
                value={settings.userName}
                onChange={(e) => setSettings({...settings, userName: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🎯 {t('settings.longTermGoal')}</label>
              <input
                type="text"
                value={settings.longTermGoal || ''}
                onChange={(e) => setSettings({...settings, longTermGoal: e.target.value})}
                placeholder={t('settings.longTermGoalPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📅 {t('settings.cycleStartDate')}</label>
              <input
                type="date"
                value={settings.cycleStartDate || ''}
                onChange={(e) => setSettings({...settings, cycleStartDate: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.cycleStartDateHint')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.language')}</label>
              <select
                value={settings.language || 'en'}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
              >
                {availableLanguages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.theme')}</label>
                <button
                  onClick={() => setSettings({...settings, theme: settings.theme === 'dark' ? 'light' : 'dark'})}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.theme === 'dark' ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${
                    settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {settings.theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.dailyReminder')}</label>
                <button
                  onClick={() => setSettings({...settings, reminderEnabled: !settings.reminderEnabled})}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.reminderEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${
                    settings.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <input
                type="time"
                value={settings.practiceReminder}
                onChange={(e) => setSettings({...settings, practiceReminder: e.target.value})}
                disabled={!settings.reminderEnabled}
                className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 ${
                  !settings.reminderEnabled ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : ''
                }`}
              />
              {settings.reminderEnabled && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('settings.reminderTime')}
                </p>
              )}
            </div>

            {/* Section Notifications - Uniquement sur app native */}
            {isNativePlatform ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('settings.notifications')}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {notificationPermission === 'granted' ? `✅ ${t('settings.allowed')}` :
                       notificationPermission === 'denied' ? `❌ ${t('settings.blocked')}` :
                       `⚠️ ${t('settings.notConfigured')}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.notifications ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Bouton pour activer les permissions */}
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="w-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 py-3 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-5 h-5" />
                    {t('settings.enableNotifications')}
                  </button>
                )}

                {/* Bouton de test si permissions accordées */}
                {notificationPermission === 'granted' && settings.notifications && (
                  <button
                    onClick={sendTestNotification}
                    className="w-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 py-2 rounded-xl font-medium hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors text-sm"
                  >
                    📢 {t('settings.testNotifications')}
                  </button>
                )}

                {/* Info si notifications désactivées */}
                {notificationPermission === 'granted' && !settings.notifications && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      ℹ️ Les notifications sont désactivées. Active-les pour recevoir des rappels.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Message pour la version desktop/iOS */
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                      {t('settings.mobileOnly')}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {settings.language === 'fr'
                        ? "Les notifications et rappels quotidiens sont disponibles uniquement sur l'application Android (APK). Cette fonctionnalité n'est pas disponible sur iOS ou en version web."
                        : "Notifications and daily reminders are only available on the Android app (APK). This feature is not available on iOS or web version."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section Son du Métronome */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <img src="/metronome.svg" alt="Metronome" className="w-5 h-5" style={{filter: 'invert(27%) sepia(95%) saturate(4925%) hue-rotate(258deg) brightness(87%) contrast(97%)'}} />
              {t('settings.metronomeSound')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'click', icon: '🔔', label: t('settings.sounds.click') },
                { id: 'claves', icon: '🥢', label: t('settings.sounds.claves') },
                { id: 'woodblock', icon: '🪵', label: t('settings.sounds.woodblock') },
                { id: 'cowbell', icon: '🔔', label: t('settings.sounds.cowbell') },
                { id: 'hihat', icon: '🥏', label: t('settings.sounds.hihat') },
                { id: 'rimshot', icon: '🥁', label: t('settings.sounds.rimshot') },
              ].map(sound => (
                <button
                  key={sound.id}
                  onClick={() => setSettings({...settings, metronomeSound: sound.id})}
                  className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                    settings.metronomeSound === sound.id
                      ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:border-purple-600'
                  }`}
                >
                  <span className="text-xl">{sound.icon}</span>
                  <span className="text-sm font-medium">{sound.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section Sauvegarde et Restauration */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('settings.dataBackup')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.exportDescription')}
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExportData}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                {t('settings.exportData')}
              </button>
              <label className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                {t('settings.importBackup')}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
              <p className="text-xs text-blue-800">
                💡 {t('settings.autoSaveInfo')}
              </p>
            </div>
          </div>

          {/* À propos */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{settings.language === 'fr' ? 'À propos' : 'About'}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">{settings.language === 'fr' ? 'Version' : 'Version'}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">1.0.0</span>
              </div>
              <button
                onClick={() => setShowPrivacyPolicy(true)}
                className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {settings.language === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          </div>

          {/* Zone de réinitialisation */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border-2 border-red-200 dark:border-red-700">
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">{t('settings.resetApp')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('settings.resetWarning')}
            </p>
            <button
              onClick={async () => {
                if (window.confirm(t('settings.resetConfirm'))) {
                  if (window.confirm(settings.language === 'fr'
                    ? 'Dernière confirmation : cette action est IRRÉVERSIBLE.\n\nVoulez-vous vraiment tout supprimer ?'
                    : 'Final confirmation: this action is IRREVERSIBLE.\n\nDo you really want to delete everything?')) {
                    await clearAppStorage();
                    window.location.reload();
                  }
                }
              }}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {t('settings.resetApp')}
            </button>
          </div>
        </div>
      )}

      {/* Modal Créer/Modifier Exercice */}
      {showCreateExercise && (
        <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto h-screen">
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setShowCreateExercise(false);
                  setUploadedFile(null);
                  setEditingExercise(null);
                  setNewExerciseType('none');
                }}
                className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="font-medium">Retour</span>
              </button>
              <h2 className="text-lg font-bold">{editingExercise ? 'Modifier l\'exercice' : 'Nouvel exercice'}</h2>
              <div className="w-20"></div>
            </div>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();

              const formData = new FormData(e.target);
              const data = {
                name: formData.get('name'),
                duration: formData.get('duration'),
                sets: formData.get('sets'),
                type: newExerciseType || 'none',
                difficulty: formData.get('difficulty'),
                baseTempo: parseInt(formData.get('baseTempo')),
                category: formData.get('category'),
                description: formData.get('description'),
                videoUrl: formData.get('videoUrl') || undefined,
              };

              createExercise(data);
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-600 rounded-xl p-3 mb-2">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">⚠️ Tous les champs marqués d'un * sont obligatoires</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom de l'exercice *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingExercise?.name || ''}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                  placeholder="Exercice technique..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Durée *</label>
                  <input
                    type="text"
                    name="duration"
                    required
                    defaultValue={editingExercise?.duration || ''}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                    placeholder="5 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Séries *</label>
                  <input
                    type="text"
                    name="sets"
                    required
                    defaultValue={editingExercise?.sets || ''}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                    placeholder="3 séries"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Complément (optionnel)</label>
                <div className="flex gap-2">
                  {[
                    { value: 'none', label: 'Aucun' },
                    { value: 'video', label: 'Vidéo' },
                    { value: 'file', label: 'Fichier' }
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setNewExerciseType(type.value);
                        setUploadedFile(null); // Réinitialiser le fichier lors du changement de type
                      }}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors text-sm ${
                        newExerciseType === type.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {newExerciseType === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL YouTube</label>
                  <input
                    type="url"
                    name="videoUrl"
                    defaultValue={editingExercise?.videoUrl || ''}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              )}

              {newExerciseType === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Importer un fichier</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.musicxml,.xml,.gp5,.gpx,.gp"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:bg-purple-900/30 file:text-purple-700 dark:text-purple-300 hover:file:bg-purple-100 dark:bg-purple-900/40"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Formats acceptés : PDF, Images (PNG/JPEG), Partitions (MusicXML), Guitar Pro (GP5/GPX/GP)
                  </p>
                  {uploadedFile && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Fichier ajouté : {uploadedFile.name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulté *</label>
                <select
                  name="difficulty"
                  required
                  defaultValue={editingExercise?.difficulty || 'Débutant'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégorie *</label>
                <select
                  name="category"
                  required
                  defaultValue={editingExercise?.category || exerciseCategories[0]}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                >
                  {exerciseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tempo de base (BPM) *
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(mettre 0 si non applicable)</span>
                </label>
                <input
                  type="number"
                  name="baseTempo"
                  min="0"
                  max="300"
                  required
                  defaultValue={editingExercise?.baseTempo ?? 60}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                  placeholder="60"
                />
              </div>

              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                <textarea
                  name="description"
                  required
                  rows="3"
                  defaultValue={editingExercise?.description || ''}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                  placeholder="Description de l'exercice..."
                />
              </div>
            </div>

            <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  const form = e.target.closest('form');
                  if (!form) {
                    return;
                  }

                  const formData = new FormData(form);
                  const data = {
                    name: formData.get('name'),
                    duration: formData.get('duration'),
                    sets: formData.get('sets'),
                    type: newExerciseType || 'none',
                    difficulty: formData.get('difficulty'),
                    baseTempo: parseInt(formData.get('baseTempo')),
                    category: formData.get('category'),
                    description: formData.get('description'),
                    videoUrl: formData.get('videoUrl') || undefined,
                  };

                  if (!data.name || !data.duration || !data.sets) {
                    showToast('Veuillez remplir tous les champs obligatoires', 'warning');
                    return;
                  }

                  if (editingExercise) {
                    // Mode édition: mettre à jour l'exercice existant
                    const normalizedData = normalizeExerciseFields(data);
                    const updatedExercise = {
                      ...editingExercise,
                      ...normalizedData,
                      fileData: uploadedFile || editingExercise.fileData,
                    };
                    setExercises(exercises.map(ex =>
                      ex.id === editingExercise.id ? updatedExercise : ex
                    ));
                    setEditingExercise(null);
                  } else {
                    // Mode création
                    createExercise(data);
                  }
                  setShowCreateExercise(false);
                  setUploadedFile(null);
                  setNewExerciseType('none');
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
              >
                {editingExercise ? '✓ Enregistrer les modifications' : '✓ Créer l\'exercice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Créer/Éditer Workout */}
      {showCreateWorkout && (
        <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto h-screen">
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowCreateWorkout(false);
                  setEditingWorkout(null);
                }}
                className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="font-medium">Retour</span>
              </button>
              <h2 className="text-lg font-bold">
                {editingWorkout ? 'Modifier' : 'Nouvelle'} session
              </h2>
              <div className="w-20"></div>
            </div>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const selectedExercises = Array.from(formData.getAll('exercises')).map(id => parseInt(id));
              const data = {
                name: formData.get('name'),
                duration: formData.get('duration'),
                category: formData.get('category'),
                exercises: selectedExercises
              };
              createOrUpdateWorkout(data);
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom de la session</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingWorkout?.name}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                  placeholder="Ma routine quotidienne..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Durée estimée</label>
                  <input
                    type="text"
                    name="duration"
                    required
                    defaultValue={editingWorkout?.duration}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                    placeholder="30 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégorie</label>
                  <input
                    type="text"
                    name="category"
                    required
                    defaultValue={editingWorkout?.category}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                    placeholder="Technique"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🎯 {t('workout.shortTermGoal')}</label>
                <textarea
                  name="shortTermGoal"
                  defaultValue={editingWorkout?.shortTermGoal || ''}
                  placeholder={t('workout.shortTermGoalPlaceholder')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🗓️ {t('workout.mediumTermGoal')}</label>
                <textarea
                  name="mediumTermGoal"
                  defaultValue={editingWorkout?.mediumTermGoal || ''}
                  placeholder={t('workout.mediumTermGoalPlaceholder')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                />
              </div>

              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Exercices</label>
                <div className="space-y-2">
                  {exercises.map(ex => (
                    <label
                      key={ex.id}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border border-gray-200 dark:border-gray-700"
                    >
                      <input
                        type="checkbox"
                        name="exercises"
                        value={ex.id}
                        defaultChecked={editingWorkout?.exercises.includes(ex.id)}
                        className="w-5 h-5 text-purple-600 dark:text-purple-400 rounded focus:ring-purple-500 dark:focus:ring-purple-400"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{ex.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{ex.duration}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl space-y-3">
              <button
                
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const form = e.target.closest('form');
                  if (!form) {
                    return;
                  }

                  const formData = new FormData(form);
                  const selectedExercises = Array.from(formData.getAll('exercises')).map(id => parseInt(id));
                  const data = {
                    name: formData.get('name'),
                    duration: formData.get('duration'),
                    category: formData.get('category'),
                    exercises: selectedExercises,
                    shortTermGoal: formData.get('shortTermGoal') || '',
                    mediumTermGoal: formData.get('mediumTermGoal') || ''
                  };

                  if (!data.name || !data.duration || !data.category) {
                    showToast('Veuillez remplir tous les champs obligatoires', 'warning');
                    return;
                  }

                  if (editingWorkout) {
                    setWorkouts(workouts.map(w => w.id === editingWorkout.id ? { ...w, ...data } : w));
                    setEditingWorkout(null);
                    setShowCreateWorkout(false);
                  } else {
                    const maxId = workouts.length > 0 ? Math.max(...workouts.map(w => w.id)) : 0;
                    const newWorkout = {
                      id: maxId + 1,
                      ...data
                    };
                    setWorkouts([...workouts, newWorkout]);
                    setShowCreateWorkout(false);
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
              >
                {editingWorkout ? '✓ Sauvegarder' : '✓ Créer la session'}
              </button>

              {editingWorkout && (
                <button
                  
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) {
                      const workoutId = editingWorkout.id;
                      setWorkouts(workouts.filter(w => w.id !== workoutId));
                      setEditingWorkout(null);
                      setShowCreateWorkout(false);
                    }
                  }}
                  className="w-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium border-2 border-red-200 dark:border-red-700"
                >
                  🗑️ Supprimer cette session
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal Détails Exercice */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="h-full flex flex-col bg-white dark:bg-gray-800 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                    stopTimer();
                    setSelectedExercise(null);
                    setCurrentTempo({});
                    setShowExerciseMenu(false);
                  }}
                  className="text-white text-sm font-medium"
                >
                  ← Retour
                </button>
                <h3 className="font-bold text-lg flex-1 text-center">{selectedExercise.name}</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowExerciseMenu(!showExerciseMenu)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showExerciseMenu && (
                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 min-w-[200px] z-10">
                      <button
                        onClick={() => {
                          setShowExerciseMenu(false);
                          setEditingExercise(selectedExercise);
                          setNewExerciseType(selectedExercise.type || 'none');
                          if (selectedExercise.fileData) {
                            setUploadedFile(selectedExercise.fileData);
                          }
                          setShowCreateExercise(true);
                          setSelectedExercise(null);
                        }}
                        className="w-full px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 flex items-center gap-3"
                      >
                        <Edit2 className="w-5 h-5" />
                        Modifier l'exercice
                      </button>
                      <button
                        onClick={() => {
                          setShowExerciseMenu(false);
                          deleteExercise(selectedExercise.id);
                        }}
                        className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 dark:bg-red-900/30 flex items-center gap-3"
                      >
                        <Trash2 className="w-5 h-5" />
                        Supprimer l'exercice
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  selectedExercise.difficulty === 'Débutant' ? 'bg-green-400 text-green-900 dark:text-green-200' :
                  selectedExercise.difficulty === 'Intermédiaire' ? 'bg-yellow-400 text-yellow-900' :
                  'bg-red-400 text-red-900'
                }`}>
                  {selectedExercise.difficulty}
                </span>
                <span className="text-purple-100 text-sm">{selectedExercise.category}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {selectedExercise.type === 'video' && selectedExercise.videoUrl && (
                  <a
                    href={selectedExercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 shadow-lg hover:from-red-600 hover:to-red-700 transition-all"
                  >
                    <div className="flex items-center gap-4 text-white">
                      <div className="bg-white dark:bg-gray-800 bg-opacity-20 rounded-full p-4">
                        <Video className="w-8 h-8" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">Voir la vidéo</p>
                        <p className="text-red-100 text-sm">Ouvrir sur YouTube</p>
                      </div>
                    </div>
                  </a>
                )}

                {selectedExercise.type === 'file' && selectedExercise.fileData && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 text-center shadow-lg">
                    {/* Vérifier si c'est une image pour l'afficher directement */}
                    {selectedExercise.fileData.name.match(/\.(jpg|jpeg|png)$/i) ? (
                      <>
                        <img 
                          src={selectedExercise.fileData.data} 
                          alt={selectedExercise.name}
                          className="max-w-full h-auto rounded-xl mb-4 shadow-md"
                        />
                        <a
                          href={selectedExercise.fileData.data}
                          download={selectedExercise.fileData.name}
                          className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
                        >
                          Télécharger l'image
                        </a>
                      </>
                    ) : (
                      <>
                        {/* Icône différente selon le type de fichier */}
                        {selectedExercise.fileData.name.match(/\.(gp5|gpx|gp)$/i) ? (
                          <Music className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                        ) : (
                          <FileText className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                        )}
                        <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">{selectedExercise.fileData.name}</p>
                        <a
                          href={selectedExercise.fileData.data}
                          download={selectedExercise.fileData.name}
                          className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
                        >
                          {selectedExercise.fileData.name.match(/\.(gp5|gpx|gp)$/i) 
                            ? 'Télécharger le fichier Guitar Pro'
                            : selectedExercise.fileData.name.match(/\.(pdf)$/i)
                            ? 'Télécharger le PDF'
                            : selectedExercise.fileData.name.match(/\.(musicxml|xml)$/i)
                            ? 'Télécharger la partition'
                            : 'Télécharger le fichier'}
                        </a>
                      </>
                    )}
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedExercise.description}</p>
                </div>

                {/* Notification de fin de chrono */}
                {timerFinished && (
                  <div className="mb-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 shadow-lg animate-pulse">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-3xl">🎉</span>
                      <div className="text-center">
                        <p className="text-white font-bold text-lg">{t('timer.finished')}</p>
                        <p className="text-white/80 text-sm">{t('timer.wellDone')}</p>
                      </div>
                      <span className="text-3xl">🎵</span>
                    </div>
                    <button
                      onClick={() => setTimerFinished(false)}
                      className="mt-2 w-full bg-white/20 hover:bg-white/30 text-white py-1 rounded-lg text-sm transition-colors"
                    >
                      {t('common.close')}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Bloc Durée avec Chronomètre */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-2xl p-5 shadow-md">
                    <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Durée</p>

                    {timerActive || timerPaused || timerSeconds > 0 ? (
                      <>
                        <p className="font-bold text-purple-600 dark:text-purple-400 text-3xl mb-2">
                          {formatTime(timerSeconds)}
                        </p>
                        <div className="flex gap-2">
                          {timerActive ? (
                            <button
                              onClick={() => pauseTimer()}
                              className="flex-1 bg-yellow-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-yellow-600 transition-colors"
                            >
                              ⏸ Pause
                            </button>
                          ) : (
                            <button
                              onClick={() => resumeTimer()}
                              className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                            >
                              ▶️ Reprendre
                            </button>
                          )}
                          <button
                            onClick={() => stopTimer()}
                            className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors"
                          >
                            ⏹ Stop
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">{selectedExercise.duration}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{selectedExercise.sets}</p>
                        <button
                          onClick={() => startTimer(selectedExercise)}
                          className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                        >
                          ⏱️ Lancer le chrono
                        </button>
                      </>
                    )}
                  </div>
                  {selectedExercise.baseTempo > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-md">
                      <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tempo</p>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selectedExercise.baseTempo} BPM</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tempo de base</p>
                    </div>
                  )}
                </div>

                {/* Métronome compact */}
                <Metronome
                  initialTempo={selectedExercise.baseTempo > 0 ? selectedExercise.baseTempo : 120}
                  compact={true}
                  t={t}
                  soundType={settings.metronomeSound}
                  theme={settings.theme}
                />

                {selectedExercise.baseTempo > 0 && (
                  <>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-700">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        Enregistrer ton tempo
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">Avant de valider, note le tempo que tu as atteint</p>
                      <div className="flex gap-3 mb-3">
                        <input
                          type="number"
                          min="20"
                          max="300"
                          value={currentTempo[selectedExercise.id] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 300)) {
                              setCurrentTempo({...currentTempo, [selectedExercise.id]: value});
                            }
                          }}
                          placeholder={`${selectedExercise.baseTempo}`}
                          className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-lg font-bold text-center"
                        />
                        <span className="text-blue-700 dark:text-blue-300 font-bold flex items-center px-3">BPM</span>
                      </div>
                      <button
                        onClick={() => saveTempo(selectedExercise.id)}
                        disabled={!currentTempo[selectedExercise.id]}
                        className={`w-full py-3 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                          currentTempo[selectedExercise.id]
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <TrendingUp className="w-5 h-5" />
                        Enregistrer mon tempo
                      </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Historique de progression</h4>
                      {selectedExercise.tempoHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedExercise.tempoHistory.slice().reverse().map((entry, idx, reversedArray) => {
                            // Comparer avec l'entrée suivante (plus ancienne) dans l'ordre inversé
                            const olderEntry = reversedArray[idx + 1];
                            const isImprovement = olderEntry && entry.tempo > olderEntry.tempo;
                            return (
                              <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{entry.date}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 dark:text-gray-100">{entry.tempo} BPM</span>
                                  {isImprovement && (
                                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucun tempo enregistré pour le moment</p>
                      )}
                    </div>
                  </>
                )}

                {/* Zone de notes/observations - uniquement pendant une session active */}
                {(activeWorkout && activeWorkout.exercises.includes(selectedExercise.id)) && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 shadow-lg border border-amber-200">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <span className="text-xl">📝</span>
                      {t('exercise.notes')}
                    </h4>
                    <textarea
                      value={exerciseNotes[selectedExercise.id] || ''}
                      onChange={(e) => setExerciseNotes({...exerciseNotes, [selectedExercise.id]: e.target.value})}
                      placeholder={t('exercise.notesPlaceholder')}
                      className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-white dark:bg-gray-800"
                      rows={3}
                    />
                    <p className="text-xs text-amber-700 mt-2">
                      {t('exercise.notesHint')}
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* Boutons flottants en bas - uniquement pendant une session active */}
            {activeWorkout && activeWorkout.exercises.includes(selectedExercise.id) && (
              <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
                {(() => {
                  const key = `${activeWorkout.id}-${selectedExercise.id}`;
                  const status = workoutProgress[key];

                  if (status === 'completed') {
                    return (
                      <div className="space-y-3">
                        <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
                          <div className="bg-green-500 rounded-full p-2">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-green-900 dark:text-green-200">Exercice validé !</span>
                        </div>
                        <button
                          onClick={() => {
                            const newProgress = {...workoutProgress};
                            delete newProgress[key];
                            setWorkoutProgress(newProgress);
                          }}
                          className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    );
                  }

                  if (status === 'skipped') {
                    return (
                      <div className="space-y-3">
                        <div className="bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 flex items-center gap-3">
                          <div className="bg-gray-400 rounded-full p-2">
                            <X className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-bold text-gray-700 dark:text-gray-300">Exercice sauté</span>
                        </div>
                        <button
                          onClick={() => {
                            const newProgress = {...workoutProgress};
                            delete newProgress[key];
                            setWorkoutProgress(newProgress);
                          }}
                          className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    );
                  }

                  // Vérifier si un tempo est saisi mais non enregistré
                  const hasUnsavedTempo = selectedExercise.baseTempo > 0 && currentTempo[selectedExercise.id];

                  return (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setWorkoutProgress({...workoutProgress, [key]: 'skipped'});
                          }}
                          className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          Sauter
                        </button>
                        <button
                          onClick={() => {
                            // Auto-enregistrer le tempo si saisi
                            if (hasUnsavedTempo) {
                              saveTempo(selectedExercise.id);
                            }
                            setWorkoutProgress({...workoutProgress, [key]: 'completed'});
                            // Fermer l'exercice
                            stopTimer();
                            setSelectedExercise(null);
                          }}
                          className="flex-[2] bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-6 h-6" />
                          Valider l'exercice
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Boutons flottants en bas - en mode édition de session terminée */}
            {editingSession && editingSession.workoutId && (() => {
              const workout = workouts.find(w => w.id === editingSession.workoutId);
              if (!workout || !workout.exercises.includes(selectedExercise.id)) return null;

              return (
                <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
                  {(() => {
                    const status = editingSessionProgress[selectedExercise.id];

                    if (status === 'completed') {
                      return (
                        <div className="space-y-3">
                          <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
                            <div className="bg-green-500 rounded-full p-2">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-green-900 dark:text-green-200">Exercice validé !</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'skipped'});
                            }}
                            className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                          >
                            Marquer comme sauté
                          </button>
                        </div>
                      );
                    }

                    if (status === 'skipped') {
                      return (
                        <div className="space-y-3">
                          <div className="bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 flex items-center gap-3">
                            <div className="bg-gray-400 rounded-full p-2">
                              <X className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-gray-700 dark:text-gray-300">Exercice sauté</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'completed'});
                            }}
                            className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
                          >
                            Marquer comme validé
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'skipped'});
                          }}
                          className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                          <X className="w-5 h-5" />
                          Sauté
                        </button>
                        <button
                          onClick={() => {
                            setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'completed'});
                          }}
                          className="flex-[2] bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                          <Check className="w-6 h-6" />
                          Validé
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Métronome */}
      {showMetronome && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6"
          onClick={() => setShowMetronome(false)}
        >
          <div className="w-full max-w-xs sm:max-w-sm landscape:max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Metronome onClose={() => setShowMetronome(false)} t={t} soundType={settings.metronomeSound} theme={settings.theme} />
          </div>
        </div>
      )}

      {/* Modal Tous les Badges */}
      {showAllBadges && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAllBadges(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">🏆 {t('stats.allBadges')}</h2>
                <button
                  onClick={() => setShowAllBadges(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-yellow-100 text-sm mt-1">
                {earnedBadges.length} / {BADGES.length} {t('stats.badgesUnlocked')}
              </p>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {BADGES.map(badge => {
                  const isEarned = earnedBadges.some(b => b.id === badge.id);
                  const progress = badge.type === 'streak' ? stats.streak : stats.totalSessions;
                  return (
                    <div
                      key={badge.id}
                      className={`rounded-xl p-3 flex items-center gap-3 transition-all ${
                        isEarned
                          ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700'
                      }`}
                    >
                      <span className={`text-2xl ${isEarned ? '' : 'grayscale opacity-50'}`}>{badge.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${isEarned ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-500 dark:text-gray-300'}`}>
                          {getBadgeName(badge)}
                        </p>
                        <p className={`text-xs ${isEarned ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-400 dark:text-gray-400'}`}>
                          {getBadgeDescription(badge)}
                        </p>
                      </div>
                      {isEarned ? (
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-400 flex-shrink-0">
                          {progress}/{badge.threshold}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sélection Période Export */}
      {showExportModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">📊 Exporter le rapport</h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">
                Choisis la période à inclure
              </p>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => generateProgressReport(1)}
                className="w-full py-4 px-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/40 dark:hover:to-purple-800/40 rounded-xl font-medium text-purple-800 dark:text-purple-300 transition-all flex items-center justify-between"
              >
                <span>📅 7 derniers jours</span>
                <span className="text-purple-500 text-sm">1 semaine</span>
              </button>
              <button
                onClick={() => generateProgressReport(2)}
                className="w-full py-4 px-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/40 dark:hover:to-blue-800/40 rounded-xl font-medium text-blue-800 dark:text-blue-200 transition-all flex items-center justify-between"
              >
                <span>📅 14 derniers jours</span>
                <span className="text-blue-500 text-sm">2 semaines</span>
              </button>
              <button
                onClick={() => generateProgressReport(3)}
                className="w-full py-4 px-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/40 dark:hover:to-green-800/40 rounded-xl font-medium text-green-800 dark:text-green-300 transition-all flex items-center justify-between"
              >
                <span>📅 21 derniers jours</span>
                <span className="text-green-500 text-sm">3 semaines</span>
              </button>
              <button
                onClick={() => generateProgressReport(4)}
                className="w-full py-4 px-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/40 dark:hover:to-orange-800/40 rounded-xl font-medium text-orange-800 dark:text-orange-300 transition-all flex items-center justify-between"
              >
                <span>📅 28 derniers jours</span>
                <span className="text-orange-500 text-sm">4 semaines</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Privacy Policy */}
      {showPrivacyPolicy && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPrivacyPolicy(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {settings.language === 'fr' ? '🔒 Politique de confidentialité' : '🔒 Privacy Policy'}
                </h2>
                <button
                  onClick={() => setShowPrivacyPolicy(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-gray-700 dark:text-gray-300">
              {settings.language === 'fr' ? (
                <>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Dernière mise à jour : Février 2025</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">1. Données collectées</h3>
                  <p>MyMusicCoach ne collecte <strong>aucune donnée personnelle</strong> et n'envoie aucune information à des serveurs externes.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">2. Stockage local</h3>
                  <p>Toutes vos données (exercices, sessions, paramètres) sont stockées <strong>uniquement sur votre appareil</strong> dans la mémoire locale du navigateur (IndexedDB).</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">3. Données stockées</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Vos exercices personnalisés</li>
                    <li>Vos sessions d'entraînement</li>
                    <li>Votre historique de progression</li>
                    <li>Vos préférences (nom, langue, rappels)</li>
                    <li>Les tempos enregistrés</li>
                  </ul>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">4. Partage de données</h3>
                  <p>Aucune donnée n'est partagée avec des tiers. La fonction d'export génère un fichier que <strong>vous seul contrôlez</strong>.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">5. Notifications</h3>
                  <p>Les notifications de rappel sont gérées localement sur votre appareil. Aucune information n'est transmise.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">6. Suppression des données</h3>
                  <p>Vous pouvez supprimer toutes vos données à tout moment via l'option "Réinitialiser l'application" dans les paramètres.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">7. Contact</h3>
                  <p>Pour toute question concernant cette politique, contactez-nous à : <span className="text-purple-600 dark:text-purple-400">contact@mymusiccoach.app</span></p>
                </>
              ) : (
                <>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Last updated: February 2025</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">1. Data Collection</h3>
                  <p>MyMusicCoach does <strong>not collect any personal data</strong> and does not send any information to external servers.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">2. Local Storage</h3>
                  <p>All your data (exercises, sessions, settings) is stored <strong>only on your device</strong> in the browser's local storage (IndexedDB).</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">3. Stored Data</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your custom exercises</li>
                    <li>Your practice sessions</li>
                    <li>Your progress history</li>
                    <li>Your preferences (name, language, reminders)</li>
                    <li>Recorded tempos</li>
                  </ul>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">4. Data Sharing</h3>
                  <p>No data is shared with third parties. The export function generates a file that <strong>only you control</strong>.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">5. Notifications</h3>
                  <p>Reminder notifications are handled locally on your device. No information is transmitted.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">6. Data Deletion</h3>
                  <p>You can delete all your data at any time using the "Reset Application" option in settings.</p>

                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">7. Contact</h3>
                  <p>For any questions about this policy, contact us at: <span className="text-purple-600 dark:text-purple-400">contact@mymusiccoach.app</span></p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Session */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md sm:max-w-lg landscape:max-w-lg w-full shadow-2xl">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Importer une session</h2>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-blue-100 text-sm">
                Importe une session partagée par ton prof ou un autre musicien
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                      Comment ça marche ?
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Sélectionne un fichier .json exporté depuis MyMusicCoach. La session et tous ses exercices seront automatiquement ajoutés à ton application.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fichier de session (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:bg-blue-900/30 file:text-blue-700 dark:text-blue-300 hover:file:bg-blue-100"
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  💡 <strong>Astuce :</strong> Demande à ton prof d'exporter une session et de t'envoyer le fichier .json par email ou messagerie.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'édition de session terminée */}
      {editingSession && !selectedExercise && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md sm:max-w-lg landscape:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-white font-bold text-xl">Modifier la session</h2>
                  <p className="text-purple-200 text-sm">{editingSession.date} à {editingSession.time}</p>
                </div>
                <button
                  onClick={() => { setEditingSession(null); setEditingSessionProgress({}); }}
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <p className="text-white mt-2 font-medium">{editingSession.workoutName}</p>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Clique sur un exercice pour voir ses détails et modifier son statut ou ajouter un tempo.
              </p>

              {(() => {
                const workout = workouts.find(w => w.id === editingSession.workoutId);
                if (!workout) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">La session originale n'existe plus.</p>
                    </div>
                  );
                }

                return workout.exercises.map((exerciseId, index) => {
                  const exercise = exercises.find(ex => ex.id === exerciseId);
                  if (!exercise) return null;

                  const status = editingSessionProgress[exerciseId] || 'pending';

                  return (
                    <div
                      key={exerciseId}
                      className={`border-2 rounded-2xl p-5 transition-all ${
                        status === 'completed' ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30' :
                        status === 'skipped' ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' :
                        'border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">#{index + 1}</span>
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{exercise.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {exercise.duration}
                            </span>
                            <span>{exercise.sets}</span>
                          </div>
                        </div>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            status === 'completed' ? 'bg-green-500 text-white' :
                            status === 'skipped' ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400' :
                            'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {status === 'completed' ? <Check className="w-5 h-5" /> :
                           status === 'skipped' ? <X className="w-5 h-5" /> :
                           <Play className="w-5 h-5" />}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedExercise(exercise)}
                        className="w-full bg-purple-600 text-white py-2 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors text-sm"
                      >
                        Voir les détails
                      </button>
                    </div>
                  );
                });
              })()}

              <button
                onClick={updateSession}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg mt-6"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de choix d'export (Android) */}
      {exportModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-5">
              <h2 className="text-white font-bold text-lg">Exporter le fichier</h2>
              <p className="text-purple-200 text-sm mt-1">{exportModalData.fileName}</p>
            </div>

            <div className="p-5 space-y-3">
              <button
                onClick={() => saveToDownloads(exportModalData.content, exportModalData.fileName)}
                className="w-full flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 dark:bg-green-900/40 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-gray-100">Télécharger</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sauvegarder dans Téléchargements</p>
                </div>
              </button>

              <button
                onClick={() => shareFile(exportModalData.content, exportModalData.fileName)}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-gray-100">Partager</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Envoyer par email, Drive, etc.</p>
                </div>
              </button>

              <button
                onClick={() => setExportModalData(null)}
                className="w-full p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300 font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] space-y-2 max-w-sm w-full px-4">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
                toast.type === 'success' ? 'bg-green-500 text-white' :
                toast.type === 'error' ? 'bg-red-500 text-white' :
                toast.type === 'warning' ? 'bg-amber-500 text-white' :
                'bg-gray-800 text-white'
              }`}
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Barre de navigation */}
      {!selectedExercise && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto z-40">
        <div className="flex justify-around">
          <button
            onClick={() => { setActiveTab('home'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'home' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.home')}</span>
          </button>
          <button
            onClick={() => { setActiveTab('library'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'library' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Book className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.exercises')}</span>
          </button>
          <button
            onClick={() => { setActiveTab('stats'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'stats' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.stats')}</span>
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'settings' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">{t('nav.settings')}</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default MyMusicCoach;
