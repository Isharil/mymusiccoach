import { useEffect, useState } from 'react';
import { loadAttachment } from '../utils/attachments';

/**
 * Charge le contenu d'une pièce jointe d'exercice.
 * @param {{ id: string } | undefined} attachment - référence stockée dans l'exercice
 * @returns {{ name: string, data: string } | null} null tant que le fichier n'est pas chargé
 */
export const useAttachment = (attachment) => {
  const id = attachment?.id;
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    loadAttachment(id)
      .then(loaded => { if (active) setFile(loaded ?? null); })
      .catch(error => console.error('Erreur lecture pièce jointe:', error));
    return () => {
      active = false;
      setFile(null);
    };
  }, [id]);

  return id ? file : null;
};
