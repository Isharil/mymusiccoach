import { TrendingUp, FileText, Edit2, Award, ChevronRight, ChevronLeft } from 'lucide-react';
import { BADGES } from '../../constants/appData';
import { useApp } from '../../context/AppContext';
import PracticeTimeSummary from '../PracticeTimeSummary';

const StatsPage = () => {
  const {
    calendarMonth, calendarYear, earnedBadges, exerciseName, exercises, formatDisplayDate, formatMinutes,
    getBadgeDescription, getBadgeName, isDarkMode, sessionHistory, setCalendarMonth, setCalendarYear,
    setShowAllBadges, setShowAllHistory, setShowExportModal, settings, showAllHistory,
    startEditSession, stats, t, translateCategory
  } = useApp();

  return (
    <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('stats.title')}</h1>
        <button
          onClick={() => setShowExportModal(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <FileText aria-hidden="true" className="w-4 h-4" />
          {t('stats.exportReport')}
        </button>
      </div>

      {/* Encadré informatif */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
              📊 {t('stats.shareWithTeacher')}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {t('stats.shareDescription')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-purple-700 dark:text-purple-200 mb-1">{stats.last7Days}</p>
          <p className="text-xs text-purple-900 dark:text-purple-300">{t('stats.sessionsLast7Days')}</p>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-green-700 dark:text-green-200 mb-1">{stats.daysWithPractice}/7</p>
          <p className="text-xs text-green-900 dark:text-green-300">{t('stats.daysPracticed')}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-blue-700 dark:text-blue-200 mb-1">{stats.last28Days}</p>
          <p className="text-xs text-blue-900 dark:text-blue-300">{t('stats.sessionsLast28Days')}</p>
        </div>
      </div>

      {/* Temps de pratique : semaine, objectif, répartition par catégorie */}
      <PracticeTimeSummary detailed />

      {/* Calendrier de pratique */}
      {(() => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

        // Index des sessions par date (YYYY-MM-DD → count)
        const sessionDates = {};
        sessionHistory.forEach(s => {
          const d = s.date.includes('/')
            ? (() => { const [day,mo,yr] = s.date.split('/'); return `${yr}-${mo.padStart(2,'0')}-${day.padStart(2,'0')}`; })()
            : s.date;
          sessionDates[d] = (sessionDates[d] || 0) + 1;
        });

        const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        // Décalage lundi=0
        const offset = (firstDayOfMonth.getDay() + 6) % 7;

        const monthLabel = firstDayOfMonth.toLocaleString(settings.language, { month: 'long', year: 'numeric' });

        const prevMonth = () => {
          if (calendarMonth === 0) { setCalendarYear(y => y - 1); setCalendarMonth(11); }
          else setCalendarMonth(m => m - 1);
        };
        const nextMonth = () => {
          if (calendarMonth === 11) { setCalendarYear(y => y + 1); setCalendarMonth(0); }
          else setCalendarMonth(m => m + 1);
        };

        const isCurrentMonth = calendarYear === today.getFullYear() && calendarMonth === today.getMonth();

        // En-têtes lundi→dimanche localisés (2024-01-01 est un lundi)
        const dayHeaders = Array.from({ length: 7 }, (_, i) =>
          new Date(2024, 0, i + 1).toLocaleString(settings.language, { weekday: 'short' }).slice(0, 2)
        );

        // Cellules : null pour les cases vides, puis 1..daysInMonth
        const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

        return (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📅 {t('stats.practiceCalendar')}</h2>

            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} aria-label={t('stats.previousMonth')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <ChevronLeft aria-hidden="true" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{monthLabel}</span>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                aria-label={t('stats.nextMonth')}
                className={`p-2 rounded-xl transition-colors ${isCurrentMonth ? 'opacity-25 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                <ChevronRight aria-hidden="true" className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* En-têtes jours */}
            <div className="grid grid-cols-7 mb-1">
              {dayHeaders.map((d, i) => (
                <div key={i} className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1 capitalize">{d}</div>
              ))}
            </div>

            {/* Grille */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const count = sessionDates[dateStr] || 0;
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;

                return (
                  <div key={dateStr} className="flex justify-center items-center py-0.5">
                    <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium relative
                      ${count > 0 ? 'bg-green-500 text-white' : ''}
                      ${isToday && count === 0 ? 'ring-2 ring-purple-500 text-purple-600 dark:text-purple-400' : ''}
                      ${isToday && count > 0 ? 'ring-2 ring-green-700' : ''}
                      ${!count && !isToday ? (isFuture ? 'text-gray-300 dark:text-gray-600' : 'text-gray-500 dark:text-gray-400') : ''}
                    `}>
                      {day}
                      {count > 1 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-green-700 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Légende */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('stats.calendarSessionDone')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full ring-2 ring-purple-500 shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('stats.calendarToday')}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Section Badges */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">🏆 {t('stats.myBadges')}</h2>

        {/* Derniers badges obtenus */}
        {earnedBadges.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('stats.unlockedBadges')} ({earnedBadges.length})</p>
            <div className="flex flex-wrap gap-2">
              {earnedBadges.slice(-4).reverse().map(badge => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-sm"
                >
                  <span className="text-xl">{badge.icon}</span>
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{getBadgeName(badge)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prochains badges à débloquer */}
        {(() => {
          const notEarnedBadges = BADGES.filter(b => !earnedBadges.some(e => e.id === b.id));
          const nextTwoBadges = notEarnedBadges.slice(0, 2);
          if (nextTwoBadges.length === 0) return null;
          return (
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('stats.nextBadges')}</p>
              <div className="space-y-2">
                {nextTwoBadges.map(badge => (
                  <div
                    key={badge.id}
                    className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 flex items-center gap-3"
                  >
                    <span className="text-2xl grayscale opacity-50">{badge.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{getBadgeName(badge)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400">{getBadgeDescription(badge)}</p>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-400">
                      {badge.type === 'streak'
                        ? `${stats.streak}/${badge.threshold}`
                        : `${stats.totalSessions}/${badge.threshold}`
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Bouton voir plus */}
        <button
          onClick={() => setShowAllBadges(true)}
          className="w-full py-3 text-purple-600 dark:text-purple-400 font-medium text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:bg-purple-900/30 rounded-xl transition-colors"
        >
          {t('stats.seeAllBadges')} →
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('stats.recentHistory')}</h2>
        <div className="space-y-3">
          {sessionHistory.slice().reverse().slice(0, showAllHistory ? sessionHistory.length : 1).map(session => (
            <div key={session.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">{session.workoutName}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.dateAtTime', { date: formatDisplayDate(session.date), time: session.time })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditSession(session)}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 dark:bg-purple-900/30 rounded-lg transition-colors"
                    aria-label={t('common.edit')}
                  >
                    <Edit2 aria-hidden="true" className="w-4 h-4" />
                  </button>
                  <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {session.durationMinutes > 0 && (
                  <span className="text-purple-600 dark:text-purple-400 font-medium">⏱ {formatMinutes(session.durationMinutes)}</span>
                )}
                {session.free ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✎ {t('freePractice.title')}{session.category ? ` · ${translateCategory(session.category)}` : ''}
                  </span>
                ) : (
                  <>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ✓ {session.completed} {session.completed > 1 ? t('stats.exercisesCompleted') : t('stats.exerciseCompleted')}
                    </span>
                    {session.skipped > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        × {session.skipped} {session.skipped > 1 ? t('stats.exercisesSkipped') : t('stats.exerciseSkipped')}
                      </span>
                    )}
                  </>
                )}
              </div>
              {session.note && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic mt-2">{session.note}</p>
              )}
            </div>
          ))}
          {sessionHistory.length > 1 && (
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="w-full py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
            >
              {showAllHistory ? t('stats.showLess') : t('stats.showMore', { count: sessionHistory.length - 1 })}
            </button>
          )}
        </div>
      </div>

      {/* Graphiques de progression des tempos */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📈 {t('stats.tempoProgress')}</h2>

        {exercises.filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0).length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('stats.noProgress')}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {t('stats.recordTempos')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {exercises
              .filter(ex => ex.tempoHistory && ex.tempoHistory.length > 0)
              .map(exercise => {
                const history = exercise.tempoHistory;
                const minTempo = Math.min(...history.map(h => h.tempo));
                const maxTempo = Math.max(...history.map(h => h.tempo));
                const progression = history.length > 1 ? maxTempo - history[0].tempo : 0;

                return (
                  <div key={exercise.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-4">
                    <div className="mb-4">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{exerciseName(exercise)}</h3>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('stats.base')}: {exercise.baseTempo} BPM
                        </span>
                        {exercise.targetTempo > 0 && (
                          <span className={exercise.tempoHistory.at(-1).tempo >= exercise.targetTempo
                            ? 'text-green-600 dark:text-green-400 font-medium'
                            : 'text-purple-600 dark:text-purple-400'}>
                            🎯 {exercise.targetTempo} BPM
                          </span>
                        )}
                        {progression > 0 && (
                          <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            +{progression} BPM
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Graphique simple avec SVG */}
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 rounded-xl p-4">
                      <svg viewBox="0 0 300 100" className="w-full h-24">
                        {/* Grille de fond */}
                        <line x1="0" y1="80" x2="300" y2="80" stroke={isDarkMode() ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                        <line x1="0" y1="60" x2="300" y2="60" stroke={isDarkMode() ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                        <line x1="0" y1="40" x2="300" y2="40" stroke={isDarkMode() ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                        <line x1="0" y1="20" x2="300" y2="20" stroke={isDarkMode() ? '#374151' : '#e5e7eb'} strokeWidth="1" />
                        
                        {/* Ligne de base */}
                        <line 
                          x1="0" 
                          y1={100 - ((exercise.baseTempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90} 
                          x2="300" 
                          y2={100 - ((exercise.baseTempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90}
                          stroke="#9333ea" 
                          strokeWidth="1" 
                          strokeDasharray="4 4"
                          opacity="0.3"
                        />

                        {/* Points et ligne de progression */}
                        <polyline
                          points={history.map((h, i) => {
                            const x = (i / (history.length - 1 || 1)) * 280 + 10;
                            const y = 100 - ((h.tempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#9333ea"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Points */}
                        {history.map((h, i) => {
                          const x = (i / (history.length - 1 || 1)) * 280 + 10;
                          const y = 100 - ((h.tempo - minTempo + 5) / (maxTempo - minTempo + 10)) * 90;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r="5" fill="#9333ea" stroke={isDarkMode() ? '#1f2937' : '#fff'} strokeWidth="2" />
                            </g>
                          );
                        })}
                      </svg>
                      
                      {/* Légende des dates */}
                      <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDisplayDate(history[0].date)}</span>
                        {history.length > 1 && (
                          <span>{formatDisplayDate(history[history.length - 1].date)}</span>
                        )}
                      </div>
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('stats.min')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{minTempo} BPM</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('stats.max')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{maxTempo} BPM</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{t('stats.records')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{history.length}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsPage;
