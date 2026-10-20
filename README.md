# MyMusicCoach

Application mobile et web pour accompagner les musiciens dans leur pratique quotidienne.

## Fonctionnalités

### Sessions d'entraînement
- **Planning sur 4 semaines** : Organisez vos sessions sur un cycle de 4 semaines
- **Session du jour** : Vue rapide de la session programmée
- **Pratique libre** : Démarrez n'importe quelle session depuis la bibliothèque, ou notez une pratique hors planning (morceau, impro, jam...)
- **Temps de pratique** : Durée mesurée et modifiable à la fin de chaque session
- **Suivi de progression** : Marquez les exercices comme complétés ou sautés
- **Chronomètre intégré** : Timer par exercice avec Wake Lock (continue même si l'écran s'éteint)
- **Pause/Reprise** : Mettez le chronomètre en pause à tout moment

### Bibliothèque d'exercices
- **Création d'exercices personnalisés** : Nom, durée, séries, difficulté, catégorie
- **Catégories** : Technique, Gammes, Rythme, Théorie, Morceaux, Improvisation
- **Niveaux de difficulté** : Débutant, Intermédiaire, Avancé
- **Pièces jointes** : vidéo YouTube intégrée, ou fichier (PDF, image, Guitar Pro, MusicXML, audio)
- **Suivi du tempo** : Enregistrez votre progression de tempo par exercice
- **Tempo cible** : Progression vers un tempo objectif, avec un tempo suggéré (+5 BPM quand les deux dernières séances sont au point)
- **Corbeille** : Récupérez les exercices supprimés

### Répertoire de morceaux
- **Bibliothèque > Répertoire** : morceaux à apprendre, en cours ou maîtrisés
- **Fiche par morceau** : artiste, partition ou tablature jointe (PDF, image, Guitar Pro, MusicXML), enregistrement audio, lien, tempo cible, notes
- **Jouer avec le morceau** : enregistrement audio (MP3, M4A, WAV, OGG…) ou vidéo YouTube, avec ralenti (50 à 100 %, sans changer la hauteur pour l'audio) et boucle A-B sur un passage
- **« Je l'ai travaillé »** : la séance compte pour la série et le temps de pratique ; temps total par morceau
- **Dans les sessions** : les morceaux s'ajoutent à une session comme les exercices, et se marquent « Travaillé » ou « Passé » pendant la séance
- **Rappels sur demande** : tous les 2 jours pour un morceau en cours, révisions espacées (3 jours, 1 semaine, 2 semaines, 1 mois...) pour un morceau maîtrisé

### Lecteur de tablatures
- **Fichiers Guitar Pro** (.gp3, .gp4, .gp5, .gpx, .gp) et **MusicXML**
- **Tablature** par défaut, **partition** en option ; choix de la piste
- **Lecture avec son** et défilement automatique, curseur sur la note jouée
- **Vitesse** de 50 % à 125 %, **boucle** sur une sélection, métronome et décompte
- Ouverture depuis **Outils**, un exercice ou un morceau du répertoire avec un fichier joint

### Métronome
- **Tempo ajustable** : 20 à 300 BPM
- **Signatures rythmiques** : 1/4, 2/4, 3/4, 4/4, 5/4, 5/8, 6/8, 7/8
- **Subdivisions** : Noires, Croches, Triolets, Doubles croches
- **Groupings asymétriques** : Pour 5/8 et 7/8 (ex: 3+2, 2+3)
- **Indicateur visuel** : Affichage des temps avec accent sur le premier temps

### Accordeur
- **Chromatique** : reconnaît toutes les notes, pour tout instrument (cordes, vents, voix, piano...), d'environ 27 Hz à 4 200 Hz
- **Justesse** : aiguille en cents, note juste à ±5 cents, fréquence affichée
- **La de référence** réglable de 415 à 466 Hz, et son de référence
- **Instruments transpositeurs** : en Ut, Si♭, Mi♭ ou Fa (note écrite et son réel)
- **Nom des notes** selon la langue (Do Ré Mi, C D E, H en allemand) ou en lettres, altérations en dièses ou en bémols (harpe, cuivres...)
- Le son est analysé sur l'appareil, sans enregistrement

### Statistiques et récompenses
- **Streak (série)** : Compteur de jours consécutifs de pratique
- **Sessions hebdomadaires** : Nombre de sessions cette semaine
- **Temps de pratique** : Minutes de la semaine, objectif hebdomadaire et répartition par catégorie
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
- **Rappels de pratique** : À l'heure de votre choix, les jours où une session est prévue (avec son nom), et pas si vous avez déjà pratiqué
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
- **Web Audio API** pour le métronome et l'accordeur (détection de hauteur YIN)
- **alphaTab** pour le lecteur de tablatures

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

Le [guide du code source](src/README.md) détaille l'architecture, les données stockées,
les formats de fichiers et les conventions.

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

Le lecteur de tablatures utilise [alphaTab](https://www.alphatab.net) (MPL-2.0), la police
Bravura (SIL OFL 1.1) et la banque de sons Sonivox (Apache 2.0).
