import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

// Subdivisions disponibles (les noms seront traduits via la fonction t)
const SUBDIVISIONS = [
  { id: 'quarter', nameKey: 'metronome.quarters', symbol: '♩', divisor: 1 },
  { id: 'eighth', nameKey: 'metronome.eighths', symbol: '♫', divisor: 2 },
  { id: 'triplet', nameKey: 'metronome.triplets', symbol: '♬3', divisor: 3 },
  { id: 'sixteenth', nameKey: 'metronome.sixteenths', symbol: '♬♬', divisor: 4 },
];

// Groupings prédéfinis pour les mesures asymétriques
const ASYMMETRIC_GROUPINGS = {
  5: { default: [3, 2], options: [[3, 2], [2, 3]] },
  7: { default: [3, 2, 2], options: [[3, 2, 2], [2, 2, 3], [2, 3, 2]] },
  9: { default: [3, 3, 3], options: [[3, 3, 3], [2, 2, 2, 3], [3, 2, 2, 2]] },
  11: { default: [3, 3, 3, 2], options: [[3, 3, 3, 2], [3, 3, 2, 3], [2, 3, 3, 3]] },
};

// Génère un objet timeSignature à partir du numérateur et dénominateur
const buildTimeSignature = (numerator, denominator, customGrouping = null) => {
  const name = `${numerator}/${denominator}`;
  const id = name;

  // Mesures composées (x/8 où x est divisible par 3, comme 6/8, 9/8, 12/8)
  if (denominator === 8 && numerator % 3 === 0 && numerator >= 6) {
    return {
      id,
      name,
      denominator,
      beats: numerator / 3, // Nombre de temps principaux
      isCompound: true,
      compoundSubdiv: 3,
      grouping: Array(numerator / 3).fill(3),
    };
  }

  // Mesures asymétriques (5/8, 7/8, 9/8 non composé, 11/8, etc.)
  if (denominator === 8 && ASYMMETRIC_GROUPINGS[numerator]) {
    const asymmetric = ASYMMETRIC_GROUPINGS[numerator];
    return {
      id,
      name,
      denominator,
      beats: numerator,
      grouping: customGrouping || asymmetric.default,
      groupingOptions: asymmetric.options,
    };
  }

  // Mesures simples
  return {
    id,
    name,
    denominator,
    beats: numerator,
  };
};

const Metronome = ({ initialTempo = 120, compact = false, onClose, t = (key) => key }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(initialTempo);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentSubBeat, setCurrentSubBeat] = useState(0);
  const [subdivision, setSubdivision] = useState(SUBDIVISIONS[0]);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [beatUnit, setBeatUnit] = useState(4);
  const [customGrouping, setCustomGrouping] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);

  // Auto-tempo (changement automatique de tempo)
  const [autoTempoEnabled, setAutoTempoEnabled] = useState(false);
  const [autoTempoChange, setAutoTempoChange] = useState(5); // +5 BPM par défaut
  const [autoTempoInterval, setAutoTempoInterval] = useState(30); // toutes les 30 secondes
  const [autoTempoMin, setAutoTempoMin] = useState(60);
  const [autoTempoMax, setAutoTempoMax] = useState(200);

  // Générer la signature rythmique à partir des sélections
  const timeSignature = buildTimeSignature(beatsPerMeasure, beatUnit, customGrouping);

  const audioContextRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef(null);
  const currentBeatRef = useRef(0);
  const currentSubBeatRef = useRef(0);
  const autoTempoTimerRef = useRef(null);

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

    // BPM = noire (quarter note) comme référence universelle
    // Pour les autres dénominateurs: noteDuration = quarterDuration × (4 / denominator)
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
        // Mesures simples: durée du temps selon le dénominateur
        // Formule: noteDuration = quarterNoteDuration × (4 / denominator)
        // /1 = 4 noires, /2 = 2 noires, /4 = 1 noire, /8 = 0.5 noire
        const secondsPerBeat = secondsPerQuarter * (4 / timeSignature.denominator);
        nextInterval = secondsPerBeat / subdivision.divisor;
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
      if (autoTempoTimerRef.current) {
        clearInterval(autoTempoTimerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Auto-tempo: changement automatique du tempo
  useEffect(() => {
    if (isPlaying && autoTempoEnabled) {
      autoTempoTimerRef.current = setInterval(() => {
        setTempo(prevTempo => {
          const newTempo = prevTempo + autoTempoChange;
          // Respecter les limites min/max
          if (autoTempoChange > 0) {
            return Math.min(newTempo, autoTempoMax);
          } else {
            return Math.max(newTempo, autoTempoMin);
          }
        });
      }, autoTempoInterval * 1000);
    } else {
      if (autoTempoTimerRef.current) {
        clearInterval(autoTempoTimerRef.current);
        autoTempoTimerRef.current = null;
      }
    }

    return () => {
      if (autoTempoTimerRef.current) {
        clearInterval(autoTempoTimerRef.current);
        autoTempoTimerRef.current = null;
      }
    };
  }, [isPlaying, autoTempoEnabled, autoTempoChange, autoTempoInterval, autoTempoMin, autoTempoMax]);

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
            <span className="text-lg">🎵</span> {t('metronome.title')}
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
            {isPlaying ? t('metronome.stop') : t('metronome.start')}
          </button>

          <select
            value={subdivision.id}
            onChange={(e) => setSubdivision(SUBDIVISIONS.find(s => s.id === e.target.value))}
            className="px-3 py-3 border-2 border-indigo-300 rounded-xl text-sm bg-white font-medium"
          >
            {SUBDIVISIONS.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.symbol} {t(sub.nameKey)}</option>
            ))}
          </select>

          {/* Sélecteur de signature: numérateur / dénominateur */}
          <div className="flex items-center gap-1 bg-white border-2 border-indigo-300 rounded-xl px-2 py-1">
            <select
              value={beatsPerMeasure}
              onChange={(e) => {
                setBeatsPerMeasure(parseInt(e.target.value));
                setCustomGrouping(null);
                currentBeatRef.current = 0;
                setCurrentBeat(0);
              }}
              className="bg-transparent font-bold text-lg text-center focus:outline-none"
            >
              {Array.from({length: 32}, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-lg font-bold text-gray-400">/</span>
            <select
              value={beatUnit}
              onChange={(e) => {
                setBeatUnit(parseInt(e.target.value));
                setCustomGrouping(null);
                currentBeatRef.current = 0;
                setCurrentBeat(0);
              }}
              className="bg-transparent font-bold text-lg text-center focus:outline-none"
            >
              {[1, 2, 4, 8, 16, 32].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sélecteur de grouping compact */}
        {timeSignature.groupingOptions && (
          <div className="flex gap-1 mt-3">
            {timeSignature.groupingOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCustomGrouping(option);
                  currentBeatRef.current = 0;
                  setCurrentBeat(0);
                }}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  JSON.stringify(timeSignature.grouping) === JSON.stringify(option)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                {option.join('+')}
              </button>
            ))}
          </div>
        )}

        {/* Auto-tempo compact */}
        <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-green-800">{t('metronome.autoTempo')}</span>
              {autoTempoEnabled && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  {autoTempoChange > 0 ? '+' : ''}{autoTempoChange} / {autoTempoInterval}s
                </span>
              )}
            </div>
            <button
              onClick={() => setAutoTempoEnabled(!autoTempoEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                autoTempoEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  autoTempoEnabled ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {autoTempoEnabled && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <select
                value={autoTempoChange}
                onChange={(e) => setAutoTempoChange(parseInt(e.target.value))}
                className="px-2 py-1 border border-green-300 rounded-lg text-xs bg-white"
              >
                {[-10, -5, -2, -1, 1, 2, 5, 10].map(n => (
                  <option key={n} value={n}>{n > 0 ? `+${n}` : n} BPM</option>
                ))}
              </select>
              <span className="text-xs text-green-700">{t('metronome.every')}</span>
              <select
                value={autoTempoInterval}
                onChange={(e) => setAutoTempoInterval(parseInt(e.target.value))}
                className="px-2 py-1 border border-green-300 rounded-lg text-xs bg-white"
              >
                {[10, 15, 20, 30, 45, 60, 90, 120].map(n => (
                  <option key={n} value={n}>{n}s</option>
                ))}
              </select>
              <span className="text-xs text-green-700">{t('metronome.range')}:</span>
              <input
                type="number"
                value={autoTempoMin}
                onChange={(e) => setAutoTempoMin(Math.max(20, parseInt(e.target.value) || 20))}
                className="w-14 px-1 py-1 border border-green-300 rounded text-xs text-center bg-white"
                min="20"
                max="300"
              />
              <span className="text-xs text-green-700">-</span>
              <input
                type="number"
                value={autoTempoMax}
                onChange={(e) => setAutoTempoMax(Math.min(300, parseInt(e.target.value) || 300))}
                className="w-14 px-1 py-1 border border-green-300 rounded text-xs text-center bg-white"
                min="20"
                max="300"
              />
            </div>
          )}
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
            🎵 {t('metronome.title')}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
            >
              ✕ {t('common.close')}
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
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('metronome.timeSignature')}</label>
            <div className="flex items-center justify-center gap-2 bg-white border-2 border-indigo-300 rounded-xl px-3 py-2">
              <select
                value={beatsPerMeasure}
                onChange={(e) => {
                  setBeatsPerMeasure(parseInt(e.target.value));
                  setCustomGrouping(null);
                  currentBeatRef.current = 0;
                  setCurrentBeat(0);
                }}
                className="bg-transparent font-bold text-xl text-center focus:outline-none cursor-pointer"
              >
                {Array.from({length: 32}, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="text-xl font-bold text-gray-400">/</span>
              <select
                value={beatUnit}
                onChange={(e) => {
                  setBeatUnit(parseInt(e.target.value));
                  setCustomGrouping(null);
                  currentBeatRef.current = 0;
                  setCurrentBeat(0);
                }}
                className="bg-transparent font-bold text-xl text-center focus:outline-none cursor-pointer"
              >
                {[1, 2, 4, 8, 16, 32].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('metronome.subdivision')}</label>
            <select
              value={subdivision.id}
              onChange={(e) => setSubdivision(SUBDIVISIONS.find(s => s.id === e.target.value))}
              className="w-full px-3 py-2.5 border-2 border-purple-300 rounded-xl text-sm bg-white font-medium"
            >
              {SUBDIVISIONS.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.symbol} {t(sub.nameKey)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sélecteur de grouping pour signatures asymétriques */}
        {timeSignature.groupingOptions && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('metronome.grouping')}</label>
            <div className="flex gap-2">
              {timeSignature.groupingOptions.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCustomGrouping(option);
                    currentBeatRef.current = 0;
                    setCurrentBeat(0);
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                    JSON.stringify(timeSignature.grouping) === JSON.stringify(option)
                      ? 'bg-indigo-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.join('+')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auto-tempo: changement automatique de tempo */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-green-800">{t('metronome.autoTempo')}</label>
            <button
              onClick={() => setAutoTempoEnabled(!autoTempoEnabled)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                autoTempoEnabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  autoTempoEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {autoTempoEnabled && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <select
                  value={autoTempoChange}
                  onChange={(e) => setAutoTempoChange(parseInt(e.target.value))}
                  className="flex-1 px-2 py-1.5 border border-green-300 rounded-lg text-sm bg-white"
                >
                  {[-10, -5, -2, -1, 1, 2, 5, 10].map(n => (
                    <option key={n} value={n}>{n > 0 ? `+${n}` : n} BPM</option>
                  ))}
                </select>
                <span className="text-xs text-green-700">{t('metronome.every')}</span>
                <select
                  value={autoTempoInterval}
                  onChange={(e) => setAutoTempoInterval(parseInt(e.target.value))}
                  className="flex-1 px-2 py-1.5 border border-green-300 rounded-lg text-sm bg-white"
                >
                  {[10, 15, 20, 30, 45, 60, 90, 120].map(n => (
                    <option key={n} value={n}>{n}s</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-700">
                <span>{t('metronome.range')}:</span>
                <input
                  type="number"
                  value={autoTempoMin}
                  onChange={(e) => setAutoTempoMin(Math.max(20, parseInt(e.target.value) || 20))}
                  className="w-16 px-1 py-0.5 border border-green-300 rounded text-center bg-white"
                  min="20"
                  max="300"
                />
                <span>-</span>
                <input
                  type="number"
                  value={autoTempoMax}
                  onChange={(e) => setAutoTempoMax(Math.min(300, parseInt(e.target.value) || 300))}
                  className="w-16 px-1 py-0.5 border border-green-300 rounded text-center bg-white"
                  min="20"
                  max="300"
                />
                <span>BPM</span>
              </div>
            </div>
          )}
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
