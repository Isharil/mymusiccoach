import { FileText, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';

const ImportSessionModal = () => {
  const {
    handleImportFile, setShowImportModal, t
  } = useApp();
  useBackHandler(() => setShowImportModal(false));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md sm:max-w-lg landscape:max-w-lg w-full shadow-2xl" role="dialog" aria-modal="true">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">{t('import.title')}</h2>
            <button
              onClick={() => {
                setShowImportModal(false);
              }}
              aria-label={t('common.close')}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X aria-hidden="true" className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 text-sm">
            {t('import.subtitle')}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  {t('import.howItWorks')}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('import.explanation')}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('import.fileLabel')}
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:bg-blue-900/30 file:text-blue-700 dark:text-blue-300 hover:file:bg-blue-100"
            />
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              💡 <strong>{t('import.tipLabel')}</strong> {t('import.tip')}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={() => {
              setShowImportModal(false);
            }}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 dark:bg-gray-600 transition-colors"
          >
            {t('import.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportSessionModal;
