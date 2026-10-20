import { Check, X } from 'lucide-react';
import { BADGES } from '../../constants/appData';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';

const BadgesModal = () => {
  const {
    earnedBadges, getBadgeDescription, getBadgeName, setShowAllBadges, stats, t
  } = useApp();
  useBackHandler(() => setShowAllBadges(false));

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={() => setShowAllBadges(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">🏆 {t('stats.allBadges')}</h2>
            <button
              onClick={() => setShowAllBadges(false)}
              aria-label={t('common.close')}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X aria-hidden="true" className="w-6 h-6" />
            </button>
          </div>
          <p className="text-yellow-100 text-sm mt-1">
            {earnedBadges.length} / {BADGES.length} {t('stats.badgesUnlocked')}
          </p>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            {BADGES.map(badge => {
              const isEarned = earnedBadges.some(b => b.id === badge.id);
              const progress = badge.type === 'streak' ? stats.streak : stats.totalSessions;
              return (
                <div
                  key={badge.id}
                  className={`rounded-xl p-3 flex items-center gap-3 transition-all ${
                    isEarned
                      ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <span className={`text-2xl ${isEarned ? '' : 'grayscale opacity-50'}`}>{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isEarned ? 'text-yellow-800 dark:text-yellow-200' : 'text-gray-500 dark:text-gray-300'}`}>
                      {getBadgeName(badge)}
                    </p>
                    <p className={`text-xs ${isEarned ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-400 dark:text-gray-400'}`}>
                      {getBadgeDescription(badge)}
                    </p>
                  </div>
                  {isEarned ? (
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-400 flex-shrink-0">
                      {progress}/{badge.threshold}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BadgesModal;
