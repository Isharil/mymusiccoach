import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isLoopActive, NO_LOOP, PRACTICE_SPEEDS, setLoopPoint } from '../utils/media';
import { formatPlaybackTime } from '../utils/tabFiles';

/** Vitesse et boucle A-B, pour le lecteur audio et les vidéos YouTube */
const PracticeControls = ({ idPrefix, speed, onSpeedChange, loop, onLoopChange, getPosition, disabled = false }) => {
  const { t } = useApp();
  const time = (seconds) => formatPlaybackTime(seconds * 1000);
  const pointClass = (set) => `w-10 h-10 rounded-xl text-sm font-bold disabled:opacity-40 ${
    set ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
  }`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`${idPrefix}-speed`} className="sr-only">{t('media.speed')}</label>
      <select
        id={`${idPrefix}-speed`}
        value={speed}
        disabled={disabled}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium disabled:opacity-40"
      >
        {PRACTICE_SPEEDS.map(value => <option key={value} value={value}>{Math.round(value * 100)} %</option>)}
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLoopChange(setLoopPoint(loop, 'start', getPosition()))}
        aria-label={t('media.loopStart')}
        className={pointClass(loop.start != null)}
      >
        A
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onLoopChange(setLoopPoint(loop, 'end', getPosition()))}
        aria-label={t('media.loopEnd')}
        className={pointClass(loop.end != null)}
      >
        B
      </button>
      {loop.start != null ? (
        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
          {isLoopActive(loop)
            ? t('media.loopRange', { start: time(loop.start), end: time(loop.end) })
            : t('media.loopFrom', { start: time(loop.start) })}
          <button type="button" onClick={() => onLoopChange(NO_LOOP)} aria-label={t('media.clearLoop')} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </span>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('media.loopHint')}</span>
      )}
    </div>
  );
};

export default PracticeControls;
