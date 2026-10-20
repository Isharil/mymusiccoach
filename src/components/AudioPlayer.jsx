import { useEffect, useId, useRef, useState } from 'react';
import { Music, Pause, Play } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { dataUrlMimeType, isLoopActive, NO_LOOP } from '../utils/media';
import { dataUrlToBytes, formatPlaybackTime } from '../utils/tabFiles';
import PracticeControls from './PracticeControls';

/**
 * Lecteur d'un fichier audio joint (morceau ou exercice), pour jouer avec l'enregistrement :
 * ralenti sans changer la hauteur, boucle A-B sur un passage.
 * @param {{ name: string, data: string }} file - data : URL data:
 */
const AudioPlayer = ({ file }) => {
  const { t } = useApp();
  const idPrefix = useId();
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(NO_LOOP);
  const [failed, setFailed] = useState(false);

  // Le fichier est lu depuis une URL blob: (une URL data: de plusieurs Mo est lente à charger)
  useEffect(() => {
    const audio = audioRef.current;
    let objectUrl;
    try {
      objectUrl = URL.createObjectURL(new Blob([dataUrlToBytes(file.data)], { type: dataUrlMimeType(file.data) }));
    } catch (error) {
      console.error('Lecteur audio :', error);
      return undefined;
    }
    audio.src = objectUrl;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      URL.revokeObjectURL(objectUrl);
    };
  }, [file.data]);

  // Boucle A-B vérifiée à chaque image (l'événement timeupdate est trop espacé)
  useEffect(() => {
    if (!playing || !isLoopActive(loop)) return undefined;
    let frame;
    const check = () => {
      const audio = audioRef.current;
      if (audio && audio.currentTime >= loop.end) audio.currentTime = loop.start;
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [playing, loop]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (audio.paused) audio.play().catch(error => console.error('Lecteur audio :', error));
    else audio.pause();
  };

  const changeSpeed = (value) => {
    setSpeed(value);
    audioRef.current.playbackRate = value;
    audioRef.current.defaultPlaybackRate = value;
  };

  const changeLoop = (value) => {
    setLoop(value);
    // Boucle posée : on repart de A
    if (isLoopActive(value)) audioRef.current.currentTime = value.start;
  };

  const seek = (value) => {
    audioRef.current.currentTime = value;
    setPosition(value);
  };

  const time = (seconds) => formatPlaybackTime(seconds * 1000);

  return (
    <section aria-label={t('media.recording')} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-4 space-y-3 shadow">
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration || 0); setFailed(false); }}
        onEnded={() => {
          // Fin du fichier dans une boucle qui va jusqu'au bout : on reprend à A
          if (isLoopActive(loop)) {
            audioRef.current.currentTime = loop.start;
            audioRef.current.play().catch(() => {});
          }
        }}
        onError={(e) => { if (e.currentTarget.getAttribute('src')) setFailed(true); }}
      />
      <p className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100 min-w-0">
        <Music aria-hidden="true" className="w-4 h-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
        <span className="truncate">{file.name}</span>
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          disabled={failed}
          aria-label={playing ? t('media.pause') : t('media.play')}
          className="w-12 h-12 flex-shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow disabled:opacity-40"
        >
          {playing ? <Pause aria-hidden="true" className="w-6 h-6" /> : <Play aria-hidden="true" className="w-6 h-6 ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={Math.min(position, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={failed || !duration}
            aria-label={t('media.position')}
            className="w-full accent-indigo-600"
          />
          <p className="text-xs text-gray-600 dark:text-gray-300 tabular-nums">{time(position)} / {time(duration)}</p>
        </div>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">{t('media.audioError')}</p>
      ) : (
        <PracticeControls
          idPrefix={idPrefix}
          speed={speed}
          onSpeedChange={changeSpeed}
          loop={loop}
          onLoopChange={changeLoop}
          getPosition={() => audioRef.current?.currentTime ?? 0}
        />
      )}
    </section>
  );
};

export default AudioPlayer;
