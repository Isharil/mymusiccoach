// Pièces jointes des exercices (PDF, images, partitions...).
//
// Chaque fichier est stocké sous sa propre clé IndexedDB (mmc_file_<id>) sous la forme
// { name, data } où data est une URL data:. L'exercice ne garde qu'une référence
// `attachment: { id, name }`, pour ne pas réécrire tous les fichiers à chaque modification
// de la liste des exercices. Les anciennes versions stockaient `fileData: { name, data }`
// directement dans l'exercice : voir moveInlineFiles.
import { get, set, del, keys } from 'idb-keyval';

const PREFIX = 'mmc_file_';

// Taille maximale d'un fichier joint (les fichiers sont gardés en mémoire et dans les sauvegardes)
export const MAX_ATTACHMENT_MB = 10;
export const MAX_ATTACHMENT_SIZE = MAX_ATTACHMENT_MB * 1024 * 1024;

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** Enregistre un fichier { name, data } et renvoie la référence à mettre dans l'exercice */
export const saveAttachment = async ({ name, data }) => {
  const id = newId();
  await set(PREFIX + id, { name, data, createdAt: Date.now() });
  return { id, name };
};

/** @returns {Promise<{ name: string, data: string } | undefined>} */
export const loadAttachment = (id) => get(PREFIX + id);

export const deleteAttachment = (id) => del(PREFIX + id);

const attachmentIds = async () =>
  (await keys()).filter(k => typeof k === 'string' && k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length));

/** Tous les fichiers, pour les sauvegardes : { id: { name, data } } */
export const exportAttachments = async () => {
  const entries = await Promise.all((await attachmentIds()).map(async id => [id, await loadAttachment(id)]));
  return Object.fromEntries(entries.filter(([, file]) => file));
};

/** Restaure les fichiers d'une sauvegarde (mêmes ids que dans les exercices restaurés) */
export const importAttachments = async (files) => {
  for (const [id, file] of Object.entries(files)) {
    await set(PREFIX + id, file);
  }
};

/** Supprime tous les fichiers (réinitialisation de l'app) */
export const deleteAllAttachments = async () => {
  for (const id of await attachmentIds()) await deleteAttachment(id);
};

/**
 * Supprime les fichiers qu'aucun exercice ne référence plus.
 * Seuls les fichiers créés avant `createdBefore` sont concernés : un fichier ajouté pendant
 * le nettoyage peut appartenir à un exercice pas encore enregistré.
 */
export const deleteOrphanAttachments = async (exerciseLists, createdBefore) => {
  const used = new Set(exerciseLists.flat().flatMap(item => [item.attachment?.id, item.audio?.id]).filter(Boolean));
  for (const id of await attachmentIds()) {
    if (used.has(id)) continue;
    const file = await loadAttachment(id);
    if (!file?.createdAt || file.createdAt < createdBefore) await deleteAttachment(id);
  }
};

/**
 * Migration : sort les fichiers stockés dans les exercices (ancien champ fileData).
 * @returns {Promise<{ changed: boolean, exercises: Array }>}
 */
export const moveInlineFiles = async (exercises) => {
  let changed = false;
  const result = [];
  for (const exercise of exercises) {
    if (exercise.fileData?.data) {
      const { fileData, ...rest } = exercise;
      result.push({ ...rest, attachment: await saveAttachment(fileData) });
      changed = true;
    } else {
      result.push(exercise);
    }
  }
  return { changed, exercises: result };
};
