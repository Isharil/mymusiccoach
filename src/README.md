# MyMusicCoach

Application React de coaching musical personnel permettant de planifier, suivre et améliorer ses séances de pratique instrumentale.

## Fonctionnalités

### Gestion des exercices
- Création d'exercices personnalisés (nom, durée, difficulté, catégorie)
- Support des liens YouTube et fichiers
- Suivi de l'historique des tempos
- Corbeille avec restauration possible

### Séances d'entraînement (Workouts)
- Création de routines combinant plusieurs exercices
- Suivi de la progression pendant la pratique
- Export/import des workouts en JSON
- Archivage des séances

### Planning hebdomadaire
- Système de rotation sur 4 semaines
- Attribution des workouts par jour
- Mise en évidence de la séance du jour

### Suivi de progression
- Historique des sessions avec statistiques
- Calcul des séries consécutives (streak)
- Objectifs personnalisés avec barres de progression
- Génération de rapports PDF exportables

### Multi-instruments
9 instruments supportés :
- Guitare
- Piano
- Batterie
- Basse
- Violon
- Chant
- Saxophone
- Harpe
- Autre

Chaque instrument dispose de catégories d'exercices adaptées.

### Autres fonctionnalités
- Timer intégré pour les exercices
- Notifications de rappel (mobile uniquement)
- Export/import complet des données
- Interface en français

## Structure du projet

```
src/
├── MyMusicCoach.jsx    # Composant principal de l'application
├── App.jsx             # Point d'entrée React
├── main.jsx            # Rendu ReactDOM
├── index.css           # Styles Tailwind
└── hooks/
    ├── useIndexedDB.js     # Hook de persistance des données (IndexedDB)
    └── useTranslation.js   # Hook de traduction multi-langues
```

## Technologies

- **React 19** - Framework UI
- **Vite 7** - Build tool
- **Tailwind CSS 3** - Styles
- **Lucide React** - Icônes
- **IndexedDB** - Persistance des données (via idb-keyval)
- **Capacitor 6** - Application mobile native

## Installation

```bash
npm install
```

## Scripts

```bash
npm run dev      # Serveur de développement
npm run build    # Build de production
npm run preview  # Prévisualisation du build
npm run lint     # Vérification ESLint
```

## Stockage des données

Les données sont persistées dans le localStorage du navigateur avec les clés suivantes :

| Clé | Description |
|-----|-------------|
| `mmc_exercises` | Bibliothèque d'exercices |
| `mmc_workouts` | Routines d'entraînement |
| `mmc_sessionHistory` | Historique des sessions |
| `mmc_weeklySchedule` | Planning sur 4 semaines |
| `mmc_goals` | Objectifs personnels |
| `mmc_settings` | Paramètres utilisateur |
| `mmc_deletedExercises` | Exercices supprimés |
| `mmc_archivedWorkouts` | Workouts archivés |

## Modèles de données

### Exercice
```javascript
{
  id: number,
  name: string,
  duration: string,        // "5 min"
  difficulty: string,      // "Débutant" | "Intermédiaire" | "Avancé"
  category: string,
  type: string,            // "video" | "file"
  videoUrl?: string,
  tempoHistory: [{ date: string, tempo: number }]
}
```

### Workout
```javascript
{
  id: number,
  name: string,
  duration: string,
  exercises: number[],     // IDs des exercices
  category: string
}
```

### Session
```javascript
{
  id: number,
  date: string,            // "YYYY-MM-DD"
  time: string,            // "HH:MM"
  workoutId: number,
  workoutName: string,
  completed: number,
  skipped: number,
  total: number
}
```

## Licence

Projet personnel - Tous droits réservés
