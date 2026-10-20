import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isLoopActive, NO_LOOP, parseYouTubeUrl } from '../utils/media';
import PracticeControls from './PracticeControls';

// API YouTube pour les vidéos intégrées, chargée une seule fois et seulement si besoin
let youTubeApi = null;
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youTubeApi ??= new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      youTubeApi = null; // nouvel essai à la prochaine ouverture (connexion revenue)
      script.remove();
      reject(new Error('API YouTube indisponible'));
    };
    document.head.appendChild(script);
  });
  return youTubeApi;
};

// État « en lecture » de l'API YouTube (YT.PlayerState.PLAYING)
const PLAYING = 1;

/**
 * Vidéo YouTube intégrée, avec ralenti et boucle A-B. Lien vers YouTube si la vidéo ne peut pas
 * être lue ici (intégration refusée par la chaîne, pas de connexion).
 * @param {string} url - lien YouTube (voir parseYouTubeUrl)
 */
const YouTubePlayer = ({ url }) => {
  const { t } = useApp();
  const idPrefix = useId();
  const video = parseYouTubeUrl(url);
  const videoId = video?.id;
  const start = video?.start ?? 0;
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(NO_LOOP);

  useEffect(() => {
    const container = containerRef.current;
    if (!videoId || !container) return undefined;
    let cancelled = false;
    let player = null;

    loadYouTubeApi()
      .then(YT => {
        if (cancelled) return;
        // L'API remplace l'élément par son iframe : élément créé hors de React
        const target = document.createElement('div');
        container.appendChild(target);
        player = new YT.Player(target, {
          // Mode « confidentialité renforcée » : pas de cookie YouTube avant la lecture
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, start },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              setStatus('ready');
            },
            onError: () => { if (!cancelled) setStatus('error'); },
            onStateChange: (e) => { if (!cancelled) setPlaying(e.data === PLAYING); },
          },
        });
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => {
      cancelled = true;
      playerRef.current = null;
      player?.destroy?.();
      container.replaceChildren();
    };
  }, [videoId, start]);

  // Boucle A-B : la position de la vidéo est vérifiée 10 fois par seconde
  useEffect(() => {
    if (!playing || !isLoopActive(loop)) return undefined;
    const timer = setInterval(() => {
      const player = playerRef.current;
      if (player && player.getCurrentTime() >= loop.end) player.seekTo(loop.start, true);
    }, 100);
    return () => clearInterval(timer);
  }, [playing, loop]);

  if (!videoId) return null;

  const changeSpeed = (value) => {
    setSpeed(value);
    playerRef.current?.setPlaybackRate(value);
  };

  const changeLoop = (value) => {
    setLoop(value);
    if (isLoopActive(value)) playerRef.current?.seekTo(value.start, true);
  };

  return (
    <section aria-label={t('media.video')} className="space-y-3">
      {status === 'error' ? (
        <p role="alert" className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          {t('media.videoError')}
        </p>
      ) : (
        <div ref={containerRef} className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow [&>iframe]:w-full [&>iframe]:h-full" />
      )}
      {status !== 'error' && (
        <PracticeControls
          idPrefix={idPrefix}
          speed={speed}
          onSpeedChange={changeSpeed}
          loop={loop}
          onLoopChange={changeLoop}
          getPosition={() => playerRef.current?.getCurrentTime() ?? 0}
          disabled={status !== 'ready'}
        />
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 font-medium">
        <ExternalLink aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
        {t('media.openYoutube')}
      </a>
    </section>
  );
};

export default YouTubePlayer;
