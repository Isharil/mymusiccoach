import { Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OTHER_CATEGORY } from '../utils/practiceTime';

// Temps de pratique de la semaine (et objectif) ; version détaillée avec la répartition par catégorie
const PracticeTimeSummary = ({ detailed = false, onClick }) => {
  const { formatMinutes, settings, stats, t, translateCategory } = useApp();

  const goal = Number(settings.weeklyGoalMinutes) || 0;
  const progress = goal ? Math.min(100, (stats.minutesThisWeek / goal) * 100) : 0;
  const maxCategory = Math.max(1, ...stats.categoryMinutes.map(c => c.minutes));
  const categoryLabel = (category) =>
    category === OTHER_CATEGORY ? t('categories.other') : translateCategory(category);

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick && { onClick, type: 'button' })}
      className={`w-full text-left bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 ${onClick ? 'active:scale-[0.98] transition-transform' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Timer aria-hidden="true" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          {t('practice.title')}
        </h2>
        {detailed && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('practice.last28Days')} : <strong className="text-gray-900 dark:text-gray-100">{formatMinutes(stats.minutesLast28Days)}</strong>
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">{t('practice.thisWeek')}</p>
      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
        {formatMinutes(stats.minutesThisWeek)}
        {goal > 0 && (
          <span className="text-base font-medium text-gray-500 dark:text-gray-400"> / {formatMinutes(goal)}</span>
        )}
      </p>

      {goal > 0 ? (
        <>
          <div
            className="mt-3 h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={goal}
            aria-valuenow={stats.minutesThisWeek}
            aria-label={t('practice.weeklyGoal')}
          >
            <div
              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-purple-600'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress >= 100 && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">{t('practice.goalReached')}</p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('practice.noGoal')}</p>
      )}

      {detailed && (
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t('practice.byCategory')}</h3>
          {stats.categoryMinutes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('practice.noData')}</p>
          ) : (
            <ul className="space-y-2">
              {stats.categoryMinutes.map(({ category, minutes }) => (
                <li key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{categoryLabel(category)}</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatMinutes(minutes)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(minutes / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Wrapper>
  );
};

export default PracticeTimeSummary;
