import { Download, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';

const ExportChoiceModal = () => {
  const {
    exportModalData, saveToDownloads, setExportModalData, shareFile, t
  } = useApp();
  useBackHandler(() => setExportModalData(null));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl" role="dialog" aria-modal="true">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-5">
          <h2 className="text-white font-bold text-lg">{t('export.title')}</h2>
          <p className="text-purple-200 text-sm mt-1">{exportModalData.fileName}</p>
        </div>

        <div className="p-5 space-y-3">
          <button
            onClick={() => saveToDownloads(exportModalData.content, exportModalData.fileName)}
            className="w-full flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/40 dark:bg-green-900/40 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Download aria-hidden="true" className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 dark:text-gray-100">{t('export.download')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('export.saveToDownloads')}</p>
            </div>
          </button>

          <button
            onClick={() => shareFile(exportModalData.content, exportModalData.fileName)}
            className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors"
          >
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <Upload aria-hidden="true" className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 dark:text-gray-100">{t('export.share')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('export.shareDesc')}</p>
            </div>
          </button>

          <button
            onClick={() => setExportModalData(null)}
            className="w-full p-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 dark:text-gray-300 font-medium"
          >
            {t('export.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportChoiceModal;
