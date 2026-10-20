import { FileText, Music, PlayCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isAudioFile } from '../utils/media';
import { isTabFile } from '../utils/tabFiles';
import AudioPlayer from './AudioPlayer';

const isImage = (name) => /\.(jpg|jpeg|png)$/i.test(name);
const isGuitarPro = (name) => /\.(gp3|gp4|gp5|gpx|gp)$/i.test(name);

// Affiche un fichier joint (exercice ou morceau) : image en aperçu, sinon icône et téléchargement
const AttachmentView = ({ file, alt }) => {
  const { openTabPlayer, t } = useApp();
  if (!file) return null;
  if (isAudioFile(file.name)) return <AudioPlayer file={file} />;

  const downloadLabel = isImage(file.name) ? t('exercise.downloadImage')
    : isGuitarPro(file.name) ? t('exercise.downloadGuitarPro')
    : /\.pdf$/i.test(file.name) ? t('exercise.downloadPdf')
    : /\.(musicxml|xml)$/i.test(file.name) ? t('exercise.downloadScore')
    : t('exercise.downloadFile');

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-2xl p-8 text-center shadow-lg">
      {isImage(file.name) ? (
        <img src={file.data} alt={alt} className="max-w-full h-auto rounded-xl mb-4 shadow-md" />
      ) : (
        <>
          {isGuitarPro(file.name)
            ? <Music className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" aria-hidden="true" />
            : <FileText className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" aria-hidden="true" />}
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-4 break-all">{file.name}</p>
        </>
      )}
      {isTabFile(file.name) && (
        <button
          onClick={() => openTabPlayer(file)}
          className="w-full mb-3 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-md"
        >
          <PlayCircle aria-hidden="true" className="w-5 h-5" />
          {t('tabPlayer.openTab')}
        </button>
      )}
      <a
        href={file.data}
        download={file.name}
        className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-md hover:shadow-lg transition-shadow"
      >
        {downloadLabel}
      </a>
    </div>
  );
};

export default AttachmentView;
