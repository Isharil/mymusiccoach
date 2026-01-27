import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

// Subdivisions disponibles
const SUBDIVISIONS = [
  { id: 'quarter', name: 'Noires', symbol: '♩', divisor: 1 },
  { id: 'eighth', name: 'Croches', symbol: '♫', divisor: 2 },
  { id: 'triplet', name: 'Triolets', symbol: '♬3', divisor: 3 },
  { id: 'sixteenth', name: 'Doubles', symbol: '♬♬', divisor: 4 },
];

// Signatures rythmiques courantes
// Pour les mesures composées (6/8, 12/8), beats = nombre de temps principaux
// Pour les mesures asymétriques (7/8, 5/8), grouping définit les accents
const TIME_SIGNATURES = [
  { id: '1/4', beats: 1, name: '1/4' },
  { id: '2/4', beats: 2, name: '2/4' },
  { id: '3/4', beats: 3, name: '3/4' },
  { id: '4/4', beats: 4, name: '4/4' },
  { id: '5/4', beats: 5, name: '5/4' },
  { id: '5/8', beats: 5, name: '5/8', grouping: [3, 2] }, // 3+2
  { id: '6/8', beats: 2, name: '6/8', grouping: [3, 3] }, // 2 temps, chacun divisé en 3
  { id: '7/8', beats: 7, name: '7/8', grouping: [3, 2, 2] }, // 3+2+2 (ou 2+2+3 selon style)
];

const Metronome = ({ initialTempo = 120, compact = false, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(initialTempo);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubBeat, setCurrentSubBeat] = useState(0);
  const [subdivision, setSubdivision] = useState(SUBDIVISIONS[0]);
  const [timeSignature, setTimeSignature] = useState(TIME_SIGNATURES[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);

  const audioContextRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef(null);
  const currentBeatRef = useRef(0);
  const currentSubBeatRef = useRef(0);

  // Créer l'AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Générer un son de click
  const playClick = useCallback((isDownbeat, isSubBeat) => {
    if (isMuted) return;

    const audioContext = getAudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Fréquences différentes pour temps fort, temps faible, et subdivisions
    if (isDownbeat) {
      oscillator.frequency.value = 1200; // Temps fort (beat 1) - son aigu
      gainNode.gain.value = volume;
    } else if (isSubBeat) {
      oscillator.frequency.value = 800; // Subdivision - son moyen
      gainNode.gain.value = volume * 0.5;
    } else {
      oscillator.frequency.value = 1000; // Accent secondaire - son moyen-aigu
      gainNode.gain.value = volume * 0.8;
    }

    oscillator.type = 'sine';

    const now = audioContext.currentTime;
    oscillator.start(now);

    // Envelope pour un son de click court
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    oscillator.stop(now + 0.05);
  }, [isMuted, volume, getAudioContext]);

  // Calculer le nombre total de subdivisions pour la mesure
  const getTotalSubdivisions = useCallback(() => {
    if (timeSignature.isCompound) {
      // Pour 6/8: 2 temps principaux, chacun divisé naturellement en 3 croches
      const totalEighths = timeSignature.beats * timeSignature.compoundSubdiv; // = 6 pour 6/8
      if (subdivision.divisor === 1) {
        // "Noires" = seulement les temps principaux (2 pour 6/8)
        return timeSignature.beats;
      } else {
        // "Croches" = toutes les croches (6 pour 6/8)
        // "Doubles" = 2 par croche (12 pour 6/8)
        const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
        return totalEighths * subMultiplier;
      }
    } else if (timeSignature.grouping) {
      // Pour 7/8, 5/8 avec mesures asymétriques
      const totalEighths = timeSignature.grouping.reduce((a, b) => a + b, 0);
      if (subdivision.divisor === 1) {
        // "Noires" = seulement les temps de groupe (3 pour 7/8)
        return timeSignature.grouping.length;
      } else {
        // "Croches" et au-delà = toutes les croches × subdivision
        // divisor 2 = croches (7 pour 7/8)
        // divisor 4 = doubles (14 pour 7/8)
        const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
        return totalEighths * subMultiplier;
      }
    }
    // Pour mesures simples: beats × subdivision
    return timeSignature.beats * subdivision.divisor;
  }, [timeSignature, subdivision]);

  // Pour mesures asymétriques: obtenir la durée du groupe actuel (en croches)
  const getCurrentGroupSize = useCallback((groupIndex) => {
    if (!timeSignature.grouping) return 1;
    return timeSignature.grouping[groupIndex % timeSignature.grouping.length];
  }, [timeSignature]);

  // Vérifier si une position est un temps fort (début de groupe)
  const isAccentBeat = useCallback((position) => {
    if (timeSignature.grouping) {
      if (subdivision.divisor === 1) {
        // Mode "Noires" pour asymétrique: chaque position est un accent
        return true;
      }
      // Pour "Croches" et au-delà: accent au début de chaque groupe
      const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
      let accumulatedPosition = 0;
      for (const groupSize of timeSignature.grouping) {
        if (position === accumulatedPosition * subMultiplier) return true;
        accumulatedPosition += groupSize;
      }
      return false;
    }
    if (timeSignature.isCompound) {
      if (subdivision.divisor === 1) {
        // "Noires": chaque position est un temps principal
        return true;
      }
      // Pour "Croches" et au-delà: accent au début de chaque groupe de temps
      const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
      const subdivsPerBeat = timeSignature.compoundSubdiv * subMultiplier;
      return position % subdivsPerBeat === 0;
    }
    // Pour mesures simples: accent sur chaque temps
    return position % subdivision.divisor === 0;
  }, [timeSignature, subdivision]);

  // Scheduler pour le timing précis
  const scheduler = useCallback(() => {
    const audioContext = getAudioContext();
    const totalSubdivs = getTotalSubdivisions();

    // BPM = noire pour toutes les signatures
    const secondsPerQuarter = 60.0 / tempo;
    const secondsPerEighth = secondsPerQuarter / 2; // Croche = moitié de la noire

    while (nextNoteTimeRef.current < audioContext.currentTime + 0.1) {
      const position = currentBeatRef.current;
      const isDownbeat = position === 0;
      const isAccent = isAccentBeat(position);

      // Jouer le son
      if (isAccent) {
        playClick(isDownbeat, false);
      } else {
        playClick(false, true);
      }

      // Mettre à jour l'affichage
      setCurrentBeat(position);

      // Calculer l'intervalle jusqu'au prochain clic
      let nextInterval;
      if (timeSignature.isCompound) {
        // Pour 6/8: BPM = noire
        if (subdivision.divisor === 1) {
          // "Noires": intervalle = noire pointée = 1.5 × noire
          nextInterval = secondsPerQuarter * 1.5;
        } else {
          // "Croches" et au-delà: intervalle basé sur la croche
          const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
          nextInterval = secondsPerEighth / subMultiplier;
        }
      } else if (timeSignature.grouping) {
        // Pour 7/8, 5/8: BPM = noire, croche = moitié
        if (subdivision.divisor === 1) {
          // "Noires" pour asymétrique: intervalle = taille du groupe × durée d'une croche
          const groupSize = getCurrentGroupSize(position);
          nextInterval = groupSize * secondsPerEighth;
        } else {
          // "Croches" et au-delà: intervalle régulier basé sur la croche
          const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
          nextInterval = secondsPerEighth / subMultiplier;
        }
      } else {
        // Mesures simples: BPM = noire
        nextInterval = secondsPerQuarter / subdivision.divisor;
      }

      // Avancer à la prochaine position
      currentBeatRef.current++;
      if (currentBeatRef.current >= totalSubdivs) {
        currentBeatRef.current = 0;
      }

      nextNoteTimeRef.current += nextInterval;
    }
  }, [tempo, subdivision, timeSignature, playClick, getAudioContext, getTotalSubdivisions, isAccentBeat, getCurrentGroupSize]);

  // Démarrer/Arrêter le métronome
  const togglePlay = useCallback(() => {
    const audioContext = getAudioContext();

    if (isPlaying) {
      // Arrêter
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      setIsPlaying(false);
      setCurrentBeat(0);
      setCurrentSubBeat(0);
      currentBeatRef.current = 0;
      currentSubBeatRef.current = 0;
    } else {
      // Démarrer
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      nextNoteTimeRef.current = audioContext.currentTime;
      currentBeatRef.current = 0;
      currentSubBeatRef.current = 0;
      timerIdRef.current = setInterval(scheduler, 25);
      setIsPlaying(true);
    }
  }, [isPlaying, scheduler, getAudioContext]);

  // Mettre à jour le scheduler quand les paramètres changent
  useEffect(() => {
    if (isPlaying && timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = setInterval(scheduler, 25);
    }
  }, [tempo, subdivision, timeSignature, scheduler, isPlaying]);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Gestion du tempo via input
  const [tempoInput, setTempoInput] = useState(String(tempo));

  // Synchroniser tempoInput quand tempo change (via slider ou boutons)
  useEffect(() => {
    setTempoInput(String(tempo));
  }, [tempo]);

  const handleTempoInputChange = (e) => {
    // Permet la saisie libre sans validation immédiate
    setTempoInput(e.target.value);
  };

  const handleTempoInputBlur = () => {
    // Applique la validation quand l'utilisateur termine la saisie
    const value = parseInt(tempoInput) || 60;
    const clampedValue = Math.min(300, Math.max(20, value));
    setTempo(clampedValue);
    setTempoInput(String(clampedValue));
  };

  // Obtenir les indicateurs visuels pour la signature actuelle
  const getVisualBeats = useCallback(() => {
    if (timeSignature.grouping) {
      // Pour 7/8, 5/8: afficher les groupes (ex: 3+2+2 pour 7/8)
      return timeSignature.grouping.map((size, idx) => ({
        index: idx,
        size,
        label: idx === 0 ? '1' : String(timeSignature.grouping.slice(0, idx).reduce((a, b) => a + b, 0) + 1)
      }));
    }
    if (timeSignature.isCompound) {
      // Pour 6/8: afficher les groupes (ex: 3+3 pour 6/8)
      return Array.from({ length: timeSignature.beats }, (_, i) => ({
        index: i,
        size: timeSignature.compoundSubdiv,
        label: String(i * timeSignature.compoundSubdiv + 1)
      }));
    }
    // Pour mesures simples: afficher le nombre de temps principaux
    return Array.from({ length: timeSignature.beats }, (_, i) => ({
      index: i,
      size: 1,
      label: String(i + 1)
    }));
  }, [timeSignature]);

  // Déterminer quel indicateur visuel est actif
  const getActiveVisualBeat = useCallback(() => {
    if (timeSignature.grouping) {
      if (subdivision.divisor === 1) {
        // "Noires": currentBeat correspond directement au groupe
        return currentBeat % timeSignature.grouping.length;
      }
      // "Croches" et au-delà: trouver le groupe actif
      const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
      let accumulatedPosition = 0;
      for (let i = 0; i < timeSignature.grouping.length; i++) {
        const groupSize = timeSignature.grouping[i];
        const groupEnd = (accumulatedPosition + groupSize) * subMultiplier;
        if (currentBeat < groupEnd) {
          return i;
        }
        accumulatedPosition += groupSize;
      }
      return 0;
    }
    if (timeSignature.isCompound) {
      if (subdivision.divisor === 1) {
        // "Noires": currentBeat correspond directement au temps
        return currentBeat % timeSignature.beats;
      }
      // Pour "Croches" et au-delà: quel temps principal est actif
      const subMultiplier = subdivision.divisor === 2 ? 1 : subdivision.divisor / 2;
      const subdivsPerBeat = timeSignature.compoundSubdiv * subMultiplier;
      return Math.floor(currentBeat / subdivsPerBeat);
    }
    // Pour mesures simples
    return Math.floor(currentBeat / subdivision.divisor);
  }, [timeSignature, subdivision, currentBeat]);

  // Version compacte pour intégration dans exercice
  if (compact) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border-2 border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-indigo-900 flex items-center gap-2">
            <span className="text-lg">🎵</span> Métronome
          </h4>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition-colors ${isMuted ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-indigo-600'}`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Indicateur de beat visuel */}
        <div className="flex justify-center gap-2 mb-4">
          {getVisualBeats().map((beat, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-75 flex items-center justify-center text-xs font-bold ${
                (timeSignature.grouping || timeSignature.isCompound) ? 'px-2 py-1' : 'w-6 h-6'
              } ${
                isPlaying && getActiveVisualBeat() === i
                  ? i === 0
                    ? 'bg-red-500 text-white scale-125 shadow-lg shadow-red-300'
                    : 'bg-indigo-500 text-white scale-110 shadow-lg shadow-indigo-300'
                  : 'bg-gray-300 text-gray-500'
              }`}
            >
              {(timeSignature.grouping || timeSignature.isCompound) ? beat.size : beat.label}
            </div>
          ))}
          {timeSignature.grouping && (
            <span className="text-xs text-gray-400 ml-1">({timeSignature.name})</span>
          )}
        </div>

        {/* Contrôle du tempo avec boutons -5/+5 */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => setTempo(Math.max(20, tempo - 5))}
            className="w-10 h-10 bg-white border-2 border-indigo-300 rounded-xl font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
          >
            -5
          </button>
          <div className="flex items-center gap-1 bg-white border-2 border-indigo-300 rounded-xl px-3 py-2 shadow-sm">
            <input
              type="number"
              value={tempoInput}
              onChange={handleTempoInputChange}
              onBlur={handleTempoInputBlur}
              className="w-14 text-center font-bold text-xl text-indigo-900 bg-transparent focus:outline-none"
              min="20"
              max="300"
            />
            <span className="text-sm text-gray-500">BPM</span>
          </div>
          <button
            onClick={() => setTempo(Math.min(300, tempo + 5))}
            className="w-10 h-10 bg-white border-2 border-indigo-300 rounded-xl font-bold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm"
          >
            +5
          </button>
        </div>

        {/* Contrôles play et options */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
              isPlaying
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            {isPlaying ? 'Stop' : 'Démarrer'}
          </button>

          <select
            value={subdivision.id}
            onChange={(e) => setSubdivision(SUBDIVISIONS.find(s => s.id === e.target.value))}
            className="px-3 py-3 border-2 border-indigo-300 rounded-xl text-sm bg-white font-medium"
          >
            {SUBDIVISIONS.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.symbol} {sub.name}</option>
            ))}
          </select>

          <select
            value={timeSignature.id}
            onChange={(e) => {
              const ts = TIME_SIGNATURES.find(t => t.id === e.target.value);
              setTimeSignature(ts);
              currentBeatRef.current = 0;
              setCurrentBeat(0);
            }}
            className="px-3 py-3 border-2 border-indigo-300 rounded-xl text-sm bg-white font-medium"
          >
            {TIME_SIGNATURES.map(ts => (
              <option key={ts.id} value={ts.id}>{ts.name}{ts.grouping ? ` (${ts.grouping.join('+')})` : ts.displayGrouping ? ` (${ts.displayGrouping})` : ''}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Version complète pour outil séparé (optimisée mobile)
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-[85vh] flex flex-col">
      {/* Header compact */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            🎵 Métronome
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
            >
              ✕ Fermer
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Indicateur de beat visuel */}
        <div className="flex justify-center items-center gap-2">
          {getVisualBeats().map((beat, i) => (
            <div
              key={i}
              className={`rounded-full flex items-center justify-center font-bold transition-all duration-75 ${
                (timeSignature.grouping || timeSignature.isCompound) ? 'px-3 py-1.5 text-base' : 'w-10 h-10 text-lg'
              } ${
                isPlaying && getActiveVisualBeat() === i
                  ? i === 0
                    ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-300'
                    : 'bg-indigo-500 text-white scale-105 shadow-lg shadow-indigo-300'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {(timeSignature.grouping || timeSignature.isCompound) ? beat.size : beat.label}
            </div>
          ))}
          {timeSignature.grouping && (
            <span className="text-xs text-gray-400 ml-1">({timeSignature.name})</span>
          )}
        </div>

        {/* Tempo + Play en ligne */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setTempo(Math.max(20, tempo - 5))}
            className="w-10 h-10 bg-gray-200 rounded-xl font-bold text-lg hover:bg-gray-300 transition-colors"
          >
            -5
          </button>

          <div className="text-center">
            <input
              type="number"
              value={tempoInput}
              onChange={handleTempoInputChange}
              onBlur={handleTempoInputBlur}
              className="w-20 text-4xl font-bold text-gray-900 text-center bg-transparent border-b-2 border-transparent focus:border-indigo-500 focus:outline-none"
              min="20"
              max="300"
            />
            <div className="text-xs text-gray-500">BPM</div>
          </div>

          <button
            onClick={() => setTempo(Math.min(300, tempo + 5))}
            className="w-10 h-10 bg-gray-200 rounded-xl font-bold text-lg hover:bg-gray-300 transition-colors"
          >
            +5
          </button>

          <button
            onClick={togglePlay}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>
        </div>

        {/* Slider tempo */}
        <input
          type="range"
          min="20"
          max="300"
          value={tempo}
          onChange={(e) => setTempo(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />

        {/* Signature + Subdivision en grille compacte */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Signature</label>
            <select
              value={timeSignature.id}
              onChange={(e) => {
                const ts = TIME_SIGNATURES.find(t => t.id === e.target.value);
                setTimeSignature(ts);
                currentBeatRef.current = 0;
                setCurrentBeat(0);
              }}
              className="w-full px-3 py-2.5 border-2 border-indigo-300 rounded-xl text-sm bg-white font-medium"
            >
              {TIME_SIGNATURES.map(ts => (
                <option key={ts.id} value={ts.id}>
                  {ts.name}{ts.grouping ? ` (${ts.grouping.join('+')})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Subdivision</label>
            <select
              value={subdivision.id}
              onChange={(e) => setSubdivision(SUBDIVISIONS.find(s => s.id === e.target.value))}
              className="w-full px-3 py-2.5 border-2 border-purple-300 rounded-xl text-sm bg-white font-medium"
            >
              {SUBDIVISIONS.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.symbol} {sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Volume compact */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              isMuted ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-indigo-600'
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={isMuted}
            className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${
              isMuted ? 'bg-gray-200' : 'bg-gray-200 accent-indigo-600'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default Metronome;
