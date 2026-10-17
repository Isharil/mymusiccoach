# Guide du code source

Ce document s'adresse à qui travaille sur le code de MyMusicCoach : organisation, données
stockées, conventions et tests. Les fonctionnalités, l'installation, le build Android et la
procédure de release sont décrits dans le [README principal](../README.md).

## Architecture

```
main.jsx → App.jsx → MyMusicCoach.jsx
                       ├── état et actions (données IndexedDB, navigation, fenêtres ouvertes)
                       ├── hooks métier (stats, chrono, notifications, export, thème)
                       └── <AppContext.Provider> → pages, fenêtres, barre de navigation
```

- **`MyMusicCoach.jsx`** détient tout l'état de l'application et les actions qui le modifient
  (créer un exercice, enregistrer une session...). Il les fournit aux composants via le contexte
  et décide quels écrans afficher.
- **`context/AppContext.js`** : les composants lisent ce dont ils ont besoin avec
  `const { exercises, t, saveSession } = useApp();`. Une nouvelle valeur partagée doit être
  ajoutée à l'objet `appContext` en bas de `MyMusicCoach.jsx`.
- **`components/pages/`** (un onglet ou la session en cours) et **`components/modals/`**
  (une fenêtre par fichier) n'ont pas d'état propre important : ils affichent le contexte et
  appellent ses actions.
- **`hooks/`** regroupe la logique avec effets (stockage, chrono, notifications...) ;
  **`utils/`** les fonctions pures, testables sans navigateur ; **`constants/appData.js`** les
  données de référence (valeurs par défaut, catégories, badges).

### Ajouter une page ou une fenêtre

1. Créer le composant dans `components/pages/` ou `components/modals/` et lire ses données
   avec `useApp()`.
2. Si besoin, ajouter l'état d'ouverture (`const [showX, setShowX] = useState(false)`) dans
   `MyMusicCoach.jsx` et l'exposer dans `appContext`.
3. L'afficher dans le rendu de `MyMusicCoach.jsx` : `{showX && <XModal />}`.
4. Ajouter un scénario dans `test/app.test.jsx` s'il s'agit d'un parcours important.

## Données stockées

Tout est stocké sur l'appareil, dans IndexedDB (via `idb-keyval`). Le hook
`useIndexedDB(clé, valeurInitiale)` s'utilise comme `useState` et enregistre chaque
modification.

| Clé IndexedDB | Contenu |
|---|---|
| `mmc_exercises` | Bibliothèque d'exercices |
| `mmc_deletedExercises` | Corbeille des exercices |
| `mmc_workouts` | Sessions (routines) |
| `mmc_archivedWorkouts` | Sessions archivées |
| `mmc_weeklySchedule` | Planning sur 4 semaines |
| `mmc_sessionHistory` | Historique des sessions terminées |
| `mmc_settings` | Réglages (voir `DEFAULT_SETTINGS`) |
| `mmc_activeWorkout` | Session en cours (ou `null`) |
| `mmc_workoutProgress` | Statut des exercices de la session en cours |
| `mmc_currentTempo` | Tempos saisis mais pas encore enregistrés |
| `mmc_exerciseNotes` | Notes prises pendant la session en cours |
| `mmc_file_<id>` | Une pièce jointe : `{ name, data, createdAt }`, `data` étant une URL `data:` |
| `mmc_goals` | Ancienne donnée, plus utilisée (conservée dans les sauvegardes) |
| `mmc_migration_done` | Migration depuis localStorage déjà faite |

En plus, `localStorage.mmc_theme` mémorise le thème résolu (`light` ou `dark`). Un script de
`index.html` le lit pour appliquer le mode sombre avant le chargement de React, sans flash blanc.

### Modèles

```js
// Exercice
{
  id: number,
  name: string,
  description: string,
  duration: '5 min',             // normalisé par utils/exercises.js (1 à 60 min)
  sets: '3 séries',              // stocké en français, réaffiché traduit (formatSets)
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé',
  category: 'Technique' | 'Gammes' | 'Rythme' | 'Théorie' | 'Morceaux' | 'Improvisation' | 'Oreille',
  baseTempo: number,             // 0 = pas de tempo
  targetTempo?: number,          // tempo cible, 0 ou absent = aucun (utils/tempo.js)
  type: 'none' | 'video' | 'file',
  videoUrl?: string,
  attachment?: { id, name },     // fichier joint, contenu dans mmc_file_<id>
  tempoHistory: [{ date: 'YYYY-MM-DD', tempo: number }],
  isExample?: true               // contenu d'exemple, affiché traduit tant qu'il n'est pas modifié
}

// Session (routine)
{
  id: number,
  name: string,
  duration: string,              // texte libre ("30 min")
  category: string,              // texte libre, traduit s'il correspond à une catégorie connue
  exercises: number[],           // ids des exercices, dans l'ordre
  shortTermGoal?: string,        // objectif à 7 jours
  mediumTermGoal?: string,       // objectif à 28 jours
  isExample?: true
}

// Entrée d'historique (session terminée)
{
  id: number,
  date: 'YYYY-MM-DD', time: 'HH:MM',  // heure locale
  workoutId: number,
  workoutName: string,           // nom au moment de la séance
  completed: number, skipped: number, total: number,
  exerciseProgress: { [exerciseId]: 'completed' | 'skipped' },  // absent des sessions avant la 1.11
  durationMinutes?: number,      // temps de pratique, absent des sessions avant la 1.12
  notes: { [exerciseId]: string }
}

// Entrée d'historique d'une pratique libre (hors session) : rangée à sa date
{
  id, date, time,
  free: true,
  workoutId: null,
  workoutName: string,           // intitulé saisi, sinon « Pratique libre »
  completed: 0, skipped: 0, total: 0,
  durationMinutes: number,
  category?: string,             // catégorie d'exercice, absente = « autre »
  note?: string,
  notes: {}
}

// Planning : semaine du cycle -> jour -> ids de sessions
{ semaine1: { lundi: [1], mardi: [], ..., dimanche: [] }, semaine2: {...}, semaine3: {...}, semaine4: {...} }

// Session en cours : mmc_activeWorkout est une copie de la session, avec startedAt (horodatage
// du début, pour mesurer le temps de pratique) ; mmc_workoutProgress donne le statut des exercices
{ '<workoutId>-<exerciseId>': 'completed' | 'skipped' }
```

Réglages notables : `tuner` (`{ a4, transposition, notation }`, voir `DEFAULT_TUNER_SETTINGS`), `weeklyGoalMinutes` (objectif de pratique hebdomadaire, 0 = aucun),
`practiceReminder` (heure des rappels), `cycleStartDate` (lundi de la semaine 1 du planning).

### Accordeur

`hooks/useTuner.js` écoute le micro (sans annulation d'écho ni réduction de bruit, qui faussent la
hauteur) et analyse le son environ 16 fois par seconde avec `utils/pitch.js` : algorithme YIN,
conversion en note selon le La de référence, transposition (Si♭, Mi♭, Fa). Le micro est libéré à la
fermeture de l'accordeur et quand l'app passe en arrière-plan. Le nom des notes vient de
`tuner.noteNames` dans chaque langue ; `tuner.octaveOffset` vaut -1 en français et en italien
(La3 = 440 Hz). Android : permissions `RECORD_AUDIO` et `MODIFY_AUDIO_SETTINGS` dans le manifeste.

### Rappels

Les rappels sont des notifications ponctuelles programmées pour les 28 prochains jours
(`utils/reminders.js`), uniquement les jours où une session est prévue, et recalculées à chaque
ouverture de l'app et à chaque changement. Identifiants : `1000` + numéro du jour ; `1` est
l'ancien rappel quotidien répété, annulé au passage. Les autres notifications utilisent `100`
(fin de session), `101` (début) et `9999` (test).

### Migrations au démarrage

`MyMusicCoach.jsx` met à jour les anciennes données au lancement :

- copie des données de localStorage vers IndexedDB (très anciennes versions) ;
- planning : un id seul ou `null` par jour devient un tableau ;
- `settings.cycleStartDate` vide : lundi de la semaine en cours ;
- pièces jointes stockées dans l'exercice (ancien champ `fileData`) déplacées vers
  `mmc_file_<id>`, puis suppression des fichiers que plus aucun exercice ne référence.

## Conventions

- **Textes** : jamais écrits en dur dans les composants. Utiliser `t('section.cle')` et ajouter
  la clé dans les 5 fichiers de `locales/` ; le test `locales/locales.test.js` échoue s'il en
  manque une ou si les paramètres `{...}` diffèrent. Pluriel : valeur
  `"{count} exercice | {count} exercices"` et `t(cle, { count })`. Une clé absente d'une langue
  est affichée en anglais.
- **Valeurs stockées en français, traduites à l'affichage** : catégories, difficultés et séries
  (`translateCategory`, `translateDifficulty`, `formatSets` dans `hooks/useDisplayHelpers.js`).
  Ne pas changer ces valeurs stockées sans migration.
- **Dates** : toujours en heure locale, au format `YYYY-MM-DD`, avec `utils/practiceStats.js`
  (`toLocalDateStr`, `parseLocalDate`...). `new Date('YYYY-MM-DD')` est lu en UTC et décale
  les dates selon le fuseau.
- **Identifiants** : `getNextExerciseId()` et `getNextWorkoutId()` tiennent compte de la
  corbeille et de l'archive, dont les éléments peuvent être restaurés.
- **Texte saisi inséré dans du HTML généré** (rapport) : toujours passer par `escapeHtml`.

## Formats de fichiers

- **Sauvegarde complète** (Réglages) : voir `utils/backup.js`. En-tête `appName`,
  `formatVersion` (actuellement 2) et `appVersion`, une entrée par donnée sérialisée en JSON,
  et une section `files` pour les pièces jointes. Le fichier est entièrement vérifié avant
  d'écrire quoi que ce soit. Les sauvegardes plus anciennes restent lisibles ; les versions de
  l'app antérieures à la 1.11 ne savent pas lire ce format.
- **Session partagée** (Bibliothèque > Sessions > Exporter) : `{ version: '1.0', appName,
  workout, exercises }`. Les exercices n'ont pas d'id et embarquent leur fichier joint dans
  `fileData: { name, data }`.

## Tests

```bash
npm test             # une passe
npm run test:watch   # relance à chaque modification
npm run lint
```

- `utils/*.test.js`, `hooks/*.test.js`, `locales/*.test.js` : tests unitaires (calculs de
  dates et de séries, temps de pratique, tempo cible, rappels, rapport, sauvegardes, pièces jointes,
  traductions — dont la présence de chaque clé `t('...')` utilisée dans le code).
- `test/app.test.jsx` : l'application complète est rendue dans jsdom, avec une base IndexedDB
  en mémoire (`fake-indexeddb`). Les scénarios fixent la date au lundi 12 octobre 2026 et
  l'interface est en anglais (langue par défaut). La configuration commune est dans
  `test/setup.js`.
