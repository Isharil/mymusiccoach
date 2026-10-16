import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PrivacyPolicyModal = () => {
  const {
    renderBold, setShowPrivacyPolicy, t
  } = useApp();

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={() => setShowPrivacyPolicy(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full max-h-[85vh] overflow-hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              🔒 {t('settings.privacyPolicy')}
            </h2>
            <button
              onClick={() => setShowPrivacyPolicy(false)}
              aria-label={t('common.close')}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X aria-hidden="true" className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <p className="text-gray-500 dark:text-gray-400 text-xs">{t('privacy.updated')}</p>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s1Title')}</h3>
          <p>{renderBold(t('privacy.s1Body'))}</p>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s2Title')}</h3>
          <p>{renderBold(t('privacy.s2Body'))}</p>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s3Title')}</h3>
          <ul className="list-disc pl-5 space-y-1">
            {[1, 2, 3, 4, 5].map(i => <li key={i}>{t(`privacy.s3Item${i}`)}</li>)}
          </ul>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s4Title')}</h3>
          <p>{renderBold(t('privacy.s4Body'))}</p>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s5Title')}</h3>
          <p>{t('privacy.s5Body')}</p>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s6Title')}</h3>
          <p>{t('privacy.s6Body')}</p>

          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('privacy.s7Title')}</h3>
          <p>{t('privacy.s7Body')} <span className="text-purple-600 dark:text-purple-400">mymusiccoach.app@gmail.com</span></p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;
