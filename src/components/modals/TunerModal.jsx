import { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Minus, Plus, Volume2, Square } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTuner } from '../../hooks/useTuner';
import { DEFAULT_TUNER_SETTINGS } from '../../constants/appData';
import {
  IN_TUNE_CENTS, LETTER_NOTE_NAMES, LETTER_NOTE_NAMES_FLAT, MAX_A4, MIN_A4, TRANSPOSITIONS,
  frequencyToNote, midiToFrequency, noteLabel, transposeNote
} from '../../utils/pitch';

// Couleur selon la justesse
const accuracyColor = (cents) => {
  const gap = Math.abs(cents);
  if (gap <= IN_TUNE_CENTS) return { text: 'text-green-600 dark:text-green-400', stroke: '#16a34a' };
  if (gap <= 15) return { text: 'text-amber-500 dark:text-amber-400', stroke: '#f59e0b' };
  return { text: 'text-red-500 dark:text-red-400', stroke: '#ef4444' };
};

// Aiguille de -50 à +50 cents sur un arc de 120°
const Gauge = ({ cents }) => {
  const angle = cents === null ? 0 : Math.max(-50, Math.min(50, cents)) * 1.2;
  const color = cents === null ? '#9ca3af' : accuracyColor(cents).stroke;
  const ticks = [-50, -25, -10, 0, 10, 25, 50];
  const point = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [100 + radius * Math.cos(rad), 110 + radius * Math.sin(rad)];
  };

  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-xs mx-auto" aria-hidden="true">
      {/* Zone juste */}
      <path
        d={`M ${point(-IN_TUNE_CENTS * 1.2, 90).join(' ')} A 90 90 0 0 1 ${point(IN_TUNE_CENTS * 1.2, 90).join(' ')}`}
        stroke="#bbf7d0" strokeWidth="14" fill="none"
      />
      <path d={`M ${point(-60, 90).join(' ')} A 90 90 0 0 1 ${point(60, 90).join(' ')}`} stroke="currentColor" className="text-gray-200 dark:text-gray-600" strokeWidth="2" fill="none" />
      {ticks.map(value => {
        const [x1, y1] = point(value * 1.2, value === 0 ? 72 : 80);
        const [x2, y2] = point(value * 1.2, 96);
        return <line key={value} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" className="text-gray-400 dark:text-gray-500" strokeWidth={value === 0 ? 3 : 1.5} />;
      })}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 110px', transition: 'transform 120ms ease-out' }}>
        <line x1="100" y1="110" x2="100" y2="28" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="110" r="6" fill={color} />
    </svg>
  );
};

const TunerModal = () => {
  const { setSettings, setShowTuner, settings, t } = useApp();
  const { status, frequency, level, start, stop } = useTuner();
  const tuner = { ...DEFAULT_TUNER_SETTINGS, ...settings.tuner };
  const updateTuner = (changes) => setSettings(prev => ({ ...prev, tuner: { ...DEFAULT_TUNER_SETTINGS, ...prev.tuner, ...changes } }));

  // Nom des notes : celui de la langue (Do Ré Mi, C D E, ... H en allemand) ou les lettres
  // Altérations en dièses (Do♯, Ré♯...) ou en bémols (Ré♭, Mi♭...)
  const flats = tuner.accidentals === 'flats';
  const languageNames = t(flats ? 'tuner.noteNamesFlat' : 'tuner.noteNames');
  const useLetters = tuner.notation === 'letters' || !Array.isArray(languageNames);
  const names = useLetters ? (flats ? LETTER_NOTE_NAMES_FLAT : LETTER_NOTE_NAMES) : languageNames;
  const octaveOffset = useLetters ? 0 : (parseInt(t('tuner.octaveOffset'), 10) || 0);
  const label = (note) => {
    const { name, octave } = noteLabel(note, names, octaveOffset);
    return `${name}${octave}`;
  };

  const sounding = frequency ? frequencyToNote(frequency, tuner.a4) : null;
  const written = sounding ? transposeNote(sounding, tuner.transposition) : null;
  const cents = sounding ? sounding.cents : null;
  const writtenLabel = written ? noteLabel(written, names, octaveOffset) : null;
  const formatHz = (value) => value.toLocaleString(settings.language || 'en', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // Son de référence : La à la fréquence choisie
  const [playingReference, setPlayingReference] = useState(false);
  const reference = useRef(null);
  const stopReference = () => {
    if (reference.current) {
      reference.current.oscillator.stop();
      reference.current.audioContext.close().catch(() => {});
      reference.current = null;
    }
    setPlayingReference(false);
  };
  const toggleReference = () => {
    if (reference.current) {
      stopReference();
      return;
    }
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = midiToFrequency(69, tuner.a4);
    gain.gain.value = 0.2;
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    reference.current = { audioContext, oscillator };
    setPlayingReference(true);
  };
  // Le son suit le réglage du La, et s'arrête à la fermeture
  useEffect(() => {
    if (reference.current) reference.current.oscillator.frequency.value = midiToFrequency(69, tuner.a4);
  }, [tuner.a4]);
  useEffect(() => () => {
    if (reference.current) {
      reference.current.oscillator.stop();
      reference.current.audioContext.close().catch(() => {});
    }
  }, []);

  const close = () => {
    stop();
    stopReference();
    setShowTuner(false);
  };

  const selectClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm';
  const errorMessage = { denied: t('tuner.denied'), unavailable: t('tuner.unavailable'), error: t('tuner.error') }[status];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div
        className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tuner-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-5 flex items-center justify-between">
          <h2 id="tuner-title" className="text-xl font-bold">{t('tuner.title')}</h2>
          <button onClick={close} aria-label={t('common.close')} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X aria-hidden="true" className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {status === 'listening' ? (
            <div className="text-center">
              {/* Note écrite (note réelle pour les instruments en Ut) */}
              <div className="h-24 flex items-end justify-center">
                {writtenLabel ? (
                  <p className={`font-bold leading-none ${accuracyColor(cents).text}`}>
                    <span className="text-7xl">{writtenLabel.name}</span>
                    <span className="text-3xl">{writtenLabel.octave}</span>
                  </p>
                ) : (
                  <p className="text-lg text-gray-400 dark:text-gray-500 pb-6">{t('tuner.listening')}</p>
                )}
              </div>

              <Gauge cents={cents} />

              {/* Niveau du micro : le trait marque le seuil à partir duquel la note est analysée */}
              <div className="mx-auto max-w-[12rem] mb-2" aria-hidden="true">
                <div className="relative h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ${level >= 1 ? 'bg-green-500' : 'bg-gray-400'}`}
                    style={{ width: `${Math.min(100, level * 50)}%` }}
                  />
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-500 dark:bg-gray-300" />
                </div>
              </div>
              {!writtenLabel && level > 0.3 && level < 1 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">{t('tuner.tooQuiet')}</p>
              )}

              <p className={`text-lg font-bold h-7 ${cents === null ? '' : accuracyColor(cents).text}`}>
                {cents === null ? '' : Math.abs(cents) <= IN_TUNE_CENTS
                  ? t('tuner.inTune')
                  : `${cents > 0 ? t('tuner.tooHigh') : t('tuner.tooLow')} (${cents > 0 ? '+' : ''}${cents} ${t('tuner.centsUnit')})`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 h-5">
                {sounding && (tuner.transposition !== 'C'
                  ? t('tuner.soundingNote', { note: label(sounding), frequency: formatHz(frequency) })
                  : `${formatHz(frequency)} Hz`)}
              </p>

              <button
                onClick={stop}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
              >
                <MicOff aria-hidden="true" className="w-4 h-4" />
                {t('tuner.stop')}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <button
                onClick={start}
                disabled={status === 'starting'}
                className="w-full inline-flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-lg shadow-lg disabled:opacity-60"
              >
                <Mic aria-hidden="true" className="w-6 h-6" />
                {t('tuner.start')}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('tuner.privacyHint')}</p>
              {errorMessage && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl p-3">{errorMessage}</p>
              )}
            </div>
          )}

          {/* Réglages */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <span id="tuner-a4-label" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tuner.reference')}</span>
              <div className="flex items-center gap-2" role="group" aria-labelledby="tuner-a4-label">
                <button
                  onClick={() => updateTuner({ a4: Math.max(MIN_A4, tuner.a4 - 1) })}
                  aria-label={t('tuner.referenceDown')}
                  className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  <Minus aria-hidden="true" className="w-4 h-4" />
                </button>
                <span className="w-20 text-center font-bold text-gray-900 dark:text-gray-100 tabular-nums">{tuner.a4} Hz</span>
                <button
                  onClick={() => updateTuner({ a4: Math.min(MAX_A4, tuner.a4 + 1) })}
                  aria-label={t('tuner.referenceUp')}
                  className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  <Plus aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="tuner-transposition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('tuner.transposition')}</label>
              <select
                id="tuner-transposition"
                value={tuner.transposition}
                onChange={(e) => updateTuner({ transposition: e.target.value })}
                className={selectClass}
              >
                {Object.keys(TRANSPOSITIONS).map(key => (
                  <option key={key} value={key}>{t(`tuner.transpositions.${key}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tuner-notation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('tuner.notation')}</label>
              <select
                id="tuner-notation"
                value={tuner.notation}
                onChange={(e) => updateTuner({ notation: e.target.value })}
                className={selectClass}
              >
                <option value="auto">{t('tuner.notationLanguage', { example: Array.isArray(languageNames) ? [0, 2, 4].map(i => languageNames[i]).join(', ') : 'C, D, E' })}</option>
                <option value="letters">{t('tuner.notationLetters')}</option>
              </select>
            </div>

            <div>
              <label htmlFor="tuner-accidentals" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('tuner.accidentals')}</label>
              <select
                id="tuner-accidentals"
                value={tuner.accidentals}
                onChange={(e) => updateTuner({ accidentals: e.target.value })}
                className={selectClass}
              >
                <option value="sharps">{t('tuner.accidentalsSharps')}</option>
                <option value="flats">{t('tuner.accidentalsFlats')}</option>
              </select>
            </div>

            <button
              onClick={toggleReference}
              aria-pressed={playingReference}
              className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl font-medium border-2 ${
                playingReference
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {playingReference ? <Square aria-hidden="true" className="w-4 h-4" /> : <Volume2 aria-hidden="true" className="w-4 h-4" />}
              {playingReference
                ? t('tuner.stopReference')
                : t('tuner.playReference', { note: label({ pitchClass: 9, octave: 4 }), frequency: tuner.a4 })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TunerModal;
