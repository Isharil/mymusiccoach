import { useCallback, useEffect, useRef, useState } from 'react';
import { INITIAL_NOISE_FLOOR, detectPitch, median, noiseGate, rms, updateNoiseFloor } from '../utils/pitch';

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
 *   level: number,              // niveau du micro rapporté au seuil de détection (>= 1 : assez fort)
 *   start: () => Promise<void>, stop: () => void
 * }}
 */
export const useTuner = () => {
  const [status, setStatus] = useState('idle');
  const [frequency, setFrequency] = useState(null);
  const [level, setLevel] = useState(0); // niveau du micro, 1 = seuil de détection
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
    setLevel(0);
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

      // Filtrage : sous 30 Hz (souffle, manipulations) et au-dessus de 5 kHz il n'y a que du bruit
      // pour l'accordage ; le retirer aide à détecter les sons faibles
      const highPass = audioContext.createBiquadFilter();
      highPass.type = 'highpass';
      highPass.frequency.value = 30;
      const lowPass = audioContext.createBiquadFilter();
      lowPass.type = 'lowpass';
      lowPass.frequency.value = 5000;
      audioContext.createMediaStreamSource(stream).connect(highPass);
      highPass.connect(lowPass);
      lowPass.connect(analyser);

      const buffer = new Float32Array(FFT_SIZE);
      let recent = [];
      let lastHeard = 0;
      let noiseFloor = INITIAL_NOISE_FLOOR;

      const analyse = () => {
        analyser.getFloatTimeDomainData(buffer);
        const now = Date.now();

        // Seuil de silence adapté au bruit de fond de la pièce
        const currentLevel = rms(buffer);
        const gate = noiseGate(noiseFloor);
        const result = detectPitch(buffer, audioContext.sampleRate, { minRms: gate });
        if (!result) noiseFloor = updateNoiseFloor(noiseFloor, currentLevel);
        setLevel(currentLevel / gate);

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

  return { status, frequency, level, start, stop };
};
