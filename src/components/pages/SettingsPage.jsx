import { Trash2, ChevronRight, Bell, Download, Upload } from 'lucide-react';
import { availableLanguages } from '../../locales';
import { clearAppStorage } from '../../hooks/useIndexedDB';
import { useApp } from '../../context/AppContext';

const SettingsPage = () => {
  const {
    handleExportData, handleImportData, isNativePlatform, nativeAppInfo, notificationPermission,
    requestNotificationPermission, sendTestNotification, setOnboardingStep, setSettings,
    setShowPrivacyPolicy, settings, t
  } = useApp();

  return (
    <div className="p-6 space-y-6 max-w-md sm:max-w-lg md:max-w-2xl landscape:max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 space-y-6">
        <div>
          <label htmlFor="settings-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.yourName')}</label>
          <input
            id="settings-name"
            type="text"
            value={settings.userName}
            onChange={(e) => setSettings({...settings, userName: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
          />
        </div>

        <div>
          <label htmlFor="settings-long-term-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🎯 {t('settings.longTermGoal')}</label>
          <input
            id="settings-long-term-goal"
            type="text"
            value={settings.longTermGoal || ''}
            onChange={(e) => setSettings({...settings, longTermGoal: e.target.value})}
            placeholder={t('settings.longTermGoalPlaceholder')}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        <div>
          <label htmlFor="weekly-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">⏱️ {t('settings.weeklyGoal')}</label>
          <div className="flex items-center gap-2">
            <input
              id="weekly-goal"
              type="number"
              inputMode="numeric"
              min="0"
              max="10080"
              step="15"
              value={settings.weeklyGoalMinutes || ''}
              onChange={(e) => setSettings({ ...settings, weeklyGoalMinutes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              placeholder="120"
              className="w-28 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center"
            />
            <span className="text-gray-600 dark:text-gray-400">min</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.weeklyGoalHint')}</p>
        </div>

        <div>
          <label htmlFor="settings-cycle-start" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">📅 {t('settings.cycleStartDate')}</label>
          <input
            id="settings-cycle-start"
            type="date"
            value={settings.cycleStartDate || ''}
            onChange={(e) => setSettings({...settings, cycleStartDate: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('settings.cycleStartDateHint')}</p>
        </div>

        <div>
          <label htmlFor="settings-language" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.language')}</label>
          <select
            id="settings-language"
            value={settings.language || 'en'}
            onChange={(e) => setSettings({...settings, language: e.target.value})}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800"
          >
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('settings.theme')}</label>
          <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
            {['auto', 'light', 'dark'].map(mode => (
              <button
                key={mode}
                onClick={() => setSettings({...settings, theme: mode})}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  settings.theme === mode
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {mode === 'auto' ? t('settings.themeAuto') : mode === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="settings-reminder-time" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('settings.dailyReminder')}</label>
            <button
              onClick={() => setSettings({...settings, reminderEnabled: !settings.reminderEnabled})}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.reminderEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div className={`w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${
                settings.reminderEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          <input
            id="settings-reminder-time"
            type="time"
            value={settings.practiceReminder}
            onChange={(e) => setSettings({...settings, practiceReminder: e.target.value})}
            disabled={!settings.reminderEnabled}
            className={`w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 ${
              !settings.reminderEnabled ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : ''
            }`}
          />
          {settings.reminderEnabled && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.reminderTime')}
            </p>
          )}
        </div>

        {/* Section Notifications - Uniquement sur app native */}
        {isNativePlatform ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{t('settings.notifications')}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {notificationPermission === 'granted' ? `✅ ${t('settings.allowed')}` :
                   notificationPermission === 'denied' ? `❌ ${t('settings.blocked')}` :
                   `⚠️ ${t('settings.notConfigured')}`}
                </span>
              </div>
              <button
                onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.notifications ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div className={`w-5 h-5 bg-white dark:bg-gray-800 rounded-full shadow-md transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Bouton pour activer les permissions */}
            {notificationPermission !== 'granted' && (
              <button
                onClick={requestNotificationPermission}
                className="w-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 py-3 rounded-xl font-medium hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors flex items-center justify-center gap-2"
              >
                <Bell aria-hidden="true" className="w-5 h-5" />
                {t('settings.enableNotifications')}
              </button>
            )}

            {/* Bouton de test si permissions accordées */}
            {notificationPermission === 'granted' && settings.notifications && (
              <button
                onClick={sendTestNotification}
                className="w-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 py-2 rounded-xl font-medium hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors text-sm"
              >
                📢 {t('settings.testNotifications')}
              </button>
            )}

            {/* Info si notifications désactivées */}
            {notificationPermission === 'granted' && !settings.notifications && (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  ℹ️ {t('settings.notificationsOff')}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Message pour la version desktop/iOS */
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  {t('settings.mobileOnly')}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('settings.mobileOnlyDesc')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Son du Métronome */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <img src="/metronome.svg" alt="" aria-hidden="true" className="w-5 h-5" style={{filter: 'invert(27%) sepia(95%) saturate(4925%) hue-rotate(258deg) brightness(87%) contrast(97%)'}} />
          {t('settings.metronomeSound')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'click', icon: '🔔', label: t('settings.sounds.click') },
            { id: 'claves', icon: '🥢', label: t('settings.sounds.claves') },
            { id: 'woodblock', icon: '🪵', label: t('settings.sounds.woodblock') },
            { id: 'cowbell', icon: '🔔', label: t('settings.sounds.cowbell') },
            { id: 'hihat', icon: '🥏', label: t('settings.sounds.hihat') },
            { id: 'rimshot', icon: '🥁', label: t('settings.sounds.rimshot') },
          ].map(sound => (
            <button
              key={sound.id}
              onClick={() => setSettings({...settings, metronomeSound: sound.id})}
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                settings.metronomeSound === sound.id
                  ? 'border-purple-500 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:border-purple-600'
              }`}
            >
              <span className="text-xl">{sound.icon}</span>
              <span className="text-sm font-medium">{sound.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section Sauvegarde et Restauration */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('settings.dataBackup')}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.exportDescription')}
        </p>
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full bg-purple-600 text-white py-3 rounded-xl font-medium hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            <Download aria-hidden="true" className="w-5 h-5" />
            {t('settings.exportData')}
          </button>
          <label className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <Upload aria-hidden="true" className="w-5 h-5" />
            {t('settings.importBackup')}
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
          </label>
        </div>
        <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-3">
          <p className="text-xs text-blue-800">
            💡 {t('settings.autoSaveInfo')}
          </p>
        </div>
      </div>

      {/* À propos */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">{t('settings.about')}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-600 dark:text-gray-400">{t('settings.version')}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{__APP_VERSION__}</span>
          </div>
          {/* Le code web embarqué ne correspond pas à l'app installée : build/sync oublié */}
          {nativeAppInfo?.version && nativeAppInfo.version !== __APP_VERSION__ && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-xl p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300">
                ⚠️ {t('settings.versionMismatch', { web: __APP_VERSION__, native: nativeAppInfo.version })}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="w-full flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              {t('settings.privacyPolicy')}
            </span>
            <ChevronRight aria-hidden="true" className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 px-1">{t('settings.licenses')}</p>
          <button
            onClick={() => { setSettings(prev => ({ ...prev, onboardingDone: false })); setOnboardingStep(0); }}
            className="w-full flex items-center justify-between py-3 px-4 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-xl transition-colors"
          >
            <span className="text-purple-700 dark:text-purple-300 font-medium">
              {t('settings.restartTutorial')}
            </span>
            <ChevronRight aria-hidden="true" className="w-5 h-5 text-purple-400 dark:text-purple-500" />
          </button>
        </div>
      </div>

      {/* Zone de réinitialisation */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 border-2 border-red-200 dark:border-red-700">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-4">{t('settings.resetApp')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('settings.resetWarning')}
        </p>
        <button
          onClick={async () => {
            if (window.confirm(t('settings.resetConfirm'))) {
              if (window.confirm(t('settings.resetFinalConfirm'))) {
                await clearAppStorage();
                window.location.reload();
              }
            }
          }}
          className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
        >
          <Trash2 aria-hidden="true" className="w-5 h-5" />
          {t('settings.resetApp')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
