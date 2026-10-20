import { Check } from 'lucide-react';
import { EXERCISE_CATEGORIES } from '../../constants/appData';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { ATTACHMENT_ACCEPT, pickerAccept } from '../../utils/tabFiles';

const ExerciseFormModal = () => {
  const {
    createExercise, editingExercise, exerciseDescription, exerciseName, handleFileUpload,
    newExerciseType, setEditingExercise, setNewExerciseType, setShowCreateExercise,
    setUploadedFile, showToast, t, translateCategory, updateExercise, uploadedFile
  } = useApp();

  const close = () => {
    setShowCreateExercise(false);
    setUploadedFile(null);
    setEditingExercise(null);
    setNewExerciseType('none');
  };
  useBackHandler(close);

  // Enregistrement commun au bouton et à la touche Entrée (création ou modification)
  const saveExercise = (form) => {
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      duration: formData.get('duration'),
      sets: formData.get('sets'),
      type: newExerciseType || 'none',
      difficulty: formData.get('difficulty'),
      baseTempo: parseInt(formData.get('baseTempo')),
      targetTempo: formData.get('targetTempo'),
      category: formData.get('category'),
      description: formData.get('description'),
      videoUrl: formData.get('videoUrl') || undefined,
    };

    if (!data.name || !data.duration || !data.sets) {
      showToast(t('exercise.fillRequired'), 'warning');
      return;
    }

    if (editingExercise) {
      updateExercise(editingExercise, data);
    } else {
      createExercise(data);
    }
    close();
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto h-screen" role="dialog" aria-modal="true">
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-4 shadow-lg" style={{paddingTop: 'calc(env(safe-area-inset-top, 12px) + 0.5rem)'}}>
        <div className="flex items-center justify-between">
          <button
            onClick={close}
            className="flex items-center gap-2 text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">{t('exercise.back')}</span>
          </button>
          <h2 className="text-lg font-bold">{editingExercise ? t('exercise.edit') : t('exercise.new')}</h2>
          <div className="w-20"></div>
        </div>
      </div>
      
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveExercise(e.target);
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950" style={{overflowY: 'scroll', WebkitOverflowScrolling: 'touch'}}>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-600 rounded-xl p-3 mb-2">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">⚠️ {t('exercise.requiredFields')}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.name')} *</label>
            <input
              type="text"
              name="name"
              required
              defaultValue={exerciseName(editingExercise) || ''}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
              placeholder={t('exercise.namePlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.duration')} *</label>
              <input
                type="text"
                name="duration"
                required
                defaultValue={editingExercise?.duration || ''}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                placeholder={t('exercise.durationPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.sets')} *</label>
              <input
                type="text"
                name="sets"
                required
                defaultValue={editingExercise?.sets || ''}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                placeholder={t('exercise.setsPlaceholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.attachment')}</label>
            <div className="flex gap-2">
              {[
                { value: 'none', label: t('exercise.none') },
                { value: 'video', label: t('exercise.video') },
                { value: 'file', label: t('exercise.file') }
              ].map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setNewExerciseType(type.value);
                    setUploadedFile(null); // Réinitialiser le fichier lors du changement de type
                  }}
                  className={`flex-1 py-2 rounded-xl font-medium transition-colors text-sm ${
                    newExerciseType === type.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {newExerciseType === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.youtubeUrl')}</label>
              <input
                type="url"
                name="videoUrl"
                defaultValue={editingExercise?.videoUrl || ''}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
                placeholder="https://youtube.com/..."
              />
            </div>
          )}

          {newExerciseType === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.importFile')}</label>
              <input
                type="file"
                accept={pickerAccept(ATTACHMENT_ACCEPT)}
                onChange={handleFileUpload}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 dark:bg-purple-900/30 file:text-purple-700 dark:text-purple-300 hover:file:bg-purple-100 dark:bg-purple-900/40"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('exercise.acceptedFormats')}
              </p>
              {/* Nouveau fichier choisi, ou fichier déjà joint à l'exercice modifié */}
              {(uploadedFile || editingExercise?.attachment) && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('exercise.fileAdded', { name: (uploadedFile ?? editingExercise.attachment).name })}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.difficulty')} *</label>
            <select
              name="difficulty"
              required
              defaultValue={editingExercise?.difficulty || 'Débutant'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
            >
              <option value="Débutant">{t('exercise.beginner')}</option>
              <option value="Intermédiaire">{t('exercise.intermediate')}</option>
              <option value="Avancé">{t('exercise.advanced')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.category')} *</label>
            <select
              name="category"
              required
              defaultValue={editingExercise?.category || EXERCISE_CATEGORIES[0]}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
            >
              {EXERCISE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{translateCategory(cat)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('exercise.baseTempo')} *
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('exercise.baseTempoHint')})</span>
            </label>
            <input
              type="number"
              name="baseTempo"
              min="0"
              max="300"
              required
              defaultValue={editingExercise?.baseTempo ?? 60}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
              placeholder="60"
            />
          </div>

          <div>
            <label htmlFor="target-tempo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              🎯 {t('exercise.targetTempo')}
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({t('exercise.targetTempoHint')})</span>
            </label>
            <input
              id="target-tempo"
              type="number"
              name="targetTempo"
              min="0"
              max="300"
              defaultValue={editingExercise?.targetTempo || ''}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
              placeholder="120"
            />
          </div>

          <div className="pb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.description')} *</label>
            <textarea
              name="description"
              required
              rows="3"
              defaultValue={exerciseDescription(editingExercise) || ''}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
              placeholder={t('exercise.descriptionPlaceholder')}
            />
          </div>
        </div>

        <div className="flex-shrink-0 border-t-2 border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 shadow-2xl">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              const form = e.target.closest('form');
              if (form) saveExercise(form);
            }}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
          >
            {editingExercise ? `✓ ${t('exercise.saveChanges')}` : `✓ ${t('exercise.create')}`}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExerciseFormModal;
