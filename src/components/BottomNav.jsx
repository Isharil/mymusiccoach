import { Home, Book, BarChart3, Settings } from 'lucide-react';
import { useApp } from '../context/AppContext';

const BottomNav = () => {
  const {
    activeTab, setActiveTab, setActiveWorkout, setSelectedExercise, t
  } = useApp();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 pt-3 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto z-40" style={{paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)'}}>
    <div className="flex justify-around">
      <button
        onClick={() => { setActiveTab('home'); setActiveWorkout(null); setSelectedExercise(null); }}
        aria-current={activeTab === 'home' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'home' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <Home aria-hidden="true" className="w-6 h-6" />
        <span className="text-xs font-medium">{t('nav.home')}</span>
      </button>
      <button
        onClick={() => { setActiveTab('library'); setActiveWorkout(null); setSelectedExercise(null); }}
        aria-current={activeTab === 'library' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'library' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <Book aria-hidden="true" className="w-6 h-6" />
        <span className="text-xs font-medium">{t('nav.exercises')}</span>
      </button>
      <button
        onClick={() => { setActiveTab('stats'); setActiveWorkout(null); setSelectedExercise(null); }}
        aria-current={activeTab === 'stats' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'stats' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <BarChart3 aria-hidden="true" className="w-6 h-6" />
        <span className="text-xs font-medium">{t('nav.stats')}</span>
      </button>
      <button
        onClick={() => { setActiveTab('settings'); setActiveWorkout(null); setSelectedExercise(null); }}
        aria-current={activeTab === 'settings' ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'settings' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <Settings aria-hidden="true" className="w-6 h-6" />
        <span className="text-xs font-medium">{t('nav.settings')}</span>
      </button>
    </div>
  </div>
  );
};

export default BottomNav;
