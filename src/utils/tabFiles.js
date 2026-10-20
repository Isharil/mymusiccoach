// Fichiers de tablature et de partition lisibles par le lecteur (alphaTab).

// Guitar Pro 3 à 7, et MusicXML
export const TAB_FILE_EXTENSIONS = ['gp3', 'gp4', 'gp5', 'gpx', 'gp', 'musicxml', 'xml'];
export const TAB_FILE_ACCEPT = TAB_FILE_EXTENSIONS.map(ext => `.${ext}`).join(',');

/** Le fichier peut-il être ouvert dans le lecteur de tablatures ? */
export const isTabFile = (name = '') => {
  const extension = name.toLowerCase().split('.').pop();
  return name.includes('.') && TAB_FILE_EXTENSIONS.includes(extension);
};

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
