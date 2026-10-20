// Fichiers de tablature et de partition lisibles par le lecteur (alphaTab).
import { Capacitor } from '@capacitor/core';
import { AUDIO_EXTENSIONS } from './media';

// Guitar Pro 3 à 7, et MusicXML
export const TAB_FILE_EXTENSIONS = ['gp3', 'gp4', 'gp5', 'gpx', 'gp', 'musicxml', 'xml'];
export const TAB_FILE_ACCEPT = TAB_FILE_EXTENSIONS.map(ext => `.${ext}`).join(',');

// Partition d'un morceau : PDF, images, tablatures et partitions
export const SCORE_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', ...TAB_FILE_EXTENSIONS];
export const SCORE_ACCEPT = SCORE_EXTENSIONS.map(ext => `.${ext}`).join(',');

// Fichier d'un exercice : partition ou enregistrement audio
export const ATTACHMENT_EXTENSIONS = [...SCORE_EXTENSIONS, ...AUDIO_EXTENSIONS];
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map(ext => `.${ext}`).join(',');

/** Le nom de fichier a-t-il l'une de ces extensions ? */
export const hasExtension = (name = '', extensions) => {
  const extension = name.toLowerCase().split('.').pop();
  return name.includes('.') && extensions.includes(extension);
};

/** Le fichier peut-il être ouvert dans le lecteur de tablatures ? */
export const isTabFile = (name = '') => hasExtension(name, TAB_FILE_EXTENSIONS);

/**
 * Filtre du sélecteur de fichiers. Sur Android, les extensions sont converties en types connus du
 * système : les fichiers Guitar Pro, de type inconnu, y seraient grisés. Pas de filtre dans l'app
 * Android : l'extension est vérifiée après le choix.
 */
export const pickerAccept = (accept) => (Capacitor.isNativePlatform() ? undefined : accept);

/** Contenu d'une URL data: (format des pièces jointes) sous forme d'octets */
export const dataUrlToBytes = (dataUrl) => {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('URL data: invalide');
  const meta = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);
  if (meta.endsWith(';base64')) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(payload));
};

/** 125000 ms -> "2:05" */
export const formatPlaybackTime = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};
