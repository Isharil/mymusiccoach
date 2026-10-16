import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { EXERCISE_CATEGORIES } from '../../constants/appData';
import { useApp } from '../../context/AppContext';
import { toLocalDateStr } from '../../utils/practiceStats';
import { parseMinutesInput } from '../../utils/practiceTime';
import DurationField from '../DurationField';

// Saisie (ou modification) d'une pratique libre, hors sessions du planning
const FreePracticeModal = () => {
  const {
    closeFreePractice, deleteFreePractice, editingFreePractice, saveFreePractice, showToast, t,
    translateCategory
  } = useApp();

  const editing = editingFreePractice;
  const today = toLocalDateStr(new Date());
  const [name, setName] = useState(editing?.workoutName ?? '');
  const [date, setDate] = useState(editing?.date ?? today);
  const [duration, setDuration] = useState(editing?.durationMinutes ? String(editing.durationMinutes) : '20');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [note, setNote] = useState(editing?.note ?? '');

  const inputClass = 'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';

  const handleSubmit = (e) => {
    e.preventDefault();
    const durationMinutes = parseMinutesInput(duration);
    if (!durationMinutes || !date || date > today) {
      showToast(t('exercise.fillRequired'), 'warning');
      return;
    }
    saveFreePractice({ name: name.trim(), date, durationMinutes, category, note: note.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="free-practice-title"
      >
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-6 rounded-t-3xl flex justify-between items-start">
          <div>
            <h2 id="free-practice-title" className="text-white font-bold text-xl">
              {editing ? t('freePractice.editTitle') : t('freePractice.title')}
            </h2>
            <p className="text-emerald-50 text-sm mt-1">{t('freePractice.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={closeFreePractice}
            aria-label={t('common.close')}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0"
          >
            <X aria-hidden="true" className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="free-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('freePractice.name')}</label>
            <input
              id="free-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('freePractice.namePlaceholder')}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="free-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('freePractice.date')}</label>
              <input
                id="free-date"
                type="date"
                value={date}
                max={today}
                required
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <DurationField id="free-duration" label={t('practice.sessionDuration')} value={duration} onChange={setDuration} />
          </div>

          <div>
            <label htmlFor="free-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('exercise.category')}</label>
            <select id="free-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              <option value="">{t('categories.other')}</option>
              {EXERCISE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{translateCategory(cat)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="free-note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('freePractice.note')}</label>
            <textarea
              id="free-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('freePractice.notePlaceholder')}
              className={`${inputClass} resize-none`}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-4 rounded-xl font-bold shadow-lg"
          >
            ✓ {t('freePractice.save')}
          </button>

          {editing && (
            <button
              type="button"
              onClick={() => deleteFreePractice(editing.id)}
              className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 py-3 rounded-xl font-medium border-2 border-red-200 dark:border-red-700"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
              {t('freePractice.delete')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default FreePracticeModal;
