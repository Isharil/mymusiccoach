import { describe, it, expect } from 'vitest';
import { dataUrlMimeType, isAudioFile, isLoopActive, NO_LOOP, parseYouTubeUrl, setLoopPoint } from './media';

describe('media', () => {
  it('reconnaît les fichiers audio', () => {
    for (const name of ['song.mp3', 'Take.WAV', 'a.m4a', 'a.ogg', 'a.flac', 'a.opus']) {
      expect(isAudioFile(name), name).toBe(true);
    }
    for (const name of ['song.gp5', 'score.pdf', 'mp3', '']) {
      expect(isAudioFile(name), name).toBe(false);
    }
  });

  it('lit les différents liens YouTube', () => {
    const id = 'dQw4w9WgXcQ';
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://m.youtube.com/watch?v=${id}&list=PL123`,
      `https://youtu.be/${id}`,
      `https://youtube.com/shorts/${id}`,
      `https://www.youtube.com/embed/${id}`,
      `https://music.youtube.com/watch?v=${id}`,
      `  https://youtu.be/${id}?si=abc  `,
    ]) {
      expect(parseYouTubeUrl(url), url).toEqual({ id, start: 0 });
    }
    expect(parseYouTubeUrl(`https://youtu.be/${id}?t=95`)).toEqual({ id, start: 95 });
    expect(parseYouTubeUrl(`https://www.youtube.com/watch?v=${id}&t=1m30s`)).toEqual({ id, start: 90 });
  });

  it("ignore les liens qui ne sont pas une vidéo YouTube", () => {
    for (const url of ['', 'pas un lien', 'https://vimeo.com/123', 'https://www.youtube.com/@chaine', 'https://www.youtube.com/watch?v=court']) {
      expect(parseYouTubeUrl(url), url).toBeNull();
    }
  });

  it('donne le type MIME d’une URL data:', () => {
    expect(dataUrlMimeType('data:audio/mpeg;base64,AAAA')).toBe('audio/mpeg');
    expect(dataUrlMimeType('data:;base64,AAAA')).toBe('');
    expect(dataUrlMimeType('pas une url')).toBe('');
  });

  it('pose les points A et B de la boucle', () => {
    let loop = setLoopPoint(NO_LOOP, 'start', 12);
    expect(loop).toEqual({ start: 12, end: null });
    expect(isLoopActive(loop)).toBe(false);
    // B avant A : ignoré
    expect(setLoopPoint(loop, 'end', 10)).toBe(loop);
    loop = setLoopPoint(loop, 'end', 20);
    expect(loop).toEqual({ start: 12, end: 20 });
    expect(isLoopActive(loop)).toBe(true);
    // A déplacé après B : B est retiré
    expect(setLoopPoint(loop, 'start', 25)).toEqual({ start: 25, end: null });
    expect(setLoopPoint(loop, 'start', 15)).toEqual({ start: 15, end: 20 });
    // B sans A : la boucle part du début
    expect(setLoopPoint(NO_LOOP, 'end', 8)).toEqual({ start: 0, end: 8 });
  });
});
