# Système de Sauvegarde - MyMusicCoach

## Fonctionnalités implémentées

### 1. Sauvegarde automatique locale
Toutes les données importantes de l'application sont automatiquement sauvegardées dans le `localStorage` du navigateur. Cela signifie que :
- Vos données persistent même après un rafraîchissement de la page
- Les données restent disponibles tant que vous n'effacez pas le cache du navigateur
- Aucune connexion internet n'est nécessaire

### 2. Données sauvegardées

Les éléments suivants sont automatiquement sauvegardés :
- ✅ **Exercices personnalisés** (`exercises`)
- ✅ **Routines d'entraînement** (`workouts`)
- ✅ **Historique des sessions** (`sessionHistory`)
- ✅ **Objectifs** (`goals`)
- ✅ **Paramètres** (`settings`) - nom, instrument, tempo par défaut, rappels, notifications
- ✅ **Planning hebdomadaire** (`weeklySchedule`)
- ✅ **Exercices supprimés** (`deletedExercises`) - corbeille
- ✅ **Routines archivées** (`archivedWorkouts`) - archive

### 3. Export de données

Dans la section **Réglages** de l'application, vous pouvez :
- Cliquer sur **"Exporter mes données"** pour télécharger un fichier JSON contenant toutes vos données
- Le fichier sera nommé : `mymusiccoach-backup-YYYY-MM-DD.json`
- Ce fichier peut être conservé comme sauvegarde de secours

### 4. Import de données

Pour restaurer une sauvegarde :
- Dans la section **Réglages**, cliquez sur **"Importer une sauvegarde"**
- Sélectionnez le fichier JSON de sauvegarde
- L'application se rechargera automatiquement avec les données importées

## Utilisation mobile

Le système de sauvegarde est particulièrement utile pour les applications mobiles car :
- Les données persistent entre les sessions
- Pas besoin de compte utilisateur ou de connexion
- Possibilité de transférer les données entre appareils via export/import
- Sauvegarde locale rapide et fiable

## Clés de stockage utilisées

Les données sont stockées dans le `localStorage` avec les clés suivantes :
- `mmc_exercises` - Exercices
- `mmc_workouts` - Routines
- `mmc_sessionHistory` - Historique
- `mmc_goals` - Objectifs
- `mmc_settings` - Paramètres
- `mmc_weeklySchedule` - Planning
- `mmc_deletedExercises` - Corbeille
- `mmc_archivedWorkouts` - Archive

## Notes techniques

### Hook personnalisé `useLocalStorage`
Un hook React personnalisé a été créé pour gérer automatiquement :
- La lecture initiale depuis le `localStorage`
- La sauvegarde automatique à chaque modification
- La gestion des erreurs de sérialisation/désérialisation

### Fonctions utilitaires
- `exportAppData()` - Exporte toutes les données en JSON
- `importAppData(jsonString)` - Importe des données depuis JSON
- `clearAppStorage()` - Efface toutes les données (non exposée dans l'UI pour éviter les suppressions accidentelles)

## Conseils d'utilisation

1. **Sauvegarde régulière** : Exportez vos données régulièrement (par exemple, une fois par mois)
2. **Transfert d'appareil** : Utilisez l'export/import pour transférer vos données d'un appareil à un autre
3. **Test de nouvelles fonctionnalités** : Exportez vos données avant de tester de nouvelles fonctionnalités
4. **Conservation des sauvegardes** : Gardez plusieurs sauvegardes datées

## Limitations

- Les données sont stockées localement, donc spécifiques à chaque navigateur/appareil
- La taille du `localStorage` est limitée (généralement 5-10 MB, largement suffisant pour cette application)
- Les sauvegardes manuelles (export) doivent être conservées par l'utilisateur
