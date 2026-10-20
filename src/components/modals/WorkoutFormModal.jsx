import { Archive } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';

const WorkoutFormModal = () => {
  const {
    createOrUpdateWorkout, deleteWorkout, editingWorkout, exerciseName, exercises, getNextWorkoutId,
    setEditingWorkout, setShowCreateWorkout, setWorkouts, showToast, t, translateCategory,
    workoutName, workouts
  } = useApp();
  useBackHandler(() => { setShowCreateWorkout(false); setEditingWorkout(null); });

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto h-screen" role="dialog" aria-modal="true">
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg" style={{paddingTop: 'calc(env(safe-area-inset-top, 12px) + 0.5rem)'}}>
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setShowCreateWorkout(false);
              setEditingWorkout(null);
            }}
            className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">{t('common.back')}</span>
          </button>
          <h2 className="text-lg font-bold">
            {editingWorkout ? t('workout.editTitle') : t('workout.new')}
          </h2>
          <div className="w-20"></div>
        </div>
      </div>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const selectedExercises = Array.from(formData.getAll('exercises')).map(id => parseInt(id));
          const data = {
            name: formData.get('name'),
            duration: formData.get('duration'),
            category: formData.get('category'),
            exercises: selectedExercises
          };
          createOrUpdateWorkout(data);
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('workout.sessionName')}</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={workoutName(editingWorkout)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
              placeholder={t('workout.namePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('workout.estimatedDuration')}</label>
              <input
                type="text"
                name="duration"
                required
                defaultValue={editingWorkout?.duration}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                placeholder="30 min"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('workout.category')}</label>
              <input
                type="text"
                name="category"
                required
                defaultValue={editingWorkout ? translateCategory(editingWorkout.category) : undefined}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                placeholder={t('workout.categoryPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🎯 {t('workout.shortTermGoal')}</label>
            <textarea
              name="shortTermGoal"
              defaultValue={editingWorkout?.shortTermGoal || ''}
              placeholder={t('workout.shortTermGoalPlaceholder')}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🗓️ {t('workout.mediumTermGoal')}</label>
            <textarea
              name="mediumTermGoal"
              defaultValue={editingWorkout?.mediumTermGoal || ''}
              placeholder={t('workout.mediumTermGoalPlaceholder')}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
            />
          </div>

          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('workout.selectExercises')}</label>
            <div className="space-y-2">
              {exercises.map(ex => (
                <label
                  key={ex.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-700 border border-gray-200 dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    name="exercises"
                    value={ex.id}
                    defaultChecked={editingWorkout?.exercises.includes(ex.id)}
                    className="w-5 h-5 text-purple-600 dark:text-purple-400 rounded focus:ring-purple-500 dark:focus:ring-purple-400"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{exerciseName(ex)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{ex.duration}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl space-y-3">
          <button
            
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const form = e.target.closest('form');
              if (!form) {
                return;
              }

              const formData = new FormData(form);
              const selectedExercises = Array.from(formData.getAll('exercises')).map(id => parseInt(id));
              const data = {
                name: formData.get('name'),
                duration: formData.get('duration'),
                category: formData.get('category'),
                exercises: selectedExercises,
                shortTermGoal: formData.get('shortTermGoal') || '',
                mediumTermGoal: formData.get('mediumTermGoal') || ''
              };

              if (!data.name || !data.duration || !data.category) {
                showToast(t('exercise.fillRequired'), 'warning');
                return;
              }

              if (editingWorkout) {
                setWorkouts(workouts.map(w => w.id === editingWorkout.id ? { ...w, ...data, isExample: false } : w));
                setEditingWorkout(null);
                setShowCreateWorkout(false);
              } else {
                const newWorkout = {
                  id: getNextWorkoutId(),
                  ...data
                };
                setWorkouts([...workouts, newWorkout]);
                setShowCreateWorkout(false);
              }
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
          >
            {editingWorkout ? `✓ ${t('workout.save')}` : `✓ ${t('workout.createSession')}`}
          </button>

          {editingWorkout && (
            <button
              
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Archive (réversible) plutôt que suppression définitive
                deleteWorkout(editingWorkout.id);
              }}
              className="w-full bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 py-3 rounded-xl font-medium border-2 border-orange-200 dark:border-orange-700 flex items-center justify-center gap-2"
            >
              <Archive aria-hidden="true" className="w-4 h-4" />
              {t('home.archiveAction')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default WorkoutFormModal;
