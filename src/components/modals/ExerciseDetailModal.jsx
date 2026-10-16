import { Check, Clock, TrendingUp, Video, FileText, Activity, X, Edit2, Trash2, Music, MoreVertical } from 'lucide-react';
import Metronome from '../../components/Metronome';
import { formatTime } from '../../utils/exercises';
import { useApp } from '../../context/AppContext';

const ExerciseDetailModal = () => {
  const {
    activeWorkout, currentTempo, deleteExercise, editingSession, editingSessionProgress,
    exerciseDescription, exerciseName, exerciseNotes, exercises, formatDisplayDate, formatSets,
    metronomeTempo, pauseTimer, resumeTimer, saveTempo, selectedExercise, setCurrentTempo,
    setEditingExercise, setEditingSessionProgress, setExerciseNotes, setExercises, setMetronomeTempo,
    setNewExerciseType, setSelectedExercise, setShowCreateExercise, setShowExerciseMenu,
    setTimerFinished, setUploadedFile, setWorkoutProgress, settings, showExerciseMenu, startTimer,
    stopTimer, t, timerActive, timerFinished, timerPaused, timerSeconds, translateCategory,
    translateDifficulty, workoutProgress, workouts
  } = useApp();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="h-full flex flex-col bg-white dark:bg-gray-800 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto" role="dialog" aria-modal="true">
        <div className="flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6" style={{paddingTop: 'calc(env(safe-area-inset-top, 12px) + 1rem)'}}>

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
              ← {t('exercise.back')}
            </button>
            <h3 className="font-bold text-lg flex-1 text-center">{exerciseName(selectedExercise)}</h3>
            <div className="relative">
              <button
                onClick={() => setShowExerciseMenu(!showExerciseMenu)}
                aria-label={t('common.moreOptions')}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <MoreVertical aria-hidden="true" className="w-5 h-5" />
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
                    <Edit2 aria-hidden="true" className="w-5 h-5" />
                    {t('exercise.edit')}
                  </button>
                  <button
                    onClick={() => {
                      setShowExerciseMenu(false);
                      deleteExercise(selectedExercise.id);
                    }}
                    className="w-full px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 dark:bg-red-900/30 flex items-center gap-3"
                  >
                    <Trash2 aria-hidden="true" className="w-5 h-5" />
                    {t('exercise.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                selectedExercise.difficulty === 'Débutant' ? 'bg-green-400 text-green-900 dark:text-green-200' :
                selectedExercise.difficulty === 'Intermédiaire' ? 'bg-yellow-400 text-yellow-900' :
                'bg-red-400 text-red-900'
              }`}>
                {translateDifficulty(selectedExercise.difficulty)}
              </span>
              <span className="text-purple-100 text-sm">{translateCategory(selectedExercise.category)}</span>
            </div>
            {/* Widget timer alarme dans le header */}
            {activeWorkout && activeWorkout.exercises.includes(selectedExercise.id) && (
              timerActive || timerPaused || timerSeconds > 0 ? (
                <div className={`flex items-center gap-1.5 pl-1 pr-1 py-1 rounded-full border border-white/20 ${
                  timerActive
                    ? 'bg-white/20 text-white'
                    : timerPaused
                    ? 'bg-yellow-500/80 text-white'
                    : 'bg-white/10 text-white'
                }`}>
                  <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
                    {/* Pieds */}
                    <line x1="9" y1="24" x2="7" y2="26.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="19" y1="24" x2="21" y2="26.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    {/* Cloches */}
                    <circle cx="6" cy="6" r="3.5" fill="none" stroke="white" strokeWidth="1.3"/>
                    <circle cx="22" cy="6" r="3.5" fill="none" stroke="white" strokeWidth="1.3"/>
                    {/* Cadran */}
                    <circle cx="14" cy="14.5" r="10" fill="none" stroke="white" strokeWidth="1.5"/>
                    <circle cx="14" cy="14.5" r="8.5" fill="white" fillOpacity="0.15"/>
                    {/* Marqueurs heures */}
                    {[0,30,60,90,120,150,180,210,240,270,300,330].map(a => (
                      <line key={a} x1={14+Math.sin(a*Math.PI/180)*7} y1={14.5-Math.cos(a*Math.PI/180)*7} x2={14+Math.sin(a*Math.PI/180)*8.2} y2={14.5-Math.cos(a*Math.PI/180)*8.2} stroke="white" strokeWidth="1" strokeLinecap="round"/>
                    ))}
                    {/* Aiguille minutes (basée sur les minutes) */}
                    <line x1="14" y1="14.5" x2={14+Math.sin((Math.floor(timerSeconds/60)%60)*6*Math.PI/180)*5.5} y2={14.5-Math.cos((Math.floor(timerSeconds/60)%60)*6*Math.PI/180)*5.5} stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    {/* Aiguille secondes */}
                    <line x1="14" y1="14.5" x2={14+Math.sin((timerSeconds%60)*6*Math.PI/180)*7} y2={14.5-Math.cos((timerSeconds%60)*6*Math.PI/180)*7} stroke={timerActive ? '#f87171' : 'white'} strokeWidth="0.8" strokeLinecap="round" className="transition-all duration-1000 ease-linear"/>
                    {/* Centre */}
                    <circle cx="14" cy="14.5" r="1.2" fill="white"/>
                    {/* Bouton du haut */}
                    <rect x="12.5" y="2" width="3" height="2.5" rx="1" fill="white"/>
                  </svg>
                  <span className="font-bold text-xs tabular-nums">{formatTime(timerSeconds)}</span>
                  {timerActive ? (
                    <button onClick={() => pauseTimer()} className="p-0.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                      <span className="text-[10px]">⏸</span>
                    </button>
                  ) : (
                    <button onClick={() => resumeTimer()} className="p-0.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                      <span className="text-[10px]">▶️</span>
                    </button>
                  )}
                  <button onClick={() => stopTimer()} className="p-0.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                    <span className="text-[10px]">⏹</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startTimer(selectedExercise)}
                  className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all animate-pulse border border-white/20"
                >
                  <svg width="24" height="24" viewBox="0 0 28 28" className="shrink-0">
                    <line x1="9" y1="24" x2="7" y2="26.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="19" y1="24" x2="21" y2="26.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="6" cy="6" r="3.5" fill="none" stroke="white" strokeWidth="1.3"/>
                    <circle cx="22" cy="6" r="3.5" fill="none" stroke="white" strokeWidth="1.3"/>
                    <circle cx="14" cy="14.5" r="10" fill="none" stroke="white" strokeWidth="1.5"/>
                    <circle cx="14" cy="14.5" r="8.5" fill="white" fillOpacity="0.15"/>
                    {/* Aiguilles fixes à 10h10 */}
                    <line x1="14" y1="14.5" x2={14+Math.sin(300*Math.PI/180)*5.5} y2={14.5-Math.cos(300*Math.PI/180)*5.5} stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="14" y1="14.5" x2={14+Math.sin(60*Math.PI/180)*5.5} y2={14.5-Math.cos(60*Math.PI/180)*5.5} stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="14" cy="14.5" r="1.2" fill="white"/>
                    <rect x="12.5" y="2" width="3" height="2.5" rx="1" fill="white"/>
                  </svg>
                  <span className="text-xs font-bold uppercase">{t('timer.start')}</span>
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">

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
                    <p className="font-bold text-lg">{t('exercise.watchVideo')}</p>
                    <p className="text-red-100 text-sm">{t('exercise.openYoutube')}</p>
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
                      alt={exerciseName(selectedExercise)}
                      className="max-w-full h-auto rounded-xl mb-4 shadow-md"
                    />
                    <a
                      href={selectedExercise.fileData.data}
                      download={selectedExercise.fileData.name}
                      className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
                    >
                      {t('exercise.downloadImage')}
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
                        ? t('exercise.downloadGuitarPro')
                        : selectedExercise.fileData.name.match(/\.(pdf)$/i)
                        ? t('exercise.downloadPdf')
                        : selectedExercise.fileData.name.match(/\.(musicxml|xml)$/i)
                        ? t('exercise.downloadScore')
                        : t('exercise.downloadFile')}
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3">{t('exercise.description')}</h4>
              <p className="text-gray-600 dark:text-gray-400">{exerciseDescription(selectedExercise)}</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{t('exercise.duration')}</p>

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
                          ⏸ {t('exercise.pause')}
                        </button>
                      ) : (
                        <button
                          onClick={() => resumeTimer()}
                          className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                        >
                          ▶️ {t('exercise.resume')}
                        </button>
                      )}
                      <button
                        onClick={() => stopTimer()}
                        className="flex-1 bg-gray-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors"
                      >
                        ⏹ {t('exercise.stop')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">{selectedExercise.duration}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{formatSets(selectedExercise.sets)}</p>
                    <button
                      onClick={() => startTimer(selectedExercise)}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
                    >
                      ⏱️ {t('exercise.startTimer')}
                    </button>
                  </>
                )}
              </div>
              {selectedExercise.baseTempo > 0 && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl p-5 shadow-md">
                  <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t('exercise.tempo')}</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{selectedExercise.baseTempo} BPM</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('exercise.baseTempoLabel')}</p>
                </div>
              )}
            </div>

            {/* Métronome compact */}
            <Metronome
              initialTempo={
                selectedExercise.tempoHistory?.length > 0
                  ? selectedExercise.tempoHistory[selectedExercise.tempoHistory.length - 1].tempo
                  : (selectedExercise.baseTempo > 0 ? selectedExercise.baseTempo : 120)
              }
              compact={true}
              t={t}
              soundType={settings.metronomeSound}
              theme={settings.theme}
              onTempoChange={setMetronomeTempo}
            />

            {/* Zone de notes/observations - pendant une session active, avec ou sans tempo */}
            {(activeWorkout && activeWorkout.exercises.includes(selectedExercise.id)) && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 rounded-2xl p-6 shadow-lg border border-amber-200 dark:border-amber-700">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  {t('exercise.notes')}
                </h4>
                <textarea
                  value={exerciseNotes[selectedExercise.id] || ''}
                  onChange={(e) => setExerciseNotes({...exerciseNotes, [selectedExercise.id]: e.target.value})}
                  placeholder={t('exercise.notesPlaceholder')}
                  className="w-full px-4 py-3 border border-amber-300 dark:border-amber-600 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
                  rows={3}
                />
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  {t('exercise.notesHint')}
                </p>
              </div>
            )}

            {selectedExercise.baseTempo > 0 && (
              <>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-2xl p-6 shadow-lg border-2 border-blue-200 dark:border-blue-700">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    {t('exercise.recordYourTempo')}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">{t('exercise.recordTempoHint')}</p>
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
                      className="flex-1 px-4 py-3 border-2 border-blue-300 dark:border-blue-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 text-lg font-bold text-center"
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
                    {t('exercise.recordMyTempo')}
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">{t('exercise.progressHistory')}</h4>
                  {selectedExercise.tempoHistory.length > 0 ? (
                    <div className="space-y-3">
                      {selectedExercise.tempoHistory.slice().reverse().map((entry, idx, reversedArray) => {
                        // Comparer avec l'entrée suivante (plus ancienne) dans l'ordre inversé
                        const olderEntry = reversedArray[idx + 1];
                        const isImprovement = olderEntry && entry.tempo > olderEntry.tempo;
                        return (
                          <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{formatDisplayDate(entry.date)}</span>
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
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('exercise.noTempoRecorded')}</p>
                  )}
                </div>
              </>
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
                      <span className="font-bold text-green-900 dark:text-green-200">{t('exercise.validated')}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newProgress = {...workoutProgress};
                        delete newProgress[key];
                        setWorkoutProgress(newProgress);
                      }}
                      className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      {t('exercise.cancel')}
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
                      <span className="font-bold text-gray-700 dark:text-gray-300">{t('exercise.skipped')}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newProgress = {...workoutProgress};
                        delete newProgress[key];
                        setWorkoutProgress(newProgress);
                      }}
                      className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                      {t('exercise.cancel')}
                    </button>
                  </div>
                );
              }

              // Vérifier si un tempo est saisi mais non enregistré
              const hasUnsavedTempo = selectedExercise.baseTempo > 0 && currentTempo[selectedExercise.id];
              const hasTempo = selectedExercise.baseTempo > 0;

              return (
                <div className="space-y-3">
                  {hasTempo && metronomeTempo && (
                    <button
                      onClick={() => {
                        // Enregistrer le tempo du métronome
                        const today = new Date();
                        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const updatedExercises = exercises.map(ex => {
                          if (ex.id === selectedExercise.id) {
                            return { ...ex, tempoHistory: [...ex.tempoHistory, { date: dateStr, tempo: metronomeTempo }] };
                          }
                          return ex;
                        });
                        setExercises(updatedExercises);
                        setCurrentTempo({...currentTempo, [selectedExercise.id]: ''});
                        // Valider l'exercice et fermer
                        setWorkoutProgress({...workoutProgress, [key]: 'completed'});
                        stopTimer();
                        setSelectedExercise(null);
                      }}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Activity aria-hidden="true" className="w-5 h-5" />
                      {t('exercise.saveTempoAndValidate', { tempo: metronomeTempo })}
                    </button>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setWorkoutProgress({...workoutProgress, [key]: 'skipped'});
                      }}
                      className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-4 rounded-xl font-bold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                    >
                      <X aria-hidden="true" className="w-5 h-5" />
                      {t('exercise.skip')}
                    </button>
                    <button
                      onClick={() => {
                        // Auto-enregistrer le tempo si saisi manuellement
                        if (hasUnsavedTempo) {
                          saveTempo(selectedExercise.id);
                        }
                        setWorkoutProgress({...workoutProgress, [key]: 'completed'});
                        stopTimer();
                        setSelectedExercise(null);
                      }}
                      className="flex-[2] bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Check aria-hidden="true" className="w-6 h-6" />
                      {t('exercise.validate')}
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
                        <span className="font-bold text-green-900 dark:text-green-200">{t('exercise.validated')}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'skipped'});
                        }}
                        className="w-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                      >
                        {t('editSession.markSkipped')}
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
                        <span className="font-bold text-gray-700 dark:text-gray-300">{t('exercise.skipped')}</span>
                      </div>
                      <button
                        onClick={() => {
                          setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'completed'});
                        }}
                        className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
                      >
                        {t('editSession.markCompleted')}
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
                      <X aria-hidden="true" className="w-5 h-5" />
                      {t('editSession.skipped')}
                    </button>
                    <button
                      onClick={() => {
                        setEditingSessionProgress({...editingSessionProgress, [selectedExercise.id]: 'completed'});
                      }}
                      className="flex-[2] bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Check aria-hidden="true" className="w-6 h-6" />
                      {t('editSession.completed')}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ExerciseDetailModal;
