import { useState } from 'react';
import { Bell, Edit2, ExternalLink, PenLine, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useAttachment } from '../../hooks/useAttachment';
import AttachmentView from '../AttachmentView';
import AudioPlayer from '../AudioPlayer';
import YouTubePlayer from '../YouTubePlayer';
import { parseYouTubeUrl } from '../../utils/media';
import { PIECE_STATUS_BADGE } from '../../constants/appData';
import {
  PIECE_STATUSES, changePieceStatus, isPieceDue, nextReminderDate, piecePracticeSummary
} from '../../utils/repertoire';
import { tempoProgress } from '../../utils/tempo';

// Fiche d'un morceau du répertoire
const PieceDetailModal = () => {
  const {
    deletePiece, formatDisplayDate, formatMinutes, logPiecePractice, pieces, reviewPiece, savePieceTempo,
    selectedPieceId, sessionHistory, setEditingPiece, setSelectedPieceId, t, updatePiece
  } = useApp();
  useBackHandler(() => setSelectedPieceId(null));
  const piece = pieces.find(p => p.id === selectedPieceId);
  const file = useAttachment(piece?.attachment);
  const audio = useAttachment(piece?.audio);
  const [tempoInput, setTempoInput] = useState('');

  if (!piece) return null;

  const summary = piecePracticeSummary(piece.id, sessionHistory);
  const nextReminder = nextReminderDate(piece);
  const due = isPieceDue(piece);
  const progress = tempoProgress({ baseTempo: 0, targetTempo: piece.targetTempo, tempoHistory: piece.tempoHistory || [] });
  const close = () => setSelectedPieceId(null);

  const recordTempo = () => {
    const tempo = parseInt(tempoInput, 10);
    if (!Number.isFinite(tempo) || tempo < 20 || tempo > 300) return;
    savePieceTempo(piece, tempo);
    setTempoInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={close}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="piece-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-t-3xl">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 id="piece-detail-title" className="text-white font-bold text-xl break-words">{piece.title}</h2>
              {piece.artist && <p className="text-emerald-50 text-sm">{piece.artist}</p>}
            </div>
            <button onClick={close} aria-label={t('common.close')} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <X aria-hidden="true" className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Statut, modifiable directement */}
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="piece-detail-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('repertoire.statusLabel')}</label>
            <select
              id="piece-detail-status"
              value={piece.status}
              onChange={(e) => updatePiece(piece.id, p => changePieceStatus(p, e.target.value))}
              className={`px-3 py-2 rounded-xl text-sm font-medium border-0 ${PIECE_STATUS_BADGE[piece.status]}`}
            >
              {PIECE_STATUSES.map(s => <option key={s} value={s}>{t(`repertoire.status.${s}`)}</option>)}
            </select>
          </div>

          {/* Révision d'un morceau maîtrisé dont le rappel est arrivé */}
          {due && piece.status === 'mastered' ? (
            <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">{t('repertoire.reviewQuestion')}</p>
              <div className="flex gap-2">
                <button onClick={() => reviewPiece(piece, true)} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-bold">
                  {t('repertoire.stillMastered')}
                </button>
                <button onClick={() => reviewPiece(piece, false)} className="flex-1 py-2 rounded-lg bg-white dark:bg-gray-700 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-600 text-sm font-bold">
                  {t('repertoire.needsWork')}
                </button>
              </div>
            </div>
          ) : due && (
            <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{t('repertoire.dueToday')}</p>
          )}

          <button
            onClick={() => logPiecePractice(piece)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-bold shadow"
          >
            <PenLine aria-hidden="true" className="w-5 h-5" />
            {t('repertoire.logPractice')}
          </button>

          {/* Suivi */}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <dt className="text-gray-500 dark:text-gray-400">{t('repertoire.timeSpent')}</dt>
              <dd className="font-bold text-gray-900 dark:text-gray-100">{formatMinutes(summary.minutes)}</dd>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <dt className="text-gray-500 dark:text-gray-400">{t('repertoire.lastPracticed')}</dt>
              <dd className="font-bold text-gray-900 dark:text-gray-100">
                {piece.lastPracticedAt ? formatDisplayDate(piece.lastPracticedAt) : t('repertoire.never')}
              </dd>
            </div>
          </dl>
          {piece.reminder && nextReminder && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Bell aria-hidden="true" className="w-3.5 h-3.5" />
              {t('repertoire.nextReminder', { date: formatDisplayDate(nextReminder) })}
            </p>
          )}

          {/* Pour jouer avec le morceau : enregistrement, vidéo */}
          {audio && <AudioPlayer file={audio} />}
          {piece.link && parseYouTubeUrl(piece.link) && <YouTubePlayer url={piece.link} />}

          {file && <AttachmentView file={file} alt={piece.title} />}

          {piece.link && !parseYouTubeUrl(piece.link) && (
            <a href={piece.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium break-all">
              <ExternalLink aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
              {t('repertoire.openLink')}
            </a>
          )}

          {/* Tempo atteint et progression vers le tempo cible */}
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4 space-y-3">
            {progress && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">🎯 {t('exercise.targetTempoLabel')}</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">{progress.current} / {progress.target} BPM</span>
                </div>
                <div className="h-2.5 bg-white dark:bg-gray-600 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={t('exercise.targetTempoLabel')}>
                  <div className={`h-full rounded-full ${progress.reached ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <label htmlFor="piece-tempo" className="sr-only">{t('exercise.recordYourTempo')}</label>
              <input
                id="piece-tempo"
                type="number"
                min="20"
                max="300"
                value={tempoInput}
                onChange={(e) => setTempoInput(e.target.value)}
                placeholder={t('exercise.recordYourTempo')}
                className="flex-1 min-w-0 px-3 py-2 border border-blue-300 dark:border-blue-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <button onClick={recordTempo} disabled={!tempoInput} className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium disabled:opacity-50">
                BPM ✓
              </button>
            </div>
          </div>

          {piece.notes && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">{t('repertoire.notes')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{piece.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => { setEditingPiece(piece); setSelectedPieceId(null); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
            >
              <Edit2 aria-hidden="true" className="w-4 h-4" />
              {t('common.edit')}
            </button>
            <button
              onClick={() => deletePiece(piece.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 font-medium"
            >
              <Trash2 aria-hidden="true" className="w-4 h-4" />
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PieceDetailModal;
