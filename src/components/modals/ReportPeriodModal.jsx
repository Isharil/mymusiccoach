import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ReportPeriodModal = () => {
  const {
    generateProgressReport, setShowExportModal, t
  } = useApp();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={() => setShowExportModal(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">📊 {t('report.exportTitle')}</h2>
            <button
              onClick={() => setShowExportModal(false)}
              aria-label={t('common.close')}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X aria-hidden="true" className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">
            {t('report.choosePeriod')}
          </p>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={() => generateProgressReport(1)}
            className="w-full py-4 px-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/40 dark:hover:to-purple-800/40 rounded-xl font-medium text-purple-800 dark:text-purple-300 transition-all flex items-center justify-between"
          >
            <span>📅 {t('report.lastDays', { count: 7 })}</span>
            <span className="text-purple-500 text-sm">{t('report.weeks', { count: 1 })}</span>
          </button>
          <button
            onClick={() => generateProgressReport(2)}
            className="w-full py-4 px-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/40 dark:hover:to-blue-800/40 rounded-xl font-medium text-blue-800 dark:text-blue-200 transition-all flex items-center justify-between"
          >
            <span>📅 {t('report.lastDays', { count: 14 })}</span>
            <span className="text-blue-500 text-sm">{t('report.weeks', { count: 2 })}</span>
          </button>
          <button
            onClick={() => generateProgressReport(3)}
            className="w-full py-4 px-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/40 dark:hover:to-green-800/40 rounded-xl font-medium text-green-800 dark:text-green-300 transition-all flex items-center justify-between"
          >
            <span>📅 {t('report.lastDays', { count: 21 })}</span>
            <span className="text-green-500 text-sm">{t('report.weeks', { count: 3 })}</span>
          </button>
          <button
            onClick={() => generateProgressReport(4)}
            className="w-full py-4 px-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/40 dark:hover:to-orange-800/40 rounded-xl font-medium text-orange-800 dark:text-orange-300 transition-all flex items-center justify-between"
          >
            <span>📅 {t('report.lastDays', { count: 28 })}</span>
            <span className="text-orange-500 text-sm">{t('report.weeks', { count: 4 })}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPeriodModal;
