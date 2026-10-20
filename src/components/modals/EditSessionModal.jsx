import { Play, Check, Clock, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import DurationField from '../DurationField';

const EditSessionModal = () => {
  const {
    editingSession, editingSessionDuration, editingSessionProgress, exerciseName, exercises,
    formatDisplayDate, formatSets, setEditingSession, setEditingSessionDuration,
    setEditingSessionProgress, setSelectedExercise, t, updateSession, workouts
  } = useApp();
  useBackHandler(() => { setEditingSession(null); setEditingSessionProgress({}); });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-md sm:max-w-lg landscape:max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 rounded-t-3xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-white font-bold text-xl">{t('workout.editTitle')}</h2>
              <p className="text-purple-200 text-sm">{t('common.dateAtTime', { date: formatDisplayDate(editingSession.date), time: editingSession.time })}</p>
            </div>
            <button
              onClick={() => { setEditingSession(null); setEditingSessionProgress({}); }}
              aria-label={t('common.close')}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <X aria-hidden="true" className="w-5 h-5 text-white" />
            </button>
          </div>
          <p className="text-white mt-2 font-medium">{editingSession.workoutName}</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('editSession.hint')}
          </p>

          {(() => {
            const workout = workouts.find(w => w.id === editingSession.workoutId);
            if (!workout) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('messages.sessionNoLongerExists')}</p>
                </div>
              );
            }

            return workout.exercises.map((exerciseId, index) => {
              const exercise = exercises.find(ex => ex.id === exerciseId);
              if (!exercise) return null;

              const status = editingSessionProgress[exerciseId] || 'pending';

              return (
                <div
                  key={exerciseId}
                  className={`border-2 rounded-2xl p-5 transition-all ${
                    status === 'completed' ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30' :
                    status === 'skipped' ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' :
                    'border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">#{index + 1}</span>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{exerciseName(exercise)}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exercise.duration}
                        </span>
                        <span>{formatSets(exercise.sets)}</span>
                      </div>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-green-500 text-white' :
                        status === 'skipped' ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400' :
                        'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {status === 'completed' ? <Check className="w-5 h-5" /> :
                       status === 'skipped' ? <X className="w-5 h-5" /> :
                       <Play className="w-5 h-5" />}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedExercise(exercise)}
                    className="w-full bg-purple-600 text-white py-2 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors text-sm"
                  >
                    {t('workout.viewDetails')}
                  </button>
                </div>
              );
            });
          })()}

          <DurationField
            id="edit-session-duration"
            value={editingSessionDuration}
            onChange={setEditingSessionDuration}
            label={t('practice.sessionDuration')}
          />

          <button
            onClick={updateSession}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-xl font-bold shadow-lg mt-6"
          >
            {t('exercise.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSessionModal;
