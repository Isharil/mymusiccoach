import { X, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';

const ScheduleModal = () => {
  const {
    archivedWorkouts, getCurrentDay, getCurrentWeekNumber, setActiveTab, setLibrarySubTab,
    setShowSchedule, setViewingWeek, setWeeklySchedule, t, viewingWeek, weeklySchedule, workoutName,
    workouts
  } = useApp();
  useBackHandler(() => setShowSchedule(false));

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto h-screen" role="dialog" aria-modal="true">
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg" style={{paddingTop: 'calc(env(safe-area-inset-top, 12px) + 0.5rem)'}}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowSchedule(false)}
            className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">{t('schedule.back')}</span>
          </button>
          <h2 className="text-lg font-bold">{t('schedule.title')}</h2>
          <div className="w-20"></div>
        </div>

        {/* Navigation entre les semaines */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setViewingWeek(Math.max(1, viewingWeek - 1))}
            disabled={viewingWeek === 1}
            aria-label={t('schedule.previousWeek')}
            className={`p-2 rounded-lg transition-colors ${
              viewingWeek === 1
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <ChevronRight aria-hidden="true" className="w-6 h-6 rotate-180" />
          </button>
          
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(week => (
              <button
                key={week}
                onClick={() => setViewingWeek(week)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  viewingWeek === week
                    ? 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {t('schedule.week').charAt(0)}{week}
                {getCurrentWeekNumber() === week && (
                  <span className="ml-1 text-xs">●</span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setViewingWeek(Math.min(4, viewingWeek + 1))}
            disabled={viewingWeek === 4}
            aria-label={t('schedule.nextWeek')}
            className={`p-2 rounded-lg transition-colors ${
              viewingWeek === 4
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white hover:bg-white/20'
            }`}
          >
            <ChevronRight aria-hidden="true" className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
        {workouts.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-2xl p-5 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{t('schedule.noSessionsYet')}</p>
            <button
              onClick={() => {
                setShowSchedule(false);
                setActiveTab('library');
                setLibrarySubTab('sessions');
              }}
              className="bg-purple-600 dark:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
            >
              {t('schedule.createSession')}
            </button>
          </div>
        )}
        {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((day, dayIndex) => {
          const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const isToday = getCurrentDay() === day && getCurrentWeekNumber() === viewingWeek;
          const weekKey = `semaine${viewingWeek}`;
          const dayWorkouts = weeklySchedule[weekKey]?.[day] || [];
          const workoutIds = Array.isArray(dayWorkouts) ? dayWorkouts : (dayWorkouts ? [dayWorkouts] : []);

          return (
            <div key={day} className={`border-2 rounded-2xl p-4 bg-white dark:bg-gray-800 shadow-md ${
              isToday ? 'border-purple-600 ring-2 ring-purple-200 dark:ring-purple-700' : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`font-bold capitalize text-base ${isToday ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {t(`schedule.dayNames.${dayKeys[dayIndex]}`)}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                      {t('schedule.today')}
                    </span>
                  )}
                </div>
                {workoutIds.length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t('schedule.sessions', { count: workoutIds.length })}
                  </span>
                )}
              </div>

              {/* Sessions existantes */}
              {workoutIds.length > 0 && (
                <div className="space-y-2 mb-3">
                  {workoutIds.map((wId, index) => {
                    const workout = workouts.find(w => w.id === wId);
                    const archivedWorkout = !workout && archivedWorkouts.find(w => w.id === wId);
                    return (
                      <div key={index} className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/30 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🎵</span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {workout
                              ? workoutName(workout)
                              : archivedWorkout
                                ? `${workoutName(archivedWorkout)} (${t('home.archive')})`
                                : t('schedule.deletedSession')}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setWeeklySchedule(prev => ({
                              ...prev,
                              [weekKey]: { ...prev[weekKey], [day]: workoutIds.filter((_, i) => i !== index) }
                            }));
                          }}
                          aria-label={t('schedule.removeSession')}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <X aria-hidden="true" className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {workoutIds.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-3">🌙 {t('schedule.restDay')}</p>
              )}

              {/* Sélecteur pour ajouter une session */}
              {workouts.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setWeeklySchedule(prev => ({
                        ...prev,
                        [weekKey]: { ...prev[weekKey], [day]: [...workoutIds, parseInt(e.target.value)] }
                      }));
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
                >
                  <option value="">+ {t('schedule.addSession')}</option>
                  {workouts.map(w => (
                    <option key={w.id} value={w.id}>🎵 {workoutName(w)}</option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        <div className="h-4"></div>
      </div>
      
      <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl">
        <button
          onClick={() => setShowSchedule(false)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
        >
          ✓ {t('schedule.saveSchedule')}
        </button>
      </div>
    </div>
  );
};

export default ScheduleModal;
