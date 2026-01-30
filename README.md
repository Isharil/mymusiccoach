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
- **Français** et **Anglais** disponibles
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
# Synchroniser avec Capacitor
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

## Structure du projet

```
src/
├── components/
│   └── Metronome.jsx       # Composant métronome
├── hooks/
│   ├── useIndexedDB.js     # Hook de persistance IndexedDB
│   └── useTranslation.js   # Hook d'internationalisation
├── locales/
│   ├── fr.json             # Traductions françaises
│   ├── en.json             # Traductions anglaises
│   └── index.js            # Export des traductions
└── MyMusicCoach.jsx        # Composant principal
```

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
