import { useEffect, useState } from 'react';
import { Play, Check, Clock, Activity, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DurationField from '../DurationField';
import { elapsedMinutes, parseMinutesInput } from '../../utils/practiceTime';

const ActiveWorkoutPage = () => {
  const {
    activeWorkout, exerciseName, exercises, formatSets, saveSession, setActiveWorkout,
    setSelectedExercise, t, workoutName, workoutProgress
  } = useApp();

  // Durée de pratique : mesurée depuis le début de la session tant qu'elle n'a pas été modifiée
  const [now, setNow] = useState(() => Date.now());
  const [durationInput, setDurationInput] = useState(null); // null = valeur mesurée
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const measuredMinutes = activeWorkout.startedAt ? elapsedMinutes(activeWorkout.startedAt, now) : null;
  const durationValue = durationInput ?? (measuredMinutes ? String(measuredMinutes) : '');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto" style={{paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)'}}>
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8" style={{paddingTop: 'calc(env(safe-area-inset-top, 12px) + 1rem)'}}>
        <button
          onClick={() => setActiveWorkout(null)}
          className="text-white text-sm font-medium mb-4"
        >
          ← {t('workout.back')}
        </button>
        <h1 className="text-3xl font-bold mb-2">{workoutName(activeWorkout)}</h1>
        <div className="flex items-center gap-4 text-purple-100">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{activeWorkout.duration}</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="w-4 h-4" />
            <span className="text-sm">{t('workout.exerciseCount', { count: activeWorkout.exercises.length })}</span>
          </div>
        </div>
        {(activeWorkout.shortTermGoal || activeWorkout.mediumTermGoal) && (
          <div className="mt-3 space-y-1">
            {activeWorkout.shortTermGoal && (
              <p className="text-sm text-purple-200">🎯 {activeWorkout.shortTermGoal}</p>
            )}
            {activeWorkout.mediumTermGoal && (
              <p className="text-sm text-purple-200">🗓️ {activeWorkout.mediumTermGoal}</p>
            )}
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {activeWorkout.exercises.map((exerciseId, index) => {
          const exercise = exercises.find(ex => ex.id === exerciseId);
          if (!exercise) return null;
          
          const key = `${activeWorkout.id}-${exerciseId}`;
          const status = workoutProgress[key];
          
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
                className="w-full bg-purple-600 dark:bg-purple-500 text-white py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors"
              >
                {t('workout.viewDetails')}
              </button>
            </div>
          );
        })}

        {(() => {
          // Vérifier si tous les exercices ont été validés ou sautés
          const allExercisesHandled = activeWorkout.exercises.every(exId => {
            const key = `${activeWorkout.id}-${exId}`;
            return workoutProgress[key] === 'completed' || workoutProgress[key] === 'skipped';
          });
          const handledCount = activeWorkout.exercises.filter(exId => {
            const key = `${activeWorkout.id}-${exId}`;
            return workoutProgress[key] === 'completed' || workoutProgress[key] === 'skipped';
          }).length;

          return (
            <div className="mt-6 space-y-2">
              {!allExercisesHandled && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('workout.exercisesHandled', { done: handledCount, total: activeWorkout.exercises.length })}
                </p>
              )}
              {allExercisesHandled && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                  <DurationField
                    id="session-duration"
                    value={durationValue}
                    onChange={setDurationInput}
                    label={t('practice.sessionDuration')}
                    hint={measuredMinutes ? t('practice.measuredHint') : null}
                  />
                </div>
              )}
              <button
                onClick={() => saveSession(activeWorkout, parseMinutesInput(durationValue))}
                disabled={!allExercisesHandled}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${
                  allExercisesHandled
                    ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:shadow-xl'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                {t('workout.finishSession')}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ActiveWorkoutPage;
