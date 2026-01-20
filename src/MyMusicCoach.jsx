import React, { useState, useEffect } from 'react';
import { Play, Check, Clock, TrendingUp, Plus, Home, Book, BarChart3, Settings, Video, FileText, Activity, Calendar, X, Edit2, Trash2, Target, Award, ChevronRight, Bell, Music, Archive, Download, Upload } from 'lucide-react';
import { useLocalStorage, exportAppData, importAppData } from './hooks/useLocalStorage';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

const MyMusicCoach = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [workoutProgress, setWorkoutProgress] = useState({});
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [currentTempo, setCurrentTempo] = useState({});
  const [showSchedule, setShowSchedule] = useState(false);
  const [sessionHistory, setSessionHistory] = useLocalStorage('mmc_sessionHistory', [
    { id: 1, date: "2026-01-10", time: "18:30", workoutId: 1, workoutName: "Routine Débutant", completed: 3, skipped: 0, total: 3 },
    { id: 2, date: "2026-01-12", time: "19:00", workoutId: 2, workoutName: "Improvisation Blues", completed: 2, skipped: 0, total: 2 },
    { id: 3, date: "2026-01-13", time: "17:45", workoutId: 1, workoutName: "Routine Débutant", completed: 2, skipped: 1, total: 3 }
  ]);
  const [libraryFilter, setLibraryFilter] = useState('Tous');
  const [showCreateExercise, setShowCreateExercise] = useState(false);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [exportModalData, setExportModalData] = useState(null); // { content, fileName, mimeType }
  const [newExerciseType, setNewExerciseType] = useState('none');
  
  // États pour les objectifs et réglages
  const [goals, setGoals] = useLocalStorage('mmc_goals', [
    { id: 1, title: "Maîtriser la gamme pentatonique", target: 100, current: 75, unit: "BPM" },
    { id: 2, title: "Pratiquer 4 fois cette semaine", target: 4, current: 2, unit: "sessions" }
  ]);
  const [settings, setSettings] = useLocalStorage('mmc_settings', {
    notifications: true,
    practiceReminder: "18:00",
    theme: "light",
    defaultTempo: 60,
    userName: "Musicien",
    instrument: "guitare" // Nouvel ajout
  });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  // Fonction pour détecter si on est sur mobile
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const [isMobile] = useState(isMobileDevice());
  const [uploadedFile, setUploadedFile] = useState(null);
  const [deletedExercises, setDeletedExercises] = useLocalStorage('mmc_deletedExercises', []);
  const [showTrash, setShowTrash] = useState(false);
  const [archivedWorkouts, setArchivedWorkouts] = useLocalStorage('mmc_archivedWorkouts', []);
  const [showArchive, setShowArchive] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);

  // Configuration des instruments disponibles
  const instruments = {
    guitare: {
      name: "Guitare",
      emoji: "🎸",
      categories: ["Gammes", "Accords", "Techniques", "Rythmes", "Solos"]
    },
    piano: {
      name: "Piano",
      emoji: "🎹",
      categories: ["Gammes", "Accords", "Arpeges", "Techniques", "Morceaux"]
    },
    batterie: {
      name: "Batterie",
      emoji: "🥁",
      categories: ["Rythmes", "Rudiments", "Grooves", "Fills", "Techniques"]
    },
    basse: {
      name: "Basse",
      emoji: "🎸",
      categories: ["Gammes", "Slap", "Techniques", "Grooves", "Walking Bass"]
    },
    violon: {
      name: "Violon",
      emoji: "🎻",
      categories: ["Gammes", "Techniques d'archet", "Vibrato", "Positions", "Morceaux"]
    },
    chant: {
      name: "Chant",
      emoji: "🎤",
      categories: ["Respiration", "Vocalises", "Tessiture", "Interprétation", "Répertoire"]
    },
    saxophone: {
      name: "Saxophone",
      emoji: "🎷",
      categories: ["Gammes", "Embouchure", "Articulation", "Improvisation", "Morceaux"]
    },
    harpe: {
      name: "Harpe",
      emoji: "harpe",
      icon: "/harpe.png",
      categories: ["Gammes", "Arpèges", "Techniques", "Pédales", "Morceaux"]
    },
    autre: {
      name: "Autre",
      emoji: "🎵",
      categories: ["Technique", "Théorie", "Pratique", "Répertoire", "Improvisation"]
    }
  };

  // Exercices adaptés selon l'instrument
  const getDefaultExercises = (instrument) => {
    const baseExercises = {
      guitare: [
        {
          id: 1,
          name: "Gamme pentatonique - Position 1",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Gammes",
          description: "Travail de la gamme pentatonique en position 1.",
          videoUrl: "https://youtube.com/shorts/y6Qcxd0cuTU?si=pHSn7fHKBaezhyQJ",
          tempoHistory: [
            { date: "2026-01-06", tempo: 55 },
            { date: "2026-01-08", tempo: 58 },
            { date: "2026-01-10", tempo: 62 }
          ]
        },
        {
          id: 2,
          name: "Alternate picking - Exercice 1",
          duration: "8 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Intermédiaire",
          baseTempo: 80,
          category: "Techniques",
          description: "Technique d'aller-retour au médiator.",
          videoUrl: "https://youtu.be/q8SHmo1-dac?si=sIfy2-PxeaTc7C-M",
          tempoHistory: []
        }
      ],
      piano: [
        {
          id: 1,
          name: "Gammes majeures - Do majeur",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Gammes",
          description: "Travail de la gamme de Do majeur sur 2 octaves.",
          videoUrl: "https://youtu.be/d4_fZ8FLM1s?si=lDSqZxdB-eiQWAIY",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Arpèges - Accords de 7ème",
          duration: "8 min",
          sets: "4 séries",
          type: "pdf",
          difficulty: "Intermédiaire",
          baseTempo: 70,
          category: "Arpeges",
          description: "Travail des arpèges d'accords de 7ème.",
          videoUrl: "https://youtu.be/I5yeuOSLdpA?si=wkVRFs0iOvIq9KqL",
          tempoHistory: []
        }
      ],
      batterie: [
        {
          id: 1,
          name: "Paradiddle simple",
          duration: "5 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 80,
          category: "Rudiments",
          description: "Travail du paradiddle simple (RLRR LRLL).",
          videoUrl: "https://youtube.com/shorts/RiTRF3W1muA?si=_U40VYDrAJt9cdC6",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Groove Rock de base",
          duration: "8 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 100,
          category: "Grooves",
          description: "Pattern de base rock : charleston, caisse claire et grosse caisse.",
          videoUrl: "https://youtube.com/shorts/eEBscgvQSjg?si=EERicOM4YPc5-_nE",
          tempoHistory: []
        }
      ],
      basse: [
        {
          id: 1,
          name: "Gamme pentatonique mineure",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Gammes",
          description: "Travail de la pentatonique mineure sur tout le manche.",
          videoUrl: "https://youtu.be/rPE9OPnW6lo?si=qkSHlBlrSifGvOGx",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Slap de base - Pouce et pop",
          duration: "8 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Intermédiaire",
          baseTempo: 90,
          category: "Slap",
          description: "Technique de slap : alternance pouce et pop.",
          videoUrl: "hhttps://youtu.be/ZihTfk2vYYI?si=vsjoqKmhIrYMaDlE",
          tempoHistory: []
        }
      ],
      violon: [
        {
          id: 1,
          name: "Gamme de La majeur - 2 octaves",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Gammes",
          description: "Travail de la gamme de La majeur sur 2 octaves.",
          videoUrl: "https://youtu.be/2RIjMFAGzkA?si=C_FQB4-6uUf7s5gr",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Détaché - Coups d'archet",
          duration: "8 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Intermédiaire",
          baseTempo: 80,
          category: "Techniques d'archet",
          description: "Travail du détaché avec différentes longueurs d'archet.",
          videoUrl: "https://youtu.be/xEP0HOgkXfg?si=M0q8pkJYodLZ53bJ",
          tempoHistory: []
        }
      ],
      chant: [
        {
          id: 1,
          name: "Respiration diaphragmatique",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Respiration",
          description: "Exercices de respiration abdominale pour le chant.",
          videoUrl: "https://youtube.com/shorts/UmbFIVSVrkU?si=aXCTo75194etscD6",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Vocalises - Montées chromatiques",
          duration: "8 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Intermédiaire",
          baseTempo: 0,
          category: "Vocalises",
          description: "Vocalises sur voyelles pour échauffer la voix.",
          videoUrl: "https://youtu.be/oGn5NhyNJ7g?si=fnAVMbu8rY1hSkKm",
          tempoHistory: []
        }
      ],
      saxophone: [
        {
          id: 1,
          name: "Gamme de Sib majeur",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Gammes",
          description: "Travail de la gamme de Sib majeur sur toute la tessiture.",
          videoUrl: "https://youtu.be/mA9vMvSD4ps?si=_iYkfIMF_JNwUZC1",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Articulation - Staccato et legato",
          duration: "8 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Intermédiaire",
          baseTempo: 80,
          category: "Articulation",
          description: "Travail des différentes articulations au saxophone.",
          videoUrl: "https://youtube.com/shorts/MeBDAcqiN84?si=Nce3V2IL-dbvk_Gm",
          tempoHistory: []
        }
      ],
      harpe: [
        {
          id: 1,
          name: "Arpèges de base",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Arpèges",
          description: "Travail des arpèges fondamentaux à la harpe.",
          videoUrl: "https://youtu.be/Lt-EbtQDXpw?si=zHyBh2aufaJXaNaN",
          tempoHistory: []
        },
        {
          id: 2,
          name: "Gamme de Do majeur",
          duration: "8 min",
          sets: "4 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 70,
          category: "Gammes",
          description: "Travail de la gamme de Do majeur sur plusieurs octaves.",
          videoUrl: "https://youtu.be/5pQUZbryDJY?si=08qm9_35XOp1Shma",
          tempoHistory: []
        }
      ],
      autre: [
        {
          id: 1,
          name: "Échauffement technique",
          duration: "5 min",
          sets: "3 séries",
          type: "video",
          difficulty: "Débutant",
          baseTempo: 60,
          category: "Technique",
          description: "Exercice d'échauffement général.",
          videoUrl: "https://youtu.be/a9EtBnKwEro?si=i_U-CzQmAMsQn7vP",
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
          category: "Pratique",
          description: "Travail du sens rythmique.",
          videoUrl: "https://youtu.be/s2IBDpvHUQQ?si=MU-_88SYQbuXhDOV",
          tempoHistory: []
        }
      ]
    };

    return baseExercises[instrument] || baseExercises.autre;
  };

  const [exercises, setExercises] = useLocalStorage('mmc_exercises', getDefaultExercises(settings.instrument));

  const [workouts, setWorkouts] = useLocalStorage('mmc_workouts', [
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

  const [weeklySchedule, setWeeklySchedule] = useLocalStorage('mmc_weeklySchedule', {
    semaine1: {
      lundi: 1,
      mardi: null,
      mercredi: 2,
      jeudi: null,
      vendredi: 1,
      samedi: null,
      dimanche: null
    },
    semaine2: {
      lundi: 2,
      mardi: null,
      mercredi: 1,
      jeudi: null,
      vendredi: null,
      samedi: 2,
      dimanche: null
    },
    semaine3: {
      lundi: 1,
      mardi: 1,
      mercredi: null,
      jeudi: 2,
      vendredi: null,
      samedi: null,
      dimanche: null
    },
    semaine4: {
      lundi: null,
      mardi: 2,
      mercredi: null,
      jeudi: 1,
      vendredi: 2,
      samedi: null,
      dimanche: 1
    }
  });

  const [viewingWeek, setViewingWeek] = useState(1); // Pour le modal de planning

  const stats = {
    thisWeek: sessionHistory.length,
    streak: 5,
    totalSessions: 47 + sessionHistory.length
  };

  // Fonction pour changer d'instrument
  const changeInstrument = (newInstrument) => {
    setSettings({...settings, instrument: newInstrument});
    // Réinitialiser les exercices avec ceux de l'instrument choisi
    setExercises(getDefaultExercises(newInstrument));
    // Optionnel : réinitialiser les workouts
    setWorkouts([
      {
        id: 1,
        name: "Routine Débutant",
        duration: "30 min",
        exercises: [1, 2],
        category: "Technique"
      }
    ]);
  };

  // Fonctions de notification
  const requestNotificationPermission = async () => {
    if (!isMobile) {
      alert('Les notifications sont disponibles uniquement sur l\'application mobile.');
      return;
    }

    if (typeof Notification === 'undefined') {
      alert('Les notifications ne sont pas supportées par ce navigateur.');
      return;
    }

    if (Notification.permission === 'granted') {
      alert('Les notifications sont déjà autorisées.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('Les notifications ont été bloquées. Veuillez les autoriser dans les paramètres de votre navigateur.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        sendTestNotification();
      }
    } catch (error) {
      alert('Erreur lors de la demande de permission.');
    }
  };

  const sendTestNotification = () => {
    if (!isMobile) return;
    if (Notification.permission === 'granted') {
      new Notification('🎵 MyMusicCoach', {
        body: `Bonjour ${settings.userName} ! Les notifications sont activées.`,
        icon: '🎵',
        badge: '🎵'
      });
    }
  };

  const sendSessionReminder = () => {
    if (!isMobile) return;
    if (Notification.permission !== 'granted' || !settings.notifications) return;

    const todayWorkout = getTodayWorkout();
    if (!todayWorkout) return;

    const isCompleted = isTodaySessionCompleted();
    if (isCompleted) return;

    new Notification('🎵 MyMusicCoach - Session du jour', {
      body: `Il est temps de pratiquer ! Session : ${todayWorkout.name} (${todayWorkout.duration})`,
      icon: '🎵',
      badge: '🎵',
      tag: 'daily-practice',
      requireInteraction: false
    });
  };

  const checkAndSendReminder = () => {
    if (!isMobile) return;
    if (!settings.notifications) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Vérifier si c'est l'heure du rappel
    if (currentTime === settings.practiceReminder) {
      sendSessionReminder();
    }
  };

  // Vérifier toutes les minutes si c'est l'heure du rappel (seulement sur mobile)
  React.useEffect(() => {
    if (!isMobile) return;

    const interval = setInterval(() => {
      checkAndSendReminder();
    }, 60000); // Toutes les 60 secondes

    return () => clearInterval(interval);
  }, [settings.notifications, settings.practiceReminder, weeklySchedule, sessionHistory, workouts]);

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
      alert(`Fichier sauvegardé dans Téléchargements :\n${fileName}`);
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
        alert(`Fichier sauvegardé dans Documents :\n${fileName}`);
        setExportModalData(null);
        return true;
      } catch (err) {
        alert('Erreur lors de la sauvegarde. Essayez l\'option Partager.');
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
      alert('Erreur lors du partage.');
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
        alert(`Contenu copié dans le presse-papier !\n\nCollez-le dans l'app Fichiers ou Notes pour le sauvegarder sous le nom :\n${fileName}`);
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
      const dataToExport = exportAppData();
      const fileName = `mymusiccoach-backup-${new Date().toISOString().split('T')[0]}.json`;
      await downloadFile(dataToExport, fileName, 'application/json');
    } catch (error) {
      alert('Erreur lors de l\'export des données.');
      console.error(error);
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = importAppData(e.target.result);
        if (result.success) {
          alert('Données importées. La page va se recharger.');
          window.location.reload();
        } else {
          alert(result.message);
        }
      } catch (error) {
        alert('Fichier invalide.');
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

  // Fonction pour obtenir la semaine actuelle du cycle de 4 semaines (1-4)
  const getCurrentWeekNumber = () => {
    const today = new Date();
    const startDate = new Date('2026-01-13'); // Date de référence (lundi de la semaine 1)
    const diffTime = today - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) % 4; // Cycle de 4 semaines
    return weekNumber + 1; // Retourne 1, 2, 3 ou 4
  };

  // Fonction pour obtenir la date d'aujourd'hui au format ISO
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Fonction pour vérifier si la session d'aujourd'hui a été faite
  const isTodaySessionCompleted = () => {
    const today = getTodayDate();
    return sessionHistory.some(session => session.date === today);
  };

  // Fonction pour obtenir la session du jour
  const getTodayWorkout = () => {
    const currentDay = getCurrentDay();
    const currentWeek = getCurrentWeekNumber();
    const weekKey = `semaine${currentWeek}`;
    const workoutId = weeklySchedule[weekKey][currentDay];
    if (workoutId) {
      return workouts.find(w => w.id === workoutId);
    }
    return null;
  };

  const toggleExercise = (workoutId, exerciseId) => {
    const key = `${workoutId}-${exerciseId}`;
    const newProgress = {...workoutProgress};
    
    if (!newProgress[key]) {
      newProgress[key] = 'completed';
    } else if (newProgress[key] === 'completed') {
      newProgress[key] = 'skipped';
    } else {
      newProgress[key] = 'completed';
    }
    
    setWorkoutProgress(newProgress);
  };

  const saveTempo = (exerciseId) => {
    const tempo = parseInt(currentTempo[exerciseId]);
    if (!tempo || tempo <= 0) {
      alert('Veuillez entrer un tempo valide');
      return;
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

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
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const workoutExercises = workout.exercises;
    let completed = 0;
    let skipped = 0;
    
    workoutExercises.forEach(exId => {
      const key = `${workout.id}-${exId}`;
      if (workoutProgress[key] === 'completed') completed++;
      if (workoutProgress[key] === 'skipped') skipped++;
    });
    
    const newSession = {
      id: sessionHistory.length + 1,
      date: dateStr,
      time: timeStr,
      workoutId: workout.id,
      workoutName: workout.name,
      completed,
      skipped,
      total: workoutExercises.length
    };
    
    setSessionHistory([...sessionHistory, newSession]);
    setActiveWorkout(null);
    setWorkoutProgress({});

    // Notification de félicitations (uniquement sur mobile)
    if (isMobile && Notification.permission === 'granted' && settings.notifications) {
      new Notification('🎉 Session terminée !', {
        body: `Bravo ${settings.userName} ! ${completed} exercice${completed > 1 ? 's' : ''} complété${completed > 1 ? 's' : ''} sur ${workoutExercises.length}.`,
        icon: '🎉',
        badge: '🎵'
      });
    }
  };

  // Fonction pour démarrer une session avec notification
  const startWorkout = (workout) => {
    setActiveWorkout(workout);
    
    // Notification de début de session (uniquement sur mobile)
    if (isMobile && Notification.permission === 'granted' && settings.notifications) {
      new Notification('🎵 Session démarrée !', {
        body: `${workout.name} - ${workout.exercises.length} exercice${workout.exercises.length > 1 ? 's' : ''} à pratiquer. Bon courage !`,
        icon: '🎵',
        badge: '🎵'
      });
    }
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

  const deleteGoal = (goalId) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  const addGoal = (title, target, unit) => {
    const maxId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) : 0;
    const newGoal = {
      id: maxId + 1,
      title,
      target: parseInt(target),
      current: 0,
      unit
    };
    setGoals([...goals, newGoal]);
    setShowGoalForm(false);
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

  const createExercise = (formData) => {
    const maxId = exercises.length > 0 ? Math.max(...exercises.map(ex => ex.id)) : 0;
    const newExercise = {
      id: maxId + 1,
      ...formData,
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
    const fileName = `${workout.name.replace(/[^a-z0-9]/gi, '_')}_MyMusicCoach.json`;
    await downloadFile(jsonContent, fileName, 'application/json');
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Le fichier doit être au format JSON');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result);

        // Vérifier la structure du fichier
        if (!importData.version || !importData.workout || !importData.exercises) {
          alert('Format de fichier invalide');
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
        alert('Erreur lors de l\'importation du fichier');
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

  const startTimer = (exercise) => {
    // Arrêter le timer précédent s'il existe
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const totalSeconds = parseDuration(exercise.duration);
    setTimerSeconds(totalSeconds);
    setTimerActive(true);

    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          setTimerInterval(null);
          // Notification de fin
          alert('⏰ Temps écoulé ! Bien joué ! 🎵');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerInterval(interval);
  };

  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setTimerActive(false);
    setTimerSeconds(0);
  };

  const resetTimer = (exercise) => {
    stopTimer();
    const totalSeconds = parseDuration(exercise.duration);
    setTimerSeconds(totalSeconds);
  };

  // Nettoyer le timer quand on quitte la page
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);

  // ===== GÉNÉRATION DU RAPPORT PDF =====
  const generateProgressReport = async () => {
    // Créer le contenu du rapport
    const reportData = {
      userName: settings.userName,
      instrument: currentInstrument.name,
      date: new Date().toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      stats: {
        thisWeek: stats.thisWeek,
        streak: stats.streak,
        totalSessions: stats.totalSessions
      },
      recentSessions: sessionHistory.slice(-10).reverse(),
      goals: goals,
      exercisesWithProgress: exercises.filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0)
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
          <p><strong>${reportData.userName}</strong> - ${reportData.instrument}</p>
          <p>${reportData.date}</p>
        </div>

        <div class="section">
          <h2>📈 Statistiques Globales</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <h3>${reportData.stats.thisWeek}</h3>
              <p>Sessions<br/>cette semaine</p>
            </div>
            <div class="stat-card">
              <h3>${reportData.stats.streak}</h3>
              <p>Jours<br/>consécutifs</p>
            </div>
            <div class="stat-card">
              <h3>${reportData.stats.totalSessions}</h3>
              <p>Sessions<br/>totales</p>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>📅 Historique des Sessions (10 dernières)</h2>
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
                  <td>${session.date} ${session.time}</td>
                  <td><strong>${session.workoutName}</strong></td>
                  <td><span class="badge badge-success">${session.completed}</span></td>
                  <td>${session.skipped > 0 ? `<span class="badge badge-warning">${session.skipped}</span>` : '-'}</td>
                  <td>${session.total}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${reportData.goals.length > 0 ? `
        <div class="section">
          <h2>🎯 Objectifs</h2>
          ${reportData.goals.map(goal => `
            <div style="margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <strong>${goal.title}</strong>
                <span style="color: #9333EA; font-weight: bold;">${goal.current}/${goal.target} ${goal.unit}</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min((goal.current / goal.target) * 100, 100)}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

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

    alert('Rapport téléchargé ! Ouvre le fichier HTML et appuie sur Ctrl+P (ou Cmd+P) pour l\'enregistrer en PDF.');
  };

  const currentInstrument = instruments[settings.instrument];
  const categories = ['Tous', ...currentInstrument.categories];
  const filteredExercises = libraryFilter === 'Tous' 
    ? exercises 
    : exercises.filter(ex => ex.category === libraryFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 pb-20">
      {/* Page d'accueil */}
      {activeTab === 'home' && !activeWorkout && (
        <div className="p-6 space-y-6 max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Bonjour, {settings.userName} 👋
            </h1>
            <p className="text-gray-600 flex items-center justify-center gap-2">
              {currentInstrument.icon ? (
                <img src={currentInstrument.icon} alt={currentInstrument.name} className="w-7 h-7" />
              ) : (
                <span className="text-2xl">{currentInstrument.emoji}</span>
              )}
              Prêt pour ta session de {currentInstrument.name.toLowerCase()} ?
            </p>
          </div>

          {/* Section Session du Jour */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold">Session du Jour</h2>
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
              {getTodayWorkout() ? (
                <div className="space-y-4">
                  {isTodaySessionCompleted() && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="bg-green-500 rounded-full p-2">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-green-900">Session complétée !</p>
                        <p className="text-sm text-green-700 flex items-center gap-1">
                          Excellent travail aujourd'hui
                          {currentInstrument.icon ? (
                            <img src={currentInstrument.icon} alt="" className="w-5 h-5 inline" />
                          ) : (
                            currentInstrument.emoji
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">
                      {getTodayWorkout().name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{getTodayWorkout().duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        <span>{getTodayWorkout().exercises.length} exercices</span>
                      </div>
                    </div>
                    <button
                      onClick={() => startWorkout(getTodayWorkout())}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      disabled={isTodaySessionCompleted()}
                    >
                      <Play className="w-5 h-5" />
                      {isTodaySessionCompleted() ? 'Session terminée' : 'Commencer la session'}
                    </button>
                  </div>

                  {/* Aperçu des exercices */}
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Exercices de la session :</p>
                    {getTodayWorkout().exercises.map((exId) => {
                      const exercise = exercises.find(e => e.id === exId);
                      return exercise ? (
                        <div key={exId} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {exercise.type === 'video' && <Video className="w-4 h-4 text-purple-600" />}
                            {exercise.type === 'file' && <FileText className="w-4 h-4 text-blue-600" />}
                            <div>
                              <p className="text-sm font-medium text-gray-900">{exercise.name}</p>
                              <p className="text-xs text-gray-500">{exercise.duration}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            exercise.difficulty === 'Débutant' ? 'bg-green-100 text-green-700' :
                            exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {exercise.difficulty}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium mb-2">Pas de session programmée</p>
                  <p className="text-sm text-gray-500 mb-4">Profites-en pour te reposer ou personnalise ton planning</p>
                  <button
                    onClick={() => setShowSchedule(true)}
                    className="bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                  >
                    Voir le planning
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Planning hebdomadaire compact */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Semaine {getCurrentWeekNumber()}/4
              </h2>
              <button 
                onClick={() => {
                  setViewingWeek(getCurrentWeekNumber());
                  setShowSchedule(true);
                }}
                className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
              >
                Modifier
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, idx) => {
                const fullDay = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][idx];
                const isToday = getCurrentDay() === fullDay;
                const currentWeek = getCurrentWeekNumber();
                const weekKey = `semaine${currentWeek}`;
                const hasWorkout = weeklySchedule[weekKey][fullDay] !== null;
                
                return (
                  <div key={idx} className="text-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                      isToday 
                        ? 'bg-purple-600 text-white ring-4 ring-purple-200' 
                        : hasWorkout 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {day}
                    </div>
                    {hasWorkout && !isToday && (
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full mx-auto"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statistiques rapides */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
              <p className="text-3xl font-bold text-purple-600 mb-1">{stats.thisWeek}</p>
              <p className="text-xs text-gray-600">Sessions<br/>cette semaine</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
              <p className="text-3xl font-bold text-orange-500 mb-1">{stats.streak}</p>
              <p className="text-xs text-gray-600">Jours<br/>consécutifs</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-lg text-center">
              <p className="text-3xl font-bold text-blue-600 mb-1">{stats.totalSessions}</p>
              <p className="text-xs text-gray-600">Sessions<br/>totales</p>
            </div>
          </div>

          {/* Objectifs */}
          {goals.length > 0 && (
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Mes objectifs</h2>
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-4">
                {goals.slice(0, 2).map(goal => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{goal.title}</span>
                      <span className="text-sm font-bold text-purple-600">
                        {goal.current}/{goal.target} {goal.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                        style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tous les workouts disponibles */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {showArchive ? 'Archive des sessions' : 'Toutes mes sessions'}
              </h2>
              <div className="flex items-center gap-2">
                {!showArchive && (
                  <>
                    <button
                      onClick={() => setShowArchive(true)}
                      className="text-gray-600 text-sm font-medium hover:text-gray-700 flex items-center gap-1 relative"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Archive</span>
                      {archivedWorkouts.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {archivedWorkouts.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      Importer
                    </button>
                  </>
                )}
                {showArchive ? (
                  <button
                    onClick={() => setShowArchive(false)}
                    className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                  >
                    ← Retour
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingWorkout(null);
                      setShowCreateWorkout(true);
                    }}
                    className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Créer
                  </button>
                )}
              </div>
            </div>

            {/* Liste des workouts actifs */}
            {!showArchive && (
              <div className="space-y-3">
                {workouts.map(workout => (
                  <div 
                    key={workout.id}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 hover:shadow-md transition-shadow relative"
                  >
                    <div 
                      onClick={() => startWorkout(workout)}
                      className="cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900">{workout.name}</h3>
                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full">
                          {workout.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 pb-8">
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
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all border border-blue-200"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Exporter</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkout(workout.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all border border-orange-200"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archiver</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vue Archive */}
            {showArchive && (
              <div className="space-y-3">
                {archivedWorkouts.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">L'archive est vide</p>
                    <p className="text-sm text-gray-400 mt-2">Les sessions archivées apparaîtront ici</p>
                  </div>
                ) : (
                  archivedWorkouts.map(workout => (
                    <div
                      key={workout.id}
                      className="bg-gray-50 rounded-2xl p-5 shadow-md border-2 border-gray-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-700">{workout.name}</h3>
                        <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded-full">
                          {workout.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
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
                          ↺ Restaurer
                        </button>
                        <button
                          onClick={() => permanentlyDeleteWorkout(workout.id)}
                          className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                        >
                          Supprimer définitivement
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Planning */}
      {showSchedule && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto h-screen">
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
                        ? 'bg-white text-purple-600'
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
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-purple-50 to-blue-50" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
            {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map(day => {
              const isToday = getCurrentDay() === day && getCurrentWeekNumber() === viewingWeek;
              const weekKey = `semaine${viewingWeek}`;
              const workoutId = weeklySchedule[weekKey][day];
              
              return (
                <div key={day} className={`border-2 rounded-2xl p-4 bg-white shadow-md ${
                  isToday ? 'border-purple-600 ring-2 ring-purple-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold capitalize text-base ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                          Aujourd'hui
                        </span>
                      )}
                    </div>
                    {workoutId && (
                      <button
                        onClick={() => {
                          const newSchedule = {...weeklySchedule};
                          newSchedule[weekKey][day] = null;
                          setWeeklySchedule(newSchedule);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <select
                    value={workoutId || ''}
                    onChange={(e) => {
                      const newSchedule = {...weeklySchedule};
                      newSchedule[weekKey][day] = e.target.value ? parseInt(e.target.value) : null;
                      setWeeklySchedule(newSchedule);
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 font-medium"
                  >
                    <option value="">🌙 Repos</option>
                    {workouts.map(w => (
                      <option key={w.id} value={w.id}>{currentInstrument.icon ? '🎵' : currentInstrument.emoji} {w.name}</option>
                    ))}
                  </select>
                </div>
              );
            })}
            <div className="h-4"></div>
          </div>
          
          <div className="flex-shrink-0 border-t-2 border-gray-200 p-4 bg-white shadow-2xl">
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
        <div className="min-h-screen bg-white max-w-md mx-auto">
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
                    status === 'completed' ? 'border-green-500 bg-green-50' :
                    status === 'skipped' ? 'border-gray-300 bg-gray-50' :
                    'border-purple-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                        <h3 className="font-bold text-gray-900">{exercise.name}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exercise.duration}
                        </span>
                        <span>{exercise.sets}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleExercise(activeWorkout.id, exerciseId)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'skipped' ? 'bg-gray-300 text-gray-600' :
                        'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {status === 'completed' ? <Check className="w-5 h-5" /> : 
                       status === 'skipped' ? <X className="w-5 h-5" /> :
                       <Play className="w-5 h-5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedExercise(exercise)}
                    className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                  >
                    Voir les détails
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => saveSession(activeWorkout)}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg mt-6"
            >
              Terminer la session
            </button>
          </div>
        </div>
      )}

      {/* Page Bibliothèque */}
      {activeTab === 'library' && (
        <div className="p-6 space-y-6 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {showTrash ? 'Corbeille' : 'Mes exercices'}
            </h1>
            <div className="flex items-center gap-2">
              {!showTrash && (
                <button
                  onClick={() => setShowTrash(true)}
                  className="bg-gray-100 text-gray-700 p-3 rounded-full shadow hover:bg-gray-200 transition-colors relative"
                >
                  <Archive className="w-5 h-5" />
                  {deletedExercises.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {deletedExercises.length}
                    </span>
                  )}
                </button>
              )}
              {showTrash ? (
                <button
                  onClick={() => setShowTrash(false)}
                  className="bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                >
                  ← Retour
                </button>
              ) : (
                <button
                  onClick={() => setShowCreateExercise(true)}
                  className="bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {!showTrash && categories.map(cat => (
              <button
                key={cat}
                onClick={() => setLibraryFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  libraryFilter === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Liste des exercices actifs */}
          {!showTrash && (
            <div className="space-y-3">
              {filteredExercises.map(exercise => (
                <div
                  key={exercise.id}
                  className="bg-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow relative"
                >
                  <div
                    onClick={() => setSelectedExercise(exercise)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 pr-2">
                        <h3 className="font-bold text-gray-900 mb-1">{exercise.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            exercise.difficulty === 'Débutant' ? 'bg-green-100 text-green-700' :
                            exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {exercise.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{exercise.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {/* Icônes de type déplacées ici */}
                      {exercise.type === 'video' && (
                        <span className="flex items-center gap-1 text-purple-600">
                          <Video className="w-4 h-4" />
                          <span className="text-xs">Vidéo</span>
                        </span>
                      )}
                      {exercise.type === 'file' && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <FileText className="w-4 h-4" />
                          <span className="text-xs">Fichier</span>
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
              ))}
            </div>
          )}

          {/* Vue Corbeille */}
          {showTrash && (
            <div className="space-y-3">
              {deletedExercises.length === 0 ? (
                <div className="text-center py-12">
                  <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">La corbeille est vide</p>
                  <p className="text-sm text-gray-400 mt-2">Les exercices supprimés apparaîtront ici</p>
                </div>
              ) : (
                deletedExercises.map(exercise => (
                  <div
                    key={exercise.id}
                    className="bg-gray-50 rounded-2xl p-5 shadow-md border-2 border-gray-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-700 mb-1">{exercise.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            exercise.difficulty === 'Débutant' ? 'bg-green-100 text-green-700' :
                            exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {exercise.difficulty}
                          </span>
                          <span className="text-xs text-gray-500">{exercise.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => restoreExercise(exercise.id)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
                      >
                        ↺ Restaurer
                      </button>
                      <button
                        onClick={() => permanentlyDeleteExercise(exercise.id)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                      >
                        Supprimer définitivement
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Page Statistiques */}
      {activeTab === 'stats' && (
        <div className="p-6 space-y-6 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
            <button
              onClick={generateProgressReport}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Exporter mon rapport
            </button>
          </div>

          {/* Encadré informatif */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  📊 Partage ta progression avec ton prof !
                </p>
                <p className="text-xs text-blue-700">
                  Clique sur "Exporter mon rapport" pour générer un PDF professionnel avec tes statistiques, sessions et progression. Parfait pour montrer tes résultats à ton professeur !
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-purple-700 mb-1">{stats.thisWeek}</p>
              <p className="text-xs text-purple-800">Sessions<br/>cette semaine</p>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-orange-700 mb-1">{stats.streak}</p>
              <p className="text-xs text-orange-800">Série<br/>actuelle</p>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-blue-700 mb-1">{stats.totalSessions}</p>
              <p className="text-xs text-blue-800">Sessions<br/>totales</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Historique récent des sessions</h2>
            <div className="space-y-3">
              {sessionHistory.slice().reverse().map(session => (
                <div key={session.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{session.workoutName}</h3>
                      <p className="text-sm text-gray-500">{session.date} à {session.time}</p>
                    </div>
                    <Award className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600 font-medium">
                      ✓ {session.completed} exercice{session.completed > 1 ? 's' : ''} complété{session.completed > 1 ? 's' : ''}
                    </span>
                    {session.skipped > 0 && (
                      <span className="text-gray-500">
                        × {session.skipped} exercice{session.skipped > 1 ? 's' : ''} sauté{session.skipped > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Graphiques de progression des tempos */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📈 Progression des tempos</h2>
            
            {exercises.filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0).length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Aucune progression enregistrée</p>
                <p className="text-sm text-gray-400 mt-2">
                  Enregistre tes tempos dans les exercices pour voir ton évolution !
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
                      <div key={exercise.id} className="border-2 border-gray-200 rounded-2xl p-4">
                        <div className="mb-4">
                          <h3 className="font-bold text-gray-900 mb-1">{exercise.name}</h3>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-600">
                              Base: {exercise.baseTempo} BPM
                            </span>
                            {progression > 0 && (
                              <span className="text-green-600 font-medium flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" />
                                +{progression} BPM
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Graphique simple avec SVG */}
                        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4">
                          <svg viewBox="0 0 300 100" className="w-full h-24">
                            {/* Grille de fond */}
                            <line x1="0" y1="80" x2="300" y2="80" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="60" x2="300" y2="60" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="40" x2="300" y2="40" stroke="#e5e7eb" strokeWidth="1" />
                            <line x1="0" y1="20" x2="300" y2="20" stroke="#e5e7eb" strokeWidth="1" />
                            
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
                                  <circle cx={x} cy={y} r="5" fill="#9333ea" stroke="#fff" strokeWidth="2" />
                                </g>
                              );
                            })}
                          </svg>
                          
                          {/* Légende des dates */}
                          <div className="flex justify-between mt-2 text-xs text-gray-500">
                            <span>{history[0].date}</span>
                            {history.length > 1 && (
                              <span>{history[history.length - 1].date}</span>
                            )}
                          </div>
                        </div>

                        {/* Statistiques */}
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-gray-600">Min</p>
                            <p className="text-sm font-bold text-gray-900">{minTempo} BPM</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-gray-600">Max</p>
                            <p className="text-sm font-bold text-gray-900">{maxTempo} BPM</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-gray-600">Enregistrements</p>
                            <p className="text-sm font-bold text-gray-900">{history.length}</p>
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
        <div className="p-6 space-y-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Réglages</h1>

          <div className="bg-white rounded-3xl shadow-lg p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ton prénom</label>
              <input
                type="text"
                value={settings.userName}
                onChange={(e) => setSettings({...settings, userName: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* NOUVEAU : Sélecteur d'instrument */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ton instrument</label>
              <select
                value={settings.instrument}
                onChange={(e) => changeInstrument(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
              >
                {Object.entries(instruments).map(([key, inst]) => (
                  <option key={key} value={key}>
                    {inst.icon ? '🎵' : inst.emoji} {inst.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Changer d'instrument réinitialisera tes exercices avec des exemples adaptés à {instruments[settings.instrument].name.toLowerCase()}.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tempo par défaut (BPM)</label>
              <input
                type="number"
                value={settings.defaultTempo}
                onChange={(e) => setSettings({...settings, defaultTempo: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rappel quotidien</label>
              <input
                type="time"
                value={settings.practiceReminder}
                onChange={(e) => setSettings({...settings, practiceReminder: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Section Notifications - Uniquement sur mobile */}
            {isMobile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700 block">Notifications</span>
                    <span className="text-xs text-gray-500">
                      {notificationPermission === 'granted' ? '✅ Autorisées' : 
                       notificationPermission === 'denied' ? '❌ Bloquées' : 
                       '⚠️ Non configurées'}
                    </span>
                  </div>
                  <button
                    onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.notifications ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Bouton pour activer les permissions */}
                {notificationPermission !== 'granted' && (
                  <button
                    onClick={requestNotificationPermission}
                    className="w-full bg-purple-100 text-purple-700 py-3 rounded-xl font-medium hover:bg-purple-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-5 h-5" />
                    Activer les notifications du navigateur
                  </button>
                )}

                {/* Bouton de test si permissions accordées */}
                {notificationPermission === 'granted' && settings.notifications && (
                  <button
                    onClick={sendTestNotification}
                    className="w-full bg-green-100 text-green-700 py-2 rounded-xl font-medium hover:bg-green-200 transition-colors text-sm"
                  >
                    📢 Tester les notifications
                  </button>
                )}

                {/* Info si notifications désactivées */}
                {notificationPermission === 'granted' && !settings.notifications && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                    <p className="text-xs text-yellow-800">
                      ℹ️ Les notifications sont désactivées. Active-les pour recevoir des rappels.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Message pour la version desktop */
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Notifications disponibles sur mobile
                    </p>
                    <p className="text-xs text-blue-700">
                      Les notifications et rappels sont uniquement disponibles sur l'application mobile. Installez MyMusicCoach sur votre smartphone pour recevoir des rappels de pratique quotidiens !
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Mes objectifs</h2>
              <button
                onClick={() => setShowGoalForm(true)}
                className="text-purple-600 text-sm font-medium"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {goals.map(goal => (
                <div key={goal.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-medium text-gray-900">{goal.title}</span>
                    <button
                      
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const goalId = goal.id;
                        setGoals(goals.filter(g => g.id !== goalId));
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progression</span>
                      <span className="font-bold text-purple-600">
                        {goal.current}/{goal.target} {goal.unit}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                        style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section Sauvegarde et Restauration */}
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Sauvegarde des données</h2>
            <p className="text-sm text-gray-600 mb-4">
              Exportez vos données pour créer une sauvegarde ou importez une sauvegarde précédente.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExportData}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Exporter mes données
              </button>
              <label className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                Importer une sauvegarde
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-800">
                💡 Vos données sont automatiquement sauvegardées localement sur votre appareil. L'export permet de créer une copie de secours que vous pouvez conserver ailleurs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Créer Exercice */}
      {showCreateExercise && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto h-screen">
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setShowCreateExercise(false);
                  setUploadedFile(null);
                }}
                className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="font-medium">Retour</span>
              </button>
              <h2 className="text-lg font-bold">Nouvel exercice</h2>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 mb-2">
                <p className="text-sm text-yellow-800 font-medium">⚠️ Tous les champs marqués d'un * sont obligatoires</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'exercice *</label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Exercice technique..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée *</label>
                  <input
                    type="text"
                    name="duration"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="5 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Séries *</label>
                  <input
                    type="text"
                    name="sets"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="3 séries"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Complément (optionnel)</label>
                <div className="flex gap-2">
                  {[
                    { value: 'none', label: 'Aucun' },
                    { value: 'video', label: 'Vidéo' },
                    { value: 'file', label: 'Fichier' }
                  ].map(type => (
                    <button
                      key={type.value}
                      
                      onClick={() => {
                        setNewExerciseType(type.value);
                        setUploadedFile(null); // Réinitialiser le fichier lors du changement de type
                      }}
                      className={`flex-1 py-2 rounded-xl font-medium transition-colors text-sm ${
                        newExerciseType === type.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {newExerciseType === 'video' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL YouTube</label>
                  <input
                    type="url"
                    name="videoUrl"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="https://youtube.com/..."
                  />
                </div>
              )}

              {newExerciseType === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Importer un fichier</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.musicxml,.xml,.gp5,.gpx,.gp"
                    onChange={handleFileUpload}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Formats acceptés : PDF, Images (PNG/JPEG), Partitions (MusicXML), Guitar Pro (GP5/GPX/GP)
                  </p>
                  {uploadedFile && (
                    <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Fichier ajouté : {uploadedFile.name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulté *</label>
                <select
                  name="difficulty"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  <option value="Débutant">Débutant</option>
                  <option value="Intermédiaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                <select
                  name="category"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                >
                  {instruments[settings.instrument].categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tempo de base (BPM) * 
                  <span className="text-xs text-gray-500 ml-1">(mettre 0 si non applicable)</span>
                </label>
                <input
                  type="number"
                  name="baseTempo"
                  required
                  defaultValue={settings.defaultTempo}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="60"
                />
              </div>

              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  name="description"
                  required
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Description de l'exercice..."
                />
              </div>
            </div>

            <div className="flex-shrink-0 border-t-2 border-gray-200 p-4 bg-white shadow-2xl">
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
                    alert('Veuillez remplir tous les champs obligatoires');
                    return;
                  }

                  createExercise(data);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
              >
                ✓ Créer l'exercice
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Créer/Éditer Workout */}
      {showCreateWorkout && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto h-screen">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la session</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingWorkout?.name}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Ma routine quotidienne..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Durée estimée</label>
                  <input
                    type="text"
                    name="duration"
                    required
                    defaultValue={editingWorkout?.duration}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="30 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
                  <input
                    type="text"
                    name="category"
                    required
                    defaultValue={editingWorkout?.category}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="Technique"
                  />
                </div>
              </div>

              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Exercices</label>
                <div className="space-y-2">
                  {exercises.map(ex => (
                    <label
                      key={ex.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:bg-gray-50 border border-gray-200"
                    >
                      <input
                        type="checkbox"
                        name="exercises"
                        value={ex.id}
                        defaultChecked={editingWorkout?.exercises.includes(ex.id)}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{ex.name}</p>
                        <p className="text-xs text-gray-500">{ex.duration}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 border-t-2 border-gray-200 p-4 bg-white shadow-2xl space-y-3">
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
                    exercises: selectedExercises
                  };

                  if (!data.name || !data.duration || !data.category) {
                    alert('Veuillez remplir tous les champs obligatoires');
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
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-medium border-2 border-red-200"
                >
                  🗑️ Supprimer cette session
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal Ajouter Objectif */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col max-w-md mx-auto h-screen">
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setShowGoalForm(false)}
                className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="font-medium">Retour</span>
              </button>
              <h2 className="text-lg font-bold">Nouvel objectif</h2>
              <div className="w-20"></div>
            </div>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addGoal(
                formData.get('title'),
                formData.get('target'),
                formData.get('unit')
              );
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder="Mon objectif..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cible</label>
                  <input
                    type="number"
                    name="target"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unité</label>
                  <input
                    type="text"
                    name="unit"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white"
                    placeholder="BPM, sessions..."
                  />
                </div>
              </div>
              <div className="h-4"></div>
            </div>
            
            <div className="flex-shrink-0 border-t-2 border-gray-200 p-4 bg-white shadow-2xl">
              <button
                
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const form = e.target.closest('form');
                  if (!form) {
                    return;
                  }
                  
                  const formData = new FormData(form);
                  const title = formData.get('title');
                  const target = formData.get('target');
                  const unit = formData.get('unit');

                  if (!title || !target || !unit) {
                    alert('Veuillez remplir tous les champs');
                    return;
                  }

                  const maxId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) : 0;
                  const newGoal = {
                    id: maxId + 1,
                    title,
                    target: parseInt(target),
                    current: 0,
                    unit
                  };
                  setGoals([...goals, newGoal]);
                  setShowGoalForm(false);
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
              >
                ✓ Créer l'objectif
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Détails Exercice */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="h-full flex flex-col bg-white max-w-md mx-auto">
            <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => {
                    stopTimer();
                    setSelectedExercise(null);
                    setCurrentTempo({});
                  }}
                  className="text-white text-sm font-medium"
                >
                  ← Retour
                </button>
                <h3 className="font-bold text-lg flex-1 text-center pr-16">{selectedExercise.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  selectedExercise.difficulty === 'Débutant' ? 'bg-green-400 text-green-900' :
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
                      <div className="bg-white bg-opacity-20 rounded-full p-4">
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
                          <Music className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        ) : (
                          <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                        )}
                        <p className="text-gray-700 font-medium mb-4">{selectedExercise.fileData.name}</p>
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

                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <h4 className="font-bold text-gray-900 mb-3">Description</h4>
                  <p className="text-gray-600">{selectedExercise.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Bloc Durée avec Chronomètre */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 shadow-md">
                    <Clock className="w-6 h-6 text-purple-600 mb-3" />
                    <p className="text-sm text-gray-600 mb-1">Durée</p>
                    
                    {timerActive || timerSeconds > 0 ? (
                      <>
                        <p className="font-bold text-purple-600 text-3xl mb-2">
                          {formatTime(timerSeconds)}
                        </p>
                        <div className="flex gap-2">
                          {timerActive ? (
                            <button
                              onClick={() => stopTimer()}
                              className="flex-1 bg-red-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                            >
                              ⏸ Stop
                            </button>
                          ) : (
                            <button
                              onClick={() => startTimer(selectedExercise)}
                              className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                            >
                              ▶️ Reprendre
                            </button>
                          )}
                          <button
                            onClick={() => resetTimer(selectedExercise)}
                            className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors"
                          >
                            🔄 Reset
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-gray-900 text-lg mb-1">{selectedExercise.duration}</p>
                        <p className="text-xs text-gray-500 mb-3">{selectedExercise.sets}</p>
                        <button
                          onClick={() => startTimer(selectedExercise)}
                          className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                        >
                          ⏱️ Lancer le chrono
                        </button>
                      </>
                    )}
                  </div>
                  {selectedExercise.baseTempo > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 shadow-md">
                      <Activity className="w-6 h-6 text-blue-600 mb-3" />
                      <p className="text-sm text-gray-600 mb-1">Tempo</p>
                      <p className="font-bold text-gray-900 text-lg">{selectedExercise.baseTempo} BPM</p>
                      <p className="text-xs text-gray-500 mt-1">Tempo de base</p>
                    </div>
                  )}
                </div>

                {selectedExercise.baseTempo > 0 && (
                  <>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 shadow-lg">
                      <h4 className="font-bold text-gray-900 mb-4">Enregistrer ton tempo</h4>
                      <div className="flex gap-3 mb-3">
                        <input
                          type="number"
                          value={currentTempo[selectedExercise.id] || ''}
                          onChange={(e) => setCurrentTempo({...currentTempo, [selectedExercise.id]: e.target.value})}
                          placeholder={`${selectedExercise.baseTempo}`}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <span className="text-gray-600 font-medium flex items-center px-3">BPM</span>
                      </div>
                      <button 
                        onClick={() => saveTempo(selectedExercise.id)}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-shadow"
                      >
                        Enregistrer
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg">
                      <h4 className="font-bold text-gray-900 mb-4">Historique de progression</h4>
                      {selectedExercise.tempoHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedExercise.tempoHistory.map((entry, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 rounded-xl p-4">
                              <span className="text-sm text-gray-600 font-medium">{entry.date}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{entry.tempo} BPM</span>
                                {idx > 0 && entry.tempo > selectedExercise.tempoHistory[idx - 1].tempo && (
                                  <TrendingUp className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-8">Aucun tempo enregistré pour le moment</p>
                      )}
                    </div>
                  </>
                )}

                {/* Bouton Supprimer en bas du contenu */}
                <div className="pt-6 pb-4">
                  <button
                    onClick={() => {
                      deleteExercise(selectedExercise.id);
                    }}
                    className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-medium border-2 border-red-200 hover:bg-red-100 transition-colors"
                  >
                    🗑️ Supprimer cet exercice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Session */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
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
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Comment ça marche ?
                    </p>
                    <p className="text-xs text-blue-700">
                      Sélectionne un fichier .json exporté depuis MyMusicCoach. La session et tous ses exercices seront automatiquement ajoutés à ton application.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fichier de session (.json)
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <p className="text-xs text-yellow-800">
                  💡 <strong>Astuce :</strong> Demande à ton prof d'exporter une session et de t'envoyer le fichier .json par email ou messagerie.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 p-4">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de choix d'export (Android) */}
      {exportModalData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-5">
              <h2 className="text-white font-bold text-lg">Exporter le fichier</h2>
              <p className="text-purple-200 text-sm mt-1">{exportModalData.fileName}</p>
            </div>

            <div className="p-5 space-y-3">
              <button
                onClick={() => saveToDownloads(exportModalData.content, exportModalData.fileName)}
                className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Download className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Télécharger</p>
                  <p className="text-sm text-gray-500">Sauvegarder dans Téléchargements</p>
                </div>
              </button>

              <button
                onClick={() => shareFile(exportModalData.content, exportModalData.fileName)}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Partager</p>
                  <p className="text-sm text-gray-500">Envoyer par email, Drive, etc.</p>
                </div>
              </button>

              <button
                onClick={() => setExportModalData(null)}
                className="w-full p-3 text-gray-500 hover:text-gray-700 font-medium"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation */}
      {!selectedExercise && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 max-w-md mx-auto z-40">
        <div className="flex justify-around">
          <button 
            onClick={() => { setActiveTab('home'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'home' ? 'text-purple-600' : 'text-gray-400'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Accueil</span>
          </button>
          <button 
            onClick={() => { setActiveTab('library'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'library' ? 'text-purple-600' : 'text-gray-400'
            }`}
          >
            <Book className="w-6 h-6" />
            <span className="text-xs font-medium">Exercices</span>
          </button>
          <button 
            onClick={() => { setActiveTab('stats'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'stats' ? 'text-purple-600' : 'text-gray-400'
            }`}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Stats</span>
          </button>
          <button 
            onClick={() => { setActiveTab('settings'); setActiveWorkout(null); setSelectedExercise(null); }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'settings' ? 'text-purple-600' : 'text-gray-400'
            }`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-xs font-medium">Réglages</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default MyMusicCoach;
