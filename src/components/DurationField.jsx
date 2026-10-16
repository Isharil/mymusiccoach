import { Clock } from 'lucide-react';

// Champ de saisie d'une durée en minutes (fin de session, édition, pratique libre)
const DurationField = ({ id, label, value, onChange, hint }) => (
  <div>
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      <Clock aria-hidden="true" className="w-4 h-4" />
      {label}
    </label>
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min="1"
        max="1440"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center font-bold"
      />
      <span className="text-gray-600 dark:text-gray-400">min</span>
    </div>
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
  </div>
);

export default DurationField;
