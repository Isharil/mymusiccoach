import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, FolderOpen, Pause, Play, Repeat, SkipBack, Timer, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { dataUrlToBytes, formatPlaybackTime, TAB_FILE_ACCEPT } from '../utils/tabFiles';

// Vitesses de lecture proposées
const SPEEDS = [0.5, 0.6, 0.75, 0.9, 1, 1.25];

/**
 * Lecteur de tablatures Guitar Pro (GP3 à GP7) et MusicXML, basé sur alphaTab (MPL-2.0).
 * alphaTab n'est chargé qu'à l'ouverture du lecteur.
 * @param {{ name: string, data?: string, bytes?: Uint8Array } | null} file - null : choisir un fichier
 */
const TabPlayer = ({ file, onClose }) => {
  const { t } = useApp();
  const scrollRef = useRef(null);
  const sheetRef = useRef(null);
  const apiRef = useRef(null);
  const fileInputRef = useRef(null);

  const [source, setSource] = useState(file);
  const [status, setStatus] = useState(file ? 'loading' : 'empty'); // empty | loading | ready | error
  const [scoreInfo, setScoreInfo] = useState(null); // { title, artist, tracks: [noms] }
  const [trackIndex, setTrackIndex] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState({ current: 0, end: 0 });
  const [speed, setSpeed] = useState(1);
  const [looping, setLooping] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  const [showScore, setShowScore] = useState(false); // partition en plus de la tablature

  // Création du lecteur et chargement du fichier
  useEffect(() => {
    if (!source) return undefined;
    let cancelled = false;
    setStatus('loading');
    setPlayerReady(false);
    setPlaying(false);
    setScoreInfo(null);
    setHasSelection(false);

    (async () => {
      try {
        const alphaTab = await import('@coderline/alphatab');
        if (cancelled || !sheetRef.current) return;
        const assets = new URL('alphatab/', document.baseURI).href;
        const api = new alphaTab.AlphaTabApi(sheetRef.current, {
          core: { fontDirectory: `${assets}font/`, logLevel: 'warning' },
          display: { staveProfile: 'tab', scale: 0.9 },
          player: {
            playerMode: 'enabledSynthesizer',
            soundFont: `${assets}soundfont/sonivox.sf3`,
            scrollElement: scrollRef.current,
            enableCursor: true,
            enableAnimatedBeatCursor: true,
            enableUserInteraction: true,
          },
        });
        apiRef.current = api;

        api.scoreLoaded.on(score => {
          setScoreInfo({
            title: score.title,
            artist: score.artist,
            tracks: score.tracks.map((track, i) => track.name || t('tabPlayer.trackNumber', { number: i + 1 })),
          });
          setTrackIndex(0);
        });
        api.renderFinished.on(() => setStatus('ready'));
        api.playerReady.on(() => setPlayerReady(true));
        api.playerStateChanged.on(e => setPlaying(e.state === alphaTab.synth.PlayerState.Playing));
        // Temps affiché à la seconde près (évite de redessiner à chaque événement)
        api.playerPositionChanged.on(e => setPosition(prev => (
          Math.floor(prev.current / 1000) === Math.floor(e.currentTime / 1000) && prev.end === e.endTime
            ? prev
            : { current: e.currentTime, end: e.endTime }
        )));
        api.playbackRangeHighlightChanged.on(e => setHasSelection(Boolean(e.startBeat && e.endBeat)));
        api.error.on(error => {
          console.error('Lecteur de tablatures :', error);
          setStatus('error');
        });

        const bytes = source.bytes ?? dataUrlToBytes(source.data);
        api.load(bytes, [0]);
      } catch (error) {
        console.error('Lecteur de tablatures :', error);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, [source, t]);

  // Réglages transmis au lecteur
  const withApi = (action) => {
    if (apiRef.current) action(apiRef.current);
  };
  const changeSpeed = (value) => { setSpeed(value); withApi(api => { api.playbackSpeed = value; }); };
  const toggleLoop = () => { const value = !looping; setLooping(value); withApi(api => { api.isLooping = value; }); };
  const toggleMetronome = () => { const value = !metronome; setMetronome(value); withApi(api => { api.metronomeVolume = value ? 1 : 0; }); };
  const toggleCountIn = () => { const value = !countIn; setCountIn(value); withApi(api => { api.countInVolume = value ? 1 : 0; }); };
  const clearSelection = () => {
    withApi(api => { api.clearPlaybackRangeHighlight(); api.playbackRange = null; });
    setHasSelection(false);
  };
  const toggleScore = () => {
    const value = !showScore;
    setShowScore(value);
    withApi(api => {
      api.settings.display.staveProfile = value ? 'scoretab' : 'tab';
      api.updateSettings();
      api.render();
    });
  };
  const changeTrack = (index) => {
    setTrackIndex(index);
    withApi(api => { if (api.score) api.renderTracks([api.score.tracks[index]]); });
  };

  const openLocalFile = (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    chosen.arrayBuffer().then(buffer => setSource({ name: chosen.name, bytes: new Uint8Array(buffer) }));
  };

  const title = scoreInfo?.title || source?.name || t('tabPlayer.title');
  const toggleClass = (active) => `flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-medium ${
    active ? 'bg-purple-600 text-white' : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700'
  }`;

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col" role="dialog" aria-modal="true" aria-labelledby="tab-player-title">
      {/* En-tête */}
      <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-4 py-3 flex items-center gap-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button onClick={onClose} aria-label={t('common.close')} className="p-2 -ml-2 hover:bg-white/20 rounded-lg">
          <ArrowLeft aria-hidden="true" className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 id="tab-player-title" className="font-bold truncate">{title}</h2>
          {scoreInfo?.artist && <p className="text-xs text-white/80 truncate">{scoreInfo.artist}</p>}
        </div>
        <button onClick={() => fileInputRef.current?.click()} aria-label={t('tabPlayer.openFile')} className="p-2 hover:bg-white/20 rounded-lg">
          <FolderOpen aria-hidden="true" className="w-5 h-5" />
        </button>
        <input ref={fileInputRef} type="file" accept={TAB_FILE_ACCEPT} onChange={openLocalFile} className="hidden" aria-label={t('tabPlayer.chooseFile')} />
      </div>

      {/* Tablature (fond blanc, comme une partition imprimée) */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-white relative">
        {status === 'empty' && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-4">
            <p className="text-gray-600">{t('tabPlayer.emptyHint')}</p>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 text-white font-bold">
              <FolderOpen aria-hidden="true" className="w-5 h-5" />
              {t('tabPlayer.chooseFile')}
            </button>
            <p className="text-xs text-gray-400">{t('tabPlayer.formats')}</p>
          </div>
        )}
        {status === 'loading' && (
          <p role="status" className="absolute inset-x-0 top-8 text-center text-gray-500">{t('tabPlayer.loading')}</p>
        )}
        {status === 'error' && (
          <div role="alert" className="m-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm">{t('tabPlayer.loadError')}</div>
        )}
        <div ref={sheetRef} className={status === 'empty' ? 'hidden' : 'px-2 py-4'} />
      </div>

      {/* Commandes */}
      {source && status !== 'error' && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 pt-3 space-y-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => withApi(api => api.playPause())}
              disabled={!playerReady}
              aria-label={playing ? t('tabPlayer.pause') : t('tabPlayer.play')}
              className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center disabled:opacity-40"
            >
              {playing ? <Pause aria-hidden="true" className="w-6 h-6" /> : <Play aria-hidden="true" className="w-6 h-6 ml-0.5" />}
            </button>
            <button
              onClick={() => withApi(api => api.stop())}
              disabled={!playerReady}
              aria-label={t('tabPlayer.backToStart')}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center disabled:opacity-40"
            >
              <SkipBack aria-hidden="true" className="w-5 h-5" />
            </button>
            <p className="text-sm tabular-nums text-gray-600 dark:text-gray-300 flex-1">
              {playerReady
                ? `${formatPlaybackTime(position.current)} / ${formatPlaybackTime(position.end)}`
                : t('tabPlayer.loadingSounds')}
            </p>
            <label htmlFor="tab-speed" className="sr-only">{t('tabPlayer.speed')}</label>
            <select
              id="tab-speed"
              value={speed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              className="px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-bold"
            >
              {SPEEDS.map(value => <option key={value} value={value}>{Math.round(value * 100)} %</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <button onClick={toggleLoop} aria-pressed={looping} className={toggleClass(looping)}>
              <Repeat aria-hidden="true" className="w-4 h-4" />
              {t('tabPlayer.loop')}
            </button>
            <button onClick={toggleMetronome} aria-pressed={metronome} className={toggleClass(metronome)}>
              <Timer aria-hidden="true" className="w-4 h-4" />
              {t('tabPlayer.metronome')}
            </button>
            <button onClick={toggleCountIn} aria-pressed={countIn} className={toggleClass(countIn)}>
              <span aria-hidden="true" className="text-sm leading-4 font-bold">1·2</span>
              {t('tabPlayer.countIn')}
            </button>
            <button onClick={toggleScore} aria-pressed={showScore} className={toggleClass(showScore)}>
              <span aria-hidden="true" className="text-sm leading-4">♪</span>
              {t('tabPlayer.score')}
            </button>
            {scoreInfo?.tracks.length > 1 && (
              <>
                <label htmlFor="tab-track" className="sr-only">{t('tabPlayer.track')}</label>
                <select
                  id="tab-track"
                  value={trackIndex}
                  onChange={(e) => changeTrack(Number(e.target.value))}
                  className="min-w-0 max-w-[10rem] px-2 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                >
                  {scoreInfo.tracks.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>
              </>
            )}
          </div>

          {(looping || hasSelection) && (
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
              <p>{hasSelection ? t('tabPlayer.selectionActive') : t('tabPlayer.selectionHint')}</p>
              {hasSelection && (
                <button onClick={clearSelection} className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium flex-shrink-0">
                  <X aria-hidden="true" className="w-3.5 h-3.5" />
                  {t('tabPlayer.clearSelection')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TabPlayer;
