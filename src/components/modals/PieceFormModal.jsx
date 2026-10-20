import { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { PIECE_STATUSES } from '../../utils/repertoire';
import { AUDIO_ACCEPT, isAudioFile, MAX_AUDIO_MB, MAX_AUDIO_SIZE } from '../../utils/media';
import { pickerAccept, SCORE_ACCEPT } from '../../utils/tabFiles';

// Création ou modification d'un morceau du répertoire
const PieceFormModal = () => {
  const { editingPiece, handleFileUpload, savePiece, setEditingPiece, setUploadedFile, showToast, t, uploadedFile } = useApp();
  const editing = editingPiece?.id ? editingPiece : null;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [artist, setArtist] = useState(editing?.artist ?? '');
  const [status, setStatus] = useState(editing?.status ?? 'learning');
  const [reminder, setReminder] = useState(editing?.reminder ?? false);
  const [link, setLink] = useState(editing?.link ?? '');
  const [targetTempo, setTargetTempo] = useState(editing?.targetTempo ? String(editing.targetTempo) : '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [audioFile, setAudioFile] = useState(null); // nouvel enregistrement { name, data }
  const [removeAudio, setRemoveAudio] = useState(false);

  const inputClass = 'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

  const close = () => {
    setEditingPiece(null);
    setUploadedFile(null);
  };
  useBackHandler(close);

  const handleAudioUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!isAudioFile(file.name)) {
      showToast(t('repertoire.unsupportedAudio'), 'error');
      return;
    }
    if (file.size > MAX_AUDIO_SIZE) {
      showToast(t('messages.fileTooLarge', { max: MAX_AUDIO_MB }), 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setAudioFile({ name: file.name, data: event.target.result });
      setRemoveAudio(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast(t('exercise.fillRequired'), 'warning');
      return;
    }
    const tempo = parseInt(targetTempo, 10);
    savePiece({
      title: title.trim(),
      artist: artist.trim(),
      status,
      reminder,
      link: link.trim(),
      targetTempo: Number.isFinite(tempo) ? Math.min(300, Math.max(0, tempo)) : 0,
      notes: notes.trim(),
      audioFile,
      removeAudio,
    });
  };

  const attachedName = uploadedFile?.name ?? editing?.attachment?.name;
  const audioName = audioFile?.name ?? (removeAudio ? null : editing?.audio?.name);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="piece-form-title"
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-t-3xl flex justify-between items-center">
          <h2 id="piece-form-title" className="text-white font-bold text-xl">
            {editing ? t('repertoire.editTitle') : t('repertoire.newTitle')}
          </h2>
          <button type="button" onClick={close} aria-label={t('common.close')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <X aria-hidden="true" className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="piece-title" className={labelClass}>{t('repertoire.title')} *</label>
            <input id="piece-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t('repertoire.titlePlaceholder')} className={inputClass} />
          </div>

          <div>
            <label htmlFor="piece-artist" className={labelClass}>{t('repertoire.artist')}</label>
            <input id="piece-artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder={t('repertoire.artistPlaceholder')} className={inputClass} />
          </div>

          <div>
            <label htmlFor="piece-status" className={labelClass}>{t('repertoire.statusLabel')}</label>
            <select id="piece-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              {PIECE_STATUSES.map(s => <option key={s} value={s}>{t(`repertoire.status.${s}`)}</option>)}
            </select>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={reminder}
              onChange={(e) => setReminder(e.target.checked)}
              className="mt-1 w-5 h-5 text-purple-600 rounded"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{t('repertoire.reminder')}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{t('repertoire.reminderHint')}</span>
            </span>
          </label>

          <div>
            <label htmlFor="piece-file" className={labelClass}>{t('repertoire.file')}</label>
            <input
              id="piece-file"
              type="file"
              accept={pickerAccept(SCORE_ACCEPT)}
              onChange={handleFileUpload}
              className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('repertoire.fileHint')}</p>
            {attachedName && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                <Check aria-hidden="true" className="w-4 h-4" />
                {t('exercise.fileAdded', { name: attachedName })}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="piece-audio" className={labelClass}>{t('repertoire.audio')}</label>
            <input
              id="piece-audio"
              type="file"
              accept={pickerAccept(AUDIO_ACCEPT)}
              onChange={handleAudioUpload}
              className="w-full text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('repertoire.audioHint', { max: MAX_AUDIO_MB })}</p>
            {audioName && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 min-w-0">
                  <Check aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t('exercise.fileAdded', { name: audioName })}</span>
                </p>
                <button
                  type="button"
                  onClick={() => { setAudioFile(null); setRemoveAudio(true); }}
                  aria-label={t('repertoire.removeAudio')}
                  className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0"
                >
                  <Trash2 aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="piece-link" className={labelClass}>{t('repertoire.link')}</label>
            <input id="piece-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className={inputClass} />
          </div>

          <div>
            <label htmlFor="piece-target-tempo" className={labelClass}>🎯 {t('exercise.targetTempo')}</label>
            <input id="piece-target-tempo" type="number" min="0" max="300" value={targetTempo} onChange={(e) => setTargetTempo(e.target.value)} placeholder="120" className={inputClass} />
          </div>

          <div>
            <label htmlFor="piece-notes" className={labelClass}>{t('repertoire.notes')}</label>
            <textarea id="piece-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('repertoire.notesPlaceholder')} className={`${inputClass} resize-none`} />
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-xl font-bold shadow-lg">
            ✓ {editing ? t('exercise.saveChanges') : t('repertoire.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PieceFormModal;
