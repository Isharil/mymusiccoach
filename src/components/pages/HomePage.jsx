import { Play, Check, Clock, Video, FileText, Activity, Calendar, ChevronRight, Music, PenLine, AudioLines, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import PracticeTimeSummary from '../PracticeTimeSummary';
import { duePieces } from '../../utils/repertoire';

const HomePage = () => {
  const {
    earnedBadges, exerciseName, exercises, getBadgeDescription, getBadgeName,
    getCompletedSessionForWorkout, getCurrentDay, getCurrentWeekNumber, getTodayWorkouts,
    isTodaySessionCompleted, isWorkoutCompletedToday, nextBadge, openFreePractice, setActiveTab, setLibrarySubTab,
    setShowMetronome, setShowSchedule, setShowTuner, setViewingWeek, settings, startEditSession, startWorkout,
    stats, t, translateDifficulty, weeklySchedule, workoutName, workouts, pieces, setSelectedPieceId
  } = useApp();
  const piecesDue = duePieces(pieces);

  return (
    <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('home.greeting', { name: settings.userName })} 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
          <span className="text-2xl">🎵</span>
          {t('home.ready')}
        </p>
        {settings.longTermGoal && (
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-2xl px-4 py-3 mt-3 inline-block">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold">🎯 {t('goals.myGoal')}</span> {settings.longTermGoal}
            </p>
          </div>
        )}
      </div>

      {/* Section Session du Jour */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">{t('home.todaySession')}</h2>
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-purple-100 text-sm capitalize">
            {new Date().toLocaleDateString(settings.language || 'en', {
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        
        <div className="p-6">
          {getTodayWorkouts().length > 0 ? (
            <div className="space-y-4">
              {isTodaySessionCompleted() && (
                <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
                  <div className="bg-green-500 rounded-full p-2">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 dark:text-green-200">
                      {getTodayWorkouts().length > 1 ? t('home.allSessionsCompleted') : t('home.sessionCompleted')}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1">
                      {t('home.excellentWork')} 🎵
                    </p>
                  </div>
                </div>
              )}

              {getTodayWorkouts().map((workout) => {
                const completed = isWorkoutCompletedToday(workout.id);
                const completedSession = getCompletedSessionForWorkout(workout.id);
                return (
                  <div key={workout.id} className="space-y-3">
                    <div className={`rounded-xl p-5 ${
                      completed
                        ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30'
                        : 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                          {workoutName(workout)}
                        </h3>
                        {completed && (
                          <div className="bg-green-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
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
                      {(workout.shortTermGoal || workout.mediumTermGoal) && (
                        <div className="space-y-1 mb-3">
                          {workout.shortTermGoal && (
                            <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-1.5">
                              🎯 {t('goals.shortTermShort')} : {workout.shortTermGoal}
                            </p>
                          )}
                          {workout.mediumTermGoal && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
                              🗓️ {t('goals.mediumTermShort')} : {workout.mediumTermGoal}
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => completed
                          ? startEditSession(completedSession)
                          : startWorkout(workout)
                        }
                        className={`w-full py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                          completed
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                            : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white'
                        }`}
                      >
                        {completed ? (
                          <>
                            <Check aria-hidden="true" className="w-5 h-5" />
                            {t('home.completedEdit')}
                          </>
                        ) : (
                          <>
                            <Play aria-hidden="true" className="w-5 h-5" />
                            {t('home.startSession')}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Aperçu des exercices */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('home.sessionExercises')}</p>
                      {workout.exercises.map((exId) => {
                        const exercise = exercises.find(e => e.id === exId);
                        return exercise ? (
                          <div key={exId} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {exercise.type === 'video' && <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                              {exercise.type === 'file' && <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{exerciseName(exercise)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.duration}</p>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              exercise.difficulty === 'Débutant' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                              exercise.difficulty === 'Intermédiaire' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' :
                              'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                            }`}>
                              {translateDifficulty(exercise.difficulty)}
                            </span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : workouts.length === 0 ? (
            <div className="text-center py-8">
              <Music className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">{t('home.noSessionsYet')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('home.createFirstSessionHint')}</p>
              <button
                onClick={() => {
                  setActiveTab('library');
                  setLibrarySubTab('sessions');
                }}
                className="bg-purple-600 dark:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                {t('home.createFirstSession')}
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">{t('home.noSession')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('home.restOrCustomize')}</p>
              <button
                onClick={() => {
                  setViewingWeek(getCurrentWeekNumber());
                  setShowSchedule(true);
                }}
                className="bg-purple-600 dark:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                {t('home.viewSchedule')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Planning hebdomadaire compact */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('home.weekOf', { current: getCurrentWeekNumber() })}
          </h2>
          <button
            onClick={() => {
              setViewingWeek(getCurrentWeekNumber());
              setShowSchedule(true);
            }}
            className="text-purple-600 dark:text-purple-400 text-sm font-medium hover:text-purple-700 dark:text-purple-300 dark:hover:text-purple-300 flex items-center gap-1"
          >
            {t('home.edit')}
            <ChevronRight aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
        <div
          onClick={() => {
            setViewingWeek(getCurrentWeekNumber());
            setShowSchedule(true);
          }}
          className="grid grid-cols-7 gap-2 cursor-pointer active:scale-[0.98] transition-transform"
        >
          {t('schedule.dayAbbr').map((day, idx) => {
            const fullDay = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][idx];
            const isToday = getCurrentDay() === fullDay;
            const currentWeek = getCurrentWeekNumber();
            const weekKey = `semaine${currentWeek}`;
            const dayWorkouts = weeklySchedule[weekKey]?.[fullDay] || [];
            const hasWorkout = Array.isArray(dayWorkouts) ? dayWorkouts.length > 0 : dayWorkouts !== null;
            const workoutCount = Array.isArray(dayWorkouts) ? dayWorkouts.length : (dayWorkouts ? 1 : 0);

            return (
              <div key={idx} className="text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                  isToday
                    ? 'bg-purple-600 text-white ring-4 ring-purple-200 dark:ring-purple-700'
                    : hasWorkout
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                }`}>
                  {day}
                </div>
                {hasWorkout && !isToday && (
                  <div className="flex gap-0.5 justify-center">
                    {Array.from({ length: Math.min(workoutCount, 3) }).map((_, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full"></div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Outils */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('home.tools')}</h2>
        <button
          onClick={() => setShowMetronome(true)}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-4"
        >
          <div className="bg-white/20 rounded-xl p-3">
            <img src="/metronome.svg" alt="" aria-hidden="true" className="w-7 h-7 invert" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">{t('metronome.title')}</p>
            <p className="text-sm text-white/80">{t('home.metronomeDesc')}</p>
          </div>
          <ChevronRight aria-hidden="true" className="w-6 h-6 ml-auto" />
        </button>
        <button
          onClick={() => setShowTuner(true)}
          className="mt-3 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-4"
        >
          <div className="bg-white/20 rounded-xl p-3">
            <AudioLines aria-hidden="true" className="w-7 h-7" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">{t('tuner.title')}</p>
            <p className="text-sm text-white/80">{t('tuner.homeDesc')}</p>
          </div>
          <ChevronRight aria-hidden="true" className="w-6 h-6 ml-auto" />
        </button>
        <button
          onClick={() => openFreePractice()}
          className="mt-3 w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-4"
        >
          <div className="bg-white/20 rounded-xl p-3">
            <PenLine aria-hidden="true" className="w-7 h-7" />
          </div>
          <div className="text-left">
            <p className="font-bold text-lg">{t('freePractice.title')}</p>
            <p className="text-sm text-white/80">{t('freePractice.logDesc')}</p>
          </div>
          <ChevronRight aria-hidden="true" className="w-6 h-6 ml-auto" />
        </button>
      </div>

      {/* Statistiques rapides avec flammes */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('stats')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg text-center active:scale-95 transition-transform"
        >
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{stats.last7Days}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.sessionsLast7Days')}</p>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`rounded-2xl p-5 shadow-lg text-center active:scale-95 transition-transform ${stats.streak >= 3 ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-white dark:bg-gray-800'}`}
        >
          <div className="flex items-center justify-center gap-1">
            {stats.streak >= 3 && <span className="text-2xl">🔥</span>}
            <p className={`text-3xl font-bold ${stats.streak >= 3 ? 'text-white' : 'text-orange-500'}`}>{stats.streak}</p>
          </div>
          <p className={`text-xs ${stats.streak >= 3 ? 'text-orange-100' : 'text-gray-600 dark:text-gray-400'}`}>{t('home.consecutiveDays')}</p>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg text-center active:scale-95 transition-transform"
        >
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stats.last28Days}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.sessionsLast28Days')}</p>
        </button>
      </div>

      {/* Morceaux à travailler aujourd'hui : rappels demandés sur la fiche du morceau */}
      {piecesDue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Bell aria-hidden="true" className="w-5 h-5 text-orange-500" />
            {t('repertoire.homeTitle', { count: piecesDue.length })}
          </h2>
          <ul className="space-y-2">
            {piecesDue.map(piece => (
              <li key={piece.id}>
                <button
                  onClick={() => { setActiveTab('library'); setLibrarySubTab('pieces'); setSelectedPieceId(piece.id); }}
                  className="w-full text-left flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-900 dark:text-gray-100 truncate">{piece.title}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {piece.status === 'mastered' ? t('repertoire.reviewDue') : t(`repertoire.status.${piece.status}`)}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Temps de pratique de la semaine */}
      <PracticeTimeSummary onClick={() => setActiveTab('stats')} />

      {/* Badges et progression */}
      {(earnedBadges.length > 0 || nextBadge) && (
        <div
          onClick={() => setActiveTab('stats')}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-5 cursor-pointer active:scale-[0.98] transition-transform"
        >
          {earnedBadges.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('home.earnedBadges')}</h3>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map(badge => (
                  <div
                    key={badge.id}
                    className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-xl px-3 py-2 flex items-center gap-2"
                    title={getBadgeDescription(badge)}
                  >
                    <span className="text-lg">{badge.icon}</span>
                    <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300">{getBadgeName(badge)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {nextBadge && (
            <div className={earnedBadges.length > 0 ? 'pt-3 border-t border-gray-100 dark:border-gray-700' : ''}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-40">{nextBadge.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('home.nextBadge')}</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{getBadgeName(nextBadge)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{getBadgeDescription(nextBadge)}</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                    {nextBadge.type === 'streak'
                      ? `${stats.streak}/${nextBadge.threshold} ${t('home.days')}`
                      : `${stats.totalSessions}/${nextBadge.threshold} ${t('home.sessions')}`
                    }
                  </p>
                </div>
              </div>
              {/* Barre de progression */}
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (nextBadge.type === 'streak'
                      ? (stats.streak / nextBadge.threshold)
                      : (stats.totalSessions / nextBadge.threshold)) * 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default HomePage;
