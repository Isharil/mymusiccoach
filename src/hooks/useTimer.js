import { useState, useEffect, useRef, useCallback } from 'react';
import { parseDuration } from '../utils/exercises';

// Chronomètre d'exercice basé sur l'heure de fin (résiste à la mise en veille), avec Wake Lock
export const useTimer = () => {
  const [timerActive, setTimerActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerFinished, setTimerFinished] = useState(false); // Notification de fin de chrono

  // Refs pour le chrono basé sur timestamps (résistant à la mise en veille)
  const timerEndTimeRef = useRef(null);
  const timerAnimationRef = useRef(null);
  const wakeLockRef = useRef(null);
  const pausedRemainingRef = useRef(null);

  // Demander le Wake Lock pour empêcher la mise en veille
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activé');
      } catch (err) {
        console.log('Wake Lock non disponible:', err);
      }
    }
  }, []);

  // Libérer le Wake Lock
  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log('Wake Lock libéré');
    }
  }, []);

  // Jouer un son de notification de fin de chrono
  const playTimerFinishedSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Jouer 3 bips courts
      const playBeep = (startTime, frequency) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.5, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      };

      const now = audioContext.currentTime;
      playBeep(now, 880);       // La5
      playBeep(now + 0.2, 880); // La5
      playBeep(now + 0.4, 1760); // La6 (plus aigu pour la fin)

      // Fermer le contexte après les sons
      setTimeout(() => audioContext.close(), 1000);
    } catch {
      console.log('Impossible de jouer le son de notification');
    }
  }, []);

  // Boucle de mise à jour du timer basée sur timestamps
  const updateTimer = useCallback(function tick() {
    if (!timerEndTimeRef.current) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));

    if (remaining <= 0) {
      // Temps écoulé - notification non-bloquante
      setTimerSeconds(0);
      setTimerActive(false);
      timerEndTimeRef.current = null;
      releaseWakeLock();

      // Afficher la notification visuelle et jouer le son
      setTimerFinished(true);
      playTimerFinishedSound();

      // Masquer la notification après 5 secondes
      setTimeout(() => setTimerFinished(false), 5000);
      return;
    }

    setTimerSeconds(remaining);
    timerAnimationRef.current = requestAnimationFrame(tick);
  }, [releaseWakeLock, playTimerFinishedSound]);

  const startTimer = useCallback((exercise) => {
    // Arrêter le timer précédent s'il existe
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
    }

    const totalSeconds = parseDuration(exercise.duration);

    // Stocker l'heure de fin (timestamp)
    timerEndTimeRef.current = Date.now() + (totalSeconds * 1000);
    setTimerSeconds(totalSeconds);
    setTimerActive(true);
    setTimerPaused(false);
    pausedRemainingRef.current = null;

    // Activer le Wake Lock pour empêcher la mise en veille
    requestWakeLock();

    // Démarrer la boucle de mise à jour
    timerAnimationRef.current = requestAnimationFrame(updateTimer);
  }, [requestWakeLock, updateTimer]);

  const pauseTimer = useCallback(() => {
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
      timerAnimationRef.current = null;
    }
    // Sauvegarder le temps restant
    if (timerEndTimeRef.current) {
      const now = Date.now();
      pausedRemainingRef.current = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
    }
    timerEndTimeRef.current = null;
    setTimerActive(false);
    setTimerPaused(true);
    releaseWakeLock();
  }, [releaseWakeLock]);

  const resumeTimer = useCallback(() => {
    if (pausedRemainingRef.current && pausedRemainingRef.current > 0) {
      // Reprendre avec le temps restant
      timerEndTimeRef.current = Date.now() + (pausedRemainingRef.current * 1000);
      setTimerActive(true);
      setTimerPaused(false);
      pausedRemainingRef.current = null;

      // Activer le Wake Lock
      requestWakeLock();

      // Démarrer la boucle de mise à jour
      timerAnimationRef.current = requestAnimationFrame(updateTimer);
    }
  }, [requestWakeLock, updateTimer]);

  const stopTimer = useCallback(() => {
    if (timerAnimationRef.current) {
      cancelAnimationFrame(timerAnimationRef.current);
      timerAnimationRef.current = null;
    }
    timerEndTimeRef.current = null;
    pausedRemainingRef.current = null;
    setTimerActive(false);
    setTimerPaused(false);
    setTimerSeconds(0);
    releaseWakeLock();
  }, [releaseWakeLock]);

  // Reprendre le timer quand l'app redevient visible (après mise en veille)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerEndTimeRef.current) {
        // Recalculer le temps restant et relancer la boucle
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));

        if (remaining <= 0) {
          setTimerSeconds(0);
          setTimerActive(false);
          timerEndTimeRef.current = null;
          releaseWakeLock();
          // Notification non-bloquante
          setTimerFinished(true);
          playTimerFinishedSound();
          setTimeout(() => setTimerFinished(false), 5000);
        } else {
          setTimerSeconds(remaining);
          // Re-demander le Wake Lock (il peut avoir été perdu)
          requestWakeLock();
          timerAnimationRef.current = requestAnimationFrame(updateTimer);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [releaseWakeLock, requestWakeLock, updateTimer]);

  // Nettoyer le timer quand on quitte la page
  useEffect(() => {
    return () => {
      if (timerAnimationRef.current) {
        cancelAnimationFrame(timerAnimationRef.current);
      }
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return { timerActive, timerPaused, timerSeconds, timerFinished, setTimerFinished, startTimer, pauseTimer, resumeTimer, stopTimer };
};
