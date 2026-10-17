import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitch, median } from '../utils/pitch';

// Taille de l'échantillon analysé : couvre au moins deux périodes de la note la plus grave (27,5 Hz)
const FFT_SIZE = 4096;
// Fréquence d'analyse (environ 16 fois par seconde)
const ANALYSIS_INTERVAL_MS = 60;
// Nombre de mesures lissées, et délai sans son avant d'effacer la note
const SMOOTHING_COUNT = 5;
const SILENCE_RESET_MS = 1200;

/**
 * Écoute le micro et détecte la note jouée (utils/pitch.js). L'analyse reste sur l'appareil.
 * @returns {{
 *   status: 'idle' | 'starting' | 'listening' | 'denied' | 'unavailable' | 'error',
 *   frequency: number | null,   // fréquence lissée de la note entendue, null en l'absence de son
 *   start: () => Promise<void>, stop: () => void
 * }}
 */
export const useTuner = () => {
  const [status, setStatus] = useState('idle');
  const [frequency, setFrequency] = useState(null);
  const resources = useRef(null); // { stream, audioContext, timer }

  const stop = useCallback(() => {
    const current = resources.current;
    resources.current = null;
    if (current) {
      clearInterval(current.timer);
      current.stream.getTracks().forEach(track => track.stop());
      current.audioContext.close().catch(() => {});
    }
    setFrequency(null);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (resources.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return;
    }
    setStatus('starting');

    try {
      // Son brut : les traitements du téléphone (écho, bruit, gain) faussent la hauteur
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      audioContext.createMediaStreamSource(stream).connect(analyser);

      const buffer = new Float32Array(FFT_SIZE);
      let recent = [];
      let lastHeard = 0;

      const analyse = () => {
        analyser.getFloatTimeDomainData(buffer);
        const result = detectPitch(buffer, audioContext.sampleRate);
        const now = Date.now();

        if (result) {
          // Nouvelle note (écart d'un demi-ton ou plus) : on repart de zéro pour réagir tout de suite
          const current = median(recent);
          if (current && Math.abs(1200 * Math.log2(result.frequency / current)) > 100) recent = [];
          recent = [...recent.slice(-(SMOOTHING_COUNT - 1)), result.frequency];
          lastHeard = now;
          setFrequency(median(recent));
        } else if (now - lastHeard > SILENCE_RESET_MS && recent.length > 0) {
          recent = [];
          setFrequency(null);
        }
      };

      resources.current = { stream, audioContext, timer: setInterval(analyse, ANALYSIS_INTERVAL_MS) };
      setStatus('listening');
    } catch (error) {
      console.error('Accordeur : micro indisponible', error);
      setStatus(error?.name === 'NotAllowedError' || error?.name === 'SecurityError' ? 'denied' : 'error');
    }
  }, []);

  // Arrêt quand l'app passe en arrière-plan, et à la fermeture de l'accordeur
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      stop();
    };
  }, [stop]);

  return { status, frequency, start, stop };
};
