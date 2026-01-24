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
const TIME_SIGNATURES = [
  { id: '4/4', beats: 4, noteValue: 4, name: '4/4' },
  { id: '3/4', beats: 3, noteValue: 4, name: '3/4' },
  { id: '2/4', beats: 2, noteValue: 4, name: '2/4' },
  { id: '6/8', beats: 6, noteValue: 8, name: '6/8' },
  { id: '5/4', beats: 5, noteValue: 4, name: '5/4' },
  { id: '7/8', beats: 7, noteValue: 8, name: '7/8' },
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
      oscillator.frequency.value = 1000; // Temps fort - son aigu
      gainNode.gain.value = volume;
    } else if (isSubBeat) {
      oscillator.frequency.value = 600; // Subdivision - son moyen plus doux
      gainNode.gain.value = volume * 0.4;
    } else {
      oscillator.frequency.value = 800; // Temps faible - son moyen
      gainNode.gain.value = volume * 0.7;
    }

    oscillator.type = 'sine';

    const now = audioContext.currentTime;
    oscillator.start(now);

    // Envelope pour un son de click court
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    oscillator.stop(now + 0.05);
  }, [isMuted, volume, getAudioContext]);

  // Scheduler pour le timing précis
  const scheduler = useCallback(() => {
    const audioContext = getAudioContext();
    const secondsPerBeat = 60.0 / tempo;
    const secondsPerSubBeat = secondsPerBeat / subdivision.divisor;

    while (nextNoteTimeRef.current < audioContext.currentTime + 0.1) {
      const beat = currentBeatRef.current;
      const subBeat = currentSubBeatRef.current;

      const isDownbeat = beat === 0 && subBeat === 0;
      const isMainBeat = subBeat === 0;
      const isSubBeat = subBeat > 0;

      // Jouer le son
      if (isMainBeat) {
        playClick(isDownbeat, false);
      } else {
        playClick(false, true);
      }

      // Mettre à jour l'affichage
      setCurrentBeat(beat);
      setCurrentSubBeat(subBeat);

      // Avancer au prochain sub-beat
      currentSubBeatRef.current++;
      if (currentSubBeatRef.current >= subdivision.divisor) {
        currentSubBeatRef.current = 0;
        currentBeatRef.current++;
        if (currentBeatRef.current >= timeSignature.beats) {
          currentBeatRef.current = 0;
        }
      }

      nextNoteTimeRef.current += secondsPerSubBeat;
    }
  }, [tempo, subdivision, timeSignature, playClick, getAudioContext]);

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
  const handleTempoChange = (e) => {
    const value = parseInt(e.target.value) || 60;
    setTempo(Math.min(300, Math.max(20, value)));
  };

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
          {Array.from({ length: timeSignature.beats }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-75 ${
                isPlaying && currentBeat === i
                  ? i === 0
                    ? 'bg-red-500 scale-125 shadow-lg shadow-red-300'
                    : 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Contrôles compacts */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`p-3 rounded-xl font-bold shadow-lg transition-all ${
              isPlaying
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={tempo}
                onChange={handleTempoChange}
                className="w-16 px-2 py-1 text-center font-bold text-lg border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                min="20"
                max="300"
              />
              <span className="text-sm text-gray-600">BPM</span>
            </div>
          </div>

          <select
            value={subdivision.id}
            onChange={(e) => setSubdivision(SUBDIVISIONS.find(s => s.id === e.target.value))}
            className="px-2 py-1 border-2 border-indigo-300 rounded-lg text-sm bg-white"
          >
            {SUBDIVISIONS.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.symbol}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  // Version complète pour outil séparé
  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🎵</span> Métronome
          </h2>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-sm">
              ✕ Fermer
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Indicateur de beat visuel - Grand */}
        <div className="flex justify-center gap-3">
          {Array.from({ length: timeSignature.beats }).map((_, i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-75 ${
                isPlaying && currentBeat === i
                  ? i === 0
                    ? 'bg-red-500 text-white scale-125 shadow-xl shadow-red-300'
                    : 'bg-indigo-500 text-white scale-110 shadow-xl shadow-indigo-300'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Affichage du tempo actuel */}
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-900">{tempo}</div>
          <div className="text-gray-500">BPM</div>
        </div>

        {/* Bouton Play/Pause principal */}
        <div className="flex justify-center">
          <button
            onClick={togglePlay}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 ${
              isPlaying
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
            }`}
          >
            {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
          </button>
        </div>

        {/* Contrôle du tempo */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Tempo</label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTempo(Math.max(20, tempo - 5))}
              className="w-12 h-12 bg-gray-200 rounded-xl font-bold text-xl hover:bg-gray-300 transition-colors"
            >
              -5
            </button>
            <input
              type="range"
              min="20"
              max="300"
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value))}
              className="flex-1 h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <button
              onClick={() => setTempo(Math.min(300, tempo + 5))}
              className="w-12 h-12 bg-gray-200 rounded-xl font-bold text-xl hover:bg-gray-300 transition-colors"
            >
              +5
            </button>
          </div>
          <div className="flex justify-center">
            <input
              type="number"
              value={tempo}
              onChange={handleTempoChange}
              className="w-24 px-4 py-2 text-center font-bold text-xl border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              min="20"
              max="300"
            />
          </div>
        </div>

        {/* Signature rythmique */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Signature rythmique</label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SIGNATURES.map(ts => (
              <button
                key={ts.id}
                onClick={() => {
                  setTimeSignature(ts);
                  if (currentBeatRef.current >= ts.beats) {
                    currentBeatRef.current = 0;
                    setCurrentBeat(0);
                  }
                }}
                className={`py-3 rounded-xl font-bold text-lg transition-all ${
                  timeSignature.id === ts.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {ts.name}
              </button>
            ))}
          </div>
        </div>

        {/* Subdivisions */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">Subdivision</label>
          <div className="grid grid-cols-4 gap-2">
            {SUBDIVISIONS.map(sub => (
              <button
                key={sub.id}
                onClick={() => setSubdivision(sub)}
                className={`py-3 rounded-xl font-bold transition-all ${
                  subdivision.id === sub.id
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-lg">{sub.symbol}</div>
                <div className="text-xs opacity-75">{sub.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Volume</label>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-2 rounded-lg transition-colors ${
                isMuted ? 'bg-gray-200 text-gray-500' : 'bg-indigo-100 text-indigo-600'
              }`}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            disabled={isMuted}
            className={`w-full h-3 rounded-lg appearance-none cursor-pointer ${
              isMuted ? 'bg-gray-200' : 'bg-gray-200 accent-indigo-600'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default Metronome;
