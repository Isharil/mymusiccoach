import { Check, Music, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PIECE_STATUS_BADGE } from '../constants/appData';

/**
 * Morceau du répertoire dans une session : ouvrir sa fiche (partition, enregistrement, vidéo),
 * le marquer travaillé ou passé. Un second appui sur le statut choisi l'annule.
 * @param {'completed' | 'skipped' | undefined} status
 */
const SessionPieceCard = ({ piece, status, onStatusChange }) => {
  const { setSelectedPieceId, t } = useApp();
  const choose = (value) => onStatusChange(status === value ? null : value);

  return (
    <div
      className={`border-2 rounded-2xl p-5 transition-all ${
        status === 'completed' ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30' :
        status === 'skipped' ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700' :
        'border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Music aria-hidden="true" className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-gray-100 break-words">{piece.title}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {piece.artist && <span className="text-sm text-gray-600 dark:text-gray-400">{piece.artist}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full ${PIECE_STATUS_BADGE[piece.status]}`}>
              {t(`repertoire.status.${piece.status}`)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setSelectedPieceId(piece.id)}
          aria-label={t('workout.openPiece', { title: piece.title })}
          className="py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium"
        >
          {t('workout.openPieceShort')}
        </button>
        <button
          type="button"
          onClick={() => choose('skipped')}
          aria-pressed={status === 'skipped'}
          className={`py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
            status === 'skipped' ? 'bg-gray-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <X aria-hidden="true" className="w-4 h-4" />
          {t('workout.pieceSkipped')}
        </button>
        <button
          type="button"
          onClick={() => choose('completed')}
          aria-pressed={status === 'completed'}
          className={`py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
            status === 'completed' ? 'bg-green-600 text-white' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}
        >
          <Check aria-hidden="true" className="w-4 h-4" />
          {t('workout.piecePracticed')}
        </button>
      </div>
    </div>
  );
};

export default SessionPieceCard;
