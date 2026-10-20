import { useState } from 'react';
import { Bell, Music2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PIECE_STATUS_BADGE } from '../../constants/appData';
import { PIECE_STATUSES, isPieceDue } from '../../utils/repertoire';

// Bibliothèque > Morceaux : répertoire, filtré par statut
const PiecesTab = () => {
  const { pieces, setSelectedPieceId, t } = useApp();
  const [filter, setFilter] = useState('all');

  const visible = pieces
    .filter(piece => filter === 'all' || piece.status === filter)
    .sort((a, b) => a.title.localeCompare(b.title));
  const countOf = (status) => pieces.filter(p => p.status === status).length;

  return (
    <>
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
        <p className="text-xs text-emerald-700 dark:text-emerald-300">💡 {t('repertoire.hint')}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', ...PIECE_STATUSES].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            aria-pressed={filter === status}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
            }`}
          >
            {status === 'all' ? t('categories.all') : `${t(`repertoire.status.${status}`)} (${countOf(status)})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="text-center py-8">
            <Music2 aria-hidden="true" className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('repertoire.empty')}</p>
          </div>
        ) : visible.map(piece => (
          <button
            key={piece.id}
            onClick={() => setSelectedPieceId(piece.id)}
            className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 truncate">{piece.title}</h3>
                {piece.artist && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{piece.artist}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {piece.reminder && (
                  <Bell
                    aria-label={t('repertoire.reminderOn')}
                    className={`w-4 h-4 ${isPieceDue(piece) ? 'text-orange-500' : 'text-gray-400'}`}
                  />
                )}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${PIECE_STATUS_BADGE[piece.status]}`}>
                  {t(`repertoire.status.${piece.status}`)}
                </span>
              </div>
            </div>
            {isPieceDue(piece) && (
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-2">{t('repertoire.dueToday')}</p>
            )}
          </button>
        ))}
      </div>
    </>
  );
};

export default PiecesTab;
