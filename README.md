# MyMusicCoach

Application mobile et web pour accompagner les musiciens dans leur pratique quotidienne.

## Fonctionnalités

### Sessions d'entraînement
- **Planning sur 4 semaines** : Organisez vos sessions sur un cycle de 4 semaines
- **Session du jour** : Vue rapide de la session programmée
- **Suivi de progression** : Marquez les exercices comme complétés ou sautés
- **Chronomètre intégré** : Timer par exercice avec Wake Lock (continue même si l'écran s'éteint)
- **Pause/Reprise** : Mettez le chronomètre en pause à tout moment

### Bibliothèque d'exercices
- **Création d'exercices personnalisés** : Nom, durée, séries, difficulté, catégorie
- **Catégories** : Technique, Gammes, Rythme, Théorie, Morceaux, Improvisation
- **Niveaux de difficulté** : Débutant, Intermédiaire, Avancé
- **Pièces jointes** : Lien YouTube ou fichier (PDF, image, audio)
- **Suivi du tempo** : Enregistrez votre progression de tempo par exercice
- **Corbeille** : Récupérez les exercices supprimés

### Métronome
- **Tempo ajustable** : 20 à 300 BPM
- **Signatures rythmiques** : 1/4, 2/4, 3/4, 4/4, 5/4, 5/8, 6/8, 7/8
- **Subdivisions** : Noires, Croches, Triolets, Doubles croches
- **Groupings asymétriques** : Pour 5/8 et 7/8 (ex: 3+2, 2+3)
- **Indicateur visuel** : Affichage des temps avec accent sur le premier temps

### Statistiques et récompenses
- **Streak (série)** : Compteur de jours consécutifs de pratique
- **Sessions hebdomadaires** : Nombre de sessions cette semaine
- **Sessions totales** : Historique complet
- **Système de badges** :
  - Badges de streak : Première flamme (3j), Semaine parfaite (7j), jusqu'à Légende (100j)
  - Badges de sessions : Premiers pas (5), On lâche rien (10), jusqu'à Centurion (100)
- **Progression des tempos** : Graphiques d'évolution par exercice
- **Export de rapport** : Générez un PDF pour votre professeur

### Import/Export
- **Sauvegarde des données** : Exportez toutes vos données en JSON
- **Import de sauvegarde** : Restaurez vos données sur un nouvel appareil
- **Export de sessions** : Partagez une session avec ses exercices
- **Import de sessions** : Importez des sessions partagées

### Notifications (Android uniquement)
- **Rappel quotidien** : Configurable à l'heure de votre choix
- **Notifications de session** : Début et fin de session

### Multilingue
- **Français**, **anglais**, **allemand**, **italien** et **espagnol** disponibles
- Changement de langue instantané dans les réglages
- Facile à étendre avec d'autres langues

### Réglages
- **Personnalisation** : Nom d'utilisateur
- **Rappels** : Activation/désactivation et heure du rappel quotidien
- **Langue** : Sélection de la langue de l'interface
- **Sauvegarde** : Export/Import des données
- **Réinitialisation** : Remise à zéro de l'application

## Technologies

- **React** 19 avec Vite
- **Capacitor** pour le build mobile (Android/iOS)
- **Tailwind CSS** pour le style
- **IndexedDB** (via idb-keyval) pour la persistance des données
- **Wake Lock API** pour le chronomètre
- **Web Audio API** pour le métronome

## Installation

```bash
# Cloner le repository
git clone https://github.com/votre-repo/mymusiccoach.git
cd mymusiccoach

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Build pour la production
npm run build
```

## Build Android

```bash
# Build web + synchronisation Capacitor
npm run android

# Ouvrir dans Android Studio
npx cap open android
```

### Faire une release

La version de `package.json` est la seule source de vérité : elle est affichée dans
« À propos » et reprise par `android/app/build.gradle` (`versionName`, et
`versionCode = major * 10000 + minor * 100 + patch`).

```bash
npm version patch   # ou minor / major : met à jour package.json, commite et crée le tag
npm run android
```

## Structure du projet

```
src/
├── MyMusicCoach.jsx        # Composant principal : état, actions, contexte, assemblage des écrans
├── context/
│   └── AppContext.js       # Contexte partagé avec les pages et fenêtres (useApp)
├── components/
│   ├── pages/              # Accueil, Bibliothèque, Stats, Réglages, Session en cours
│   ├── modals/             # Fenêtres : exercice, session, planning, rapport, import...
│   ├── BottomNav.jsx, Onboarding.jsx, Toasts.jsx
│   └── Metronome.jsx       # Composant métronome
├── hooks/
│   ├── useIndexedDB.js     # Persistance IndexedDB
│   ├── useTranslation.js   # Internationalisation (pluriels, repli sur l'anglais)
│   ├── useDisplayHelpers.js # Affichage selon la langue (catégories, exemples, dates)
│   ├── usePracticeStats.js # Séries, statistiques et badges
│   ├── useTimer.js         # Chronomètre d'exercice (Wake Lock)
│   ├── useNotifications.js # Notifications locales Android
│   ├── useFileExport.js    # Export de fichiers selon la plateforme
│   └── useTheme.js         # Thème clair/sombre
├── constants/appData.js    # Données par défaut, catégories, badges
├── utils/                  # Fonctions pures : dates/séries, rapport HTML, exercices
├── locales/                # Traductions (fr, en, de, it, es)
└── test/                   # Configuration et tests de parcours de l'application
```

## Tests

```bash
npm test            # une passe
npm run test:watch  # relance à chaque modification
```

Les tests unitaires (`*.test.js`) couvrent les calculs et les traductions ; `src/test/app.test.jsx`
rend l'application complète dans un navigateur simulé (jsdom + IndexedDB en mémoire).

## Ajouter une nouvelle langue

1. Créer le fichier de traduction `src/locales/XX.json` (copier `fr.json` et traduire)
2. Dans `src/locales/index.js`, ajouter :
   ```javascript
   import xx from './XX.json';
   export const translations = { fr, en, xx };
   export const availableLanguages = [
     ...
     { code: 'xx', name: 'Langue', flag: '🏳️' }
   ];
   ```

## Licence

MIT
