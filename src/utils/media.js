// Fichiers audio et vidéos YouTube, pour jouer avec un enregistrement pendant la pratique.

// Formats lus par le navigateur (Android et ordinateur)
export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'oga', 'opus', 'wav', 'flac'];
export const AUDIO_ACCEPT = AUDIO_EXTENSIONS.map(ext => `.${ext}`).join(',');

// Taille maximale d'un fichier audio (un MP3 de 5 minutes fait environ 5 à 10 Mo)
export const MAX_AUDIO_MB = 20;
export const MAX_AUDIO_SIZE = MAX_AUDIO_MB * 1024 * 1024;

export const isAudioFile = (name = '') => {
  const extension = name.toLowerCase().split('.').pop();
  return name.includes('.') && AUDIO_EXTENSIONS.includes(extension);
};

const YOUTUBE_ID = /^[\w-]{11}$/;

// "1m30s", "90s" ou "90" -> 90
const parseStartTime = (value) => {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Number(value);
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
};

/**
 * Vidéo YouTube d'un lien (watch, youtu.be, shorts, embed, live, music.youtube.com).
 * @returns {{ id: string, start: number } | null} start : début en secondes (paramètre t=)
 */
export const parseYouTubeUrl = (url = '') => {
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;
  if (host === 'youtu.be') {
    id = parsed.pathname.split('/')[1];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, section, value] = parsed.pathname.split('/');
    id = section === 'watch' ? parsed.searchParams.get('v')
      : ['shorts', 'embed', 'live', 'v'].includes(section) ? value
      : null;
  }
  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { id, start: parseStartTime(parsed.searchParams.get('t') || parsed.searchParams.get('start')) };
};

/** Type MIME d'une URL data: ("data:audio/mpeg;base64,..." -> "audio/mpeg") */
export const dataUrlMimeType = (dataUrl = '') => dataUrl.match(/^data:([^;,]*)/)?.[1] || '';

// Vitesses proposées pour jouer avec un enregistrement
export const PRACTICE_SPEEDS = [0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];

// Boucle A-B (positions en secondes)
export const NO_LOOP = { start: null, end: null };

export const isLoopActive = (loop) => loop.start != null && loop.end != null;

/**
 * Pose A (début) ou B (fin) à la position actuelle. La boucle joue dès que B est posé.
 * @returns {{ start: number | null, end: number | null }} nouvelle boucle
 */
export const setLoopPoint = (loop, point, position) => {
  if (point === 'start') {
    return { start: position, end: loop.end != null && loop.end > position ? loop.end : null };
  }
  const start = loop.start ?? 0;
  // B avant A ou trop proche : ignoré
  return position > start + 0.2 ? { start, end: position } : loop;
};
