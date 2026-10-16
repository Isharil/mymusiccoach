import { Clock, Plus, Book, Video, FileText, Activity, Trash2, Music, Archive, Upload, Play } from 'lucide-react';
import { EXERCISE_CATEGORIES } from '../../constants/appData';
import { useApp } from '../../context/AppContext';

const LibraryPage = () => {
  const {
    archivedWorkouts, deleteWorkout, deletedExercises, exerciseName, exercises, exportWorkout,
    formatSets, libraryFilter, librarySubTab, permanentlyDeleteExercise, permanentlyDeleteWorkout,
    restoreExercise, restoreWorkout, setActiveTab, setEditingWorkout, setLibraryFilter, setLibrarySubTab,
    setSelectedExercise, setShowArchive, setShowCreateExercise, setShowCreateWorkout,
    setShowImportModal, setShowTrash, showArchive, showTrash, startWorkout, t, translateCategory,
    translateDifficulty, workoutName, workouts
  } = useApp();

  const categories = ['Tous', ...EXERCISE_CATEGORIES];
  const filteredExercises = libraryFilter === 'Tous' 
    ? exercises 
    : exercises.filter(ex => ex.category === libraryFilter);

  return (
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
                aria-label={t('library.trash')}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-full shadow hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-600 transition-colors relative"
              >
                <Archive aria-hidden="true" className="w-5 h-5" />
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
                aria-label={t('library.createExercise')}
                className="bg-purple-600 dark:bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                <Plus aria-hidden="true" className="w-5 h-5" />
              </button>
            )}
            {librarySubTab === 'sessions' && !showArchive && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  aria-label={t('import.title')}
                  className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 p-3 rounded-full shadow hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <Upload aria-hidden="true" className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setEditingWorkout(null); setShowCreateWorkout(true); }}
                  aria-label={t('library.createSession')}
                  className="bg-purple-600 dark:bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                >
                  <Plus aria-hidden="true" className="w-5 h-5" />
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
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100">{exerciseName(exercise)}</h3>
                            {exercise.isExample && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                                {t('common.example')}
                              </span>
                            )}
                          </div>
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
                        <span>{formatSets(exercise.sets)}</span>
                        {exercise.baseTempo > 0 && (
                          <span className="flex items-center gap-1">
                            <Activity className="w-4 h-4" />
                            {exercise.targetTempo > 0 ? `${exercise.baseTempo} → ${exercise.targetTempo}` : exercise.baseTempo} BPM
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
                        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-1">{exerciseName(exercise)}</h3>
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
              <Archive aria-hidden="true" className="w-4 h-4" />
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
                  <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">{t('library.noSessions')}</p>
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100">{workoutName(workout)}</h3>
                          {workout.isExample && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                              {t('common.example')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs bg-purple-200 dark:bg-purple-800/40 text-purple-800 dark:text-purple-300 px-2 py-1 rounded-full">
                          {translateCategory(workout.category)}
                        </span>
                      </div>
                      {(workout.shortTermGoal || workout.mediumTermGoal) && (
                        <div className="space-y-1 mb-2">
                          {workout.shortTermGoal && (
                            <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-2 py-1">
                              🎯 {t('goals.shortTermShort')} : {workout.shortTermGoal}
                            </p>
                          )}
                          {workout.mediumTermGoal && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-2 py-1">
                              🗓️ {t('goals.mediumTermShort')} : {workout.mediumTermGoal}
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
                          <span>{t('workout.exerciseCount', { count: workout.exercises.length })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Boutons en bas à droite */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      {/* Pratique hors planning : la session démarre tout de suite */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startWorkout(workout);
                          setActiveTab('home');
                        }}
                        aria-label={t('library.startSessionNamed', { name: workoutName(workout) })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
                      >
                        <Play aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>{t('library.startSession')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exportWorkout(workout);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all border border-blue-200 dark:border-blue-700"
                      >
                        <FileText aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>{t('home.export')}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkout(workout.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-lg transition-all border border-orange-200 dark:border-orange-700"
                      >
                        <Archive aria-hidden="true" className="w-3.5 h-3.5" />
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
                      <h3 className="font-bold text-gray-700 dark:text-gray-300">{workoutName(workout)}</h3>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full">
                        {translateCategory(workout.category)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{workout.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="w-4 h-4" />
                        <span>{t('workout.exerciseCount', { count: workout.exercises.length })}</span>
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
  );
};

export default LibraryPage;
