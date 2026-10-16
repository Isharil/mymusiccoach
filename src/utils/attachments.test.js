import { describe, it, expect, beforeEach } from 'vitest';
import { clear, get, keys } from 'idb-keyval';
import {
  deleteAllAttachments, deleteOrphanAttachments, exportAttachments, importAttachments,
  loadAttachment, moveInlineFiles, saveAttachment
} from './attachments';

const pdf = { name: 'score.pdf', data: 'data:application/pdf;base64,JVBERi0=' };
const fileKeys = async () => (await keys()).filter(k => String(k).startsWith('mmc_file_'));

beforeEach(() => clear());

describe('pièces jointes', () => {
  it('enregistre un fichier à part et renvoie sa référence', async () => {
    const ref = await saveAttachment(pdf);
    expect(ref).toEqual({ id: expect.any(String), name: 'score.pdf' });
    expect(await loadAttachment(ref.id)).toMatchObject(pdf);
  });

  it('sort les fichiers stockés dans les exercices (ancien format)', async () => {
    const { changed, exercises } = await moveInlineFiles([
      { id: 1, name: 'With file', fileData: pdf },
      { id: 2, name: 'Without file' },
    ]);
    expect(changed).toBe(true);
    expect(exercises[0]).not.toHaveProperty('fileData');
    expect(exercises[0].attachment.name).toBe('score.pdf');
    expect(await loadAttachment(exercises[0].attachment.id)).toMatchObject(pdf);
    expect(exercises[1]).toEqual({ id: 2, name: 'Without file' });

    expect((await moveInlineFiles(exercises)).changed).toBe(false);
  });

  it('supprime seulement les fichiers orphelins créés avant le nettoyage', async () => {
    const used = await saveAttachment(pdf);
    const orphan = await saveAttachment({ ...pdf, name: 'old.pdf' });
    const cutoff = Date.now() + 1;

    await deleteOrphanAttachments([[{ id: 1, attachment: used }], []], cutoff);
    expect(await loadAttachment(used.id)).toBeDefined();
    expect(await loadAttachment(orphan.id)).toBeUndefined();

    // Un fichier plus récent que le début du nettoyage est conservé même s'il n'est pas encore référencé
    const pending = await saveAttachment(pdf);
    await deleteOrphanAttachments([[]], cutoff - 1000);
    expect(await loadAttachment(pending.id)).toBeDefined();
  });

  it('exporte et réimporte tous les fichiers', async () => {
    const ref = await saveAttachment(pdf);
    const files = await exportAttachments();
    expect(Object.keys(files)).toEqual([ref.id]);

    await deleteAllAttachments();
    expect(await fileKeys()).toEqual([]);

    await importAttachments(files);
    expect(await get(`mmc_file_${ref.id}`)).toMatchObject(pdf);
  });
});
