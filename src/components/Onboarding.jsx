import { ONBOARDING_STEPS } from '../constants/appData';
import { useApp } from '../context/AppContext';

const Onboarding = () => {
  const {
    onboardingStep, setActiveTab, setActiveWorkout, setOnboardingStep, setSelectedExercise,
    setSettings, t
  } = useApp();

  const isLastStep = onboardingStep === ONBOARDING_STEPS.length - 1;
  const titleKey = `onboarding.step${onboardingStep + 1}Title`;
  const descKey = `onboarding.step${onboardingStep + 1}Desc`;

  const finishOnboarding = () => {
    setSettings(prev => ({ ...prev, onboardingDone: true }));
    setActiveTab('home');
    setActiveWorkout(null);
    setSelectedExercise(null);
  };

  const goNext = () => {
    const nextIdx = onboardingStep + 1;
    if (nextIdx >= ONBOARDING_STEPS.length) { finishOnboarding(); return; }
    const nextTab = ONBOARDING_STEPS[nextIdx].tab;
    if (nextTab) { setActiveTab(nextTab); setActiveWorkout(null); setSelectedExercise(null); }
    setOnboardingStep(nextIdx);
  };

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Overlay léger */}
      <div className="fixed inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 pointer-events-auto bg-white dark:bg-gray-800 rounded-t-3xl px-6 pt-5 shadow-2xl mx-auto max-w-md"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)', zIndex: 201 }}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all ${i === onboardingStep ? 'w-6 bg-purple-600' : 'w-2 bg-gray-300 dark:bg-gray-600'}`} />
          ))}
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
          {t(titleKey)}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6 text-sm leading-relaxed">
          {t(descKey)}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={finishOnboarding}
            className="text-gray-400 dark:text-gray-500 text-sm px-3 py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('onboarding.skip')}
          </button>
          <button
            onClick={goNext}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-2xl transition-colors text-sm"
          >
            {onboardingStep === 0 ? t('onboarding.start') : isLastStep ? t('onboarding.finish') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
