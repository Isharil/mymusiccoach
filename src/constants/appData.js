// Données de référence de l'application

// tab: onglet vers lequel naviguer quand on arrive sur l'étape
export const ONBOARDING_STEPS = [
  { id: 'welcome',  tab: null },
  { id: 'library',  tab: 'library' },
  { id: 'home',     tab: 'home' },
  { id: 'settings', tab: 'settings' },
];

// Catégories d'exercices (valeurs stockées en français, traduites à l'affichage)
export const EXERCISE_CATEGORIES = ["Technique", "Gammes", "Rythme", "Théorie", "Morceaux", "Improvisation", "Oreille"];

// Valeur stockée -> clé de traduction
export const CATEGORY_KEYS = {
  'Tous': 'all',
  'Technique': 'technique',
  'Gammes': 'scales',
  'Rythme': 'rhythm',
  'Théorie': 'theory',
  'Morceaux': 'pieces',
  'Improvisation': 'improvisation',
  'Oreille': 'earTraining'
};

export const DIFFICULTY_KEYS = {
  'Débutant': 'beginner',
  'Intermédiaire': 'intermediate',
  'Avancé': 'advanced'
};

// Contenu d'exemple : id -> préfixe des clés de traduction (examples.*)
export const EXAMPLE_EXERCISE_KEYS = { 1: 'exercise1', 2: 'exercise2' };
export const EXAMPLE_WORKOUT_KEYS = { 1: 'workout1', 2: 'workout2' };

// Jours du planning, du lundi au dimanche (clés stockées)
export const SCHEDULE_DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export const DEFAULT_SETTINGS = {
  notifications: true,
  practiceReminder: "18:00",
  reminderEnabled: true,
  theme: "auto",
  userName: "Musician",
  language: "en",
  metronomeSound: "click",
  longTermGoal: "",
  cycleStartDate: "",
  onboardingDone: false
};

export const DEFAULT_EXERCISES = [
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
    tempoHistory: [],
    isExample: true
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
    tempoHistory: [],
    isExample: true
  }
];

export const DEFAULT_WORKOUTS = [
  {
    id: 1,
    name: "Routine Débutant",
    duration: "30 min",
    exercises: [1, 2],
    category: "Technique",
    isExample: true
  },
  {
    id: 2,
    name: "Improvisation Blues",
    duration: "45 min",
    exercises: [1],
    category: "Improvisation",
    isExample: true
  }
];

export const DEFAULT_SCHEDULE = {
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
};

// Badges (les noms/descriptions sont traduits via les clés)
export const BADGES = [
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
