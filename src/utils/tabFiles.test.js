import { describe, it, expect } from 'vitest';
import { dataUrlToBytes, formatPlaybackTime, isTabFile, TAB_FILE_ACCEPT } from './tabFiles';

describe('tabFiles', () => {
  it('reconnaît les fichiers Guitar Pro et MusicXML', () => {
    for (const name of ['song.gp', 'Song.GP5', 'a.gp3', 'a.gp4', 'a.gpx', 'score.musicxml', 'score.xml']) {
      expect(isTabFile(name), name).toBe(true);
    }
    for (const name of ['score.pdf', 'photo.png', 'gp5', '', 'notes.txt']) {
      expect(isTabFile(name), name).toBe(false);
    }
    expect(TAB_FILE_ACCEPT).toContain('.gp5');
  });

  it('convertit une pièce jointe (URL data:) en octets', () => {
    expect([...dataUrlToBytes('data:application/octet-stream;base64,AAEC/w==')]).toEqual([0, 1, 2, 255]);
    expect(new TextDecoder().decode(dataUrlToBytes('data:text/xml,%3Cscore%2F%3E'))).toBe('<score/>');
    expect(() => dataUrlToBytes('pas une url')).toThrow();
  });

  it('affiche une durée de lecture', () => {
    expect(formatPlaybackTime(0)).toBe('0:00');
    expect(formatPlaybackTime(125400)).toBe('2:05');
    expect(formatPlaybackTime(-5)).toBe('0:00');
  });
});
