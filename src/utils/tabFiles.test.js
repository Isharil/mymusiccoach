import { describe, it, expect, vi } from 'vitest';
import {
  ATTACHMENT_ACCEPT, ATTACHMENT_EXTENSIONS, dataUrlToBytes, formatPlaybackTime, hasExtension, isTabFile, pickerAccept, SCORE_EXTENSIONS, TAB_FILE_ACCEPT,
} from './tabFiles';

const native = vi.hoisted(() => ({ value: false }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.value } }));

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

  it('reconnaît les pièces jointes acceptées', () => {
    for (const name of ['score.PDF', 'photo.jpeg', 'song.gp5', 'score.musicxml', 'backing.mp3']) {
      expect(hasExtension(name, ATTACHMENT_EXTENSIONS), name).toBe(true);
    }
    for (const name of ['notes.txt', 'video.mp4', 'pdf', '']) {
      expect(hasExtension(name, ATTACHMENT_EXTENSIONS), name).toBe(false);
    }
    // Partition d'un morceau : pas d'audio (champ à part)
    expect(hasExtension('song.gp5', SCORE_EXTENSIONS)).toBe(true);
    expect(hasExtension('backing.mp3', SCORE_EXTENSIONS)).toBe(false);
  });

  it("ne filtre pas le sélecteur de fichiers dans l'app Android (Guitar Pro y serait grisé)", () => {
    native.value = false;
    expect(pickerAccept(ATTACHMENT_ACCEPT)).toBe(ATTACHMENT_ACCEPT);
    native.value = true;
    expect(pickerAccept(ATTACHMENT_ACCEPT)).toBeUndefined();
    native.value = false;
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
