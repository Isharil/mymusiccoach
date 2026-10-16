import { useState } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

// Export de fichiers selon la plateforme : choix Télécharger/Partager sur Android,
// partage sur iOS, presse-papier sur iOS web, téléchargement classique sur desktop
export const useFileExport = ({ t, showToast }) => {
  const [exportModalData, setExportModalData] = useState(null); // { content, fileName, mimeType }

  // Sauvegarder dans le dossier Downloads (Android natif)
  const saveToDownloads = async (dataStr, fileName) => {
    try {
      await Filesystem.writeFile({
        path: `Download/${fileName}`,
        data: dataStr,
        directory: Directory.ExternalStorage,
        encoding: Encoding.UTF8,
        recursive: true
      });
      showToast(t('messages.fileSaved', { name: fileName }), 'success');
      setExportModalData(null);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde Downloads:', error);
      // Fallback : essayer avec Documents si ExternalStorage échoue
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: dataStr,
          directory: Directory.Documents,
          encoding: Encoding.UTF8
        });
        showToast(t('messages.fileSaved', { name: fileName }), 'success');
        setExportModalData(null);
        return true;
      } catch {
        showToast(t('messages.saveError'), 'error');
        return false;
      }
    }
  };

  // Partager le fichier (Android/iOS natif)
  const shareFile = async (dataStr, fileName) => {
    try {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: dataStr,
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: t('export.dialogTitle')
      });
      setExportModalData(null);
      return true;
    } catch (error) {
      if (error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        // L'utilisateur a annulé, pas une vraie erreur
        return true;
      }
      console.error('Erreur partage:', error);
      showToast(t('messages.shareError'), 'error');
      return false;
    }
  };

  // Fonction utilitaire pour télécharger un fichier (compatible mobile via Capacitor)
  const downloadFile = async (content, fileName, mimeType = 'application/json') => {
    // Convertir le contenu en string si c'est un Blob
    let dataStr;
    if (content instanceof Blob) {
      dataStr = await content.text();
    } else {
      dataStr = content;
    }

    // Vérifier si on est sur une plateforme native (Android/iOS avec Capacitor)
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    // Détecter iOS en mode PWA ou navigateur (sans Capacitor natif)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIOSWeb = isIOS && !isNative;

    if (isNative && platform === 'android') {
      // Sur Android natif : afficher la modal de choix
      setExportModalData({ content: dataStr, fileName, mimeType });
      return true;
    } else if (isNative && platform === 'ios') {
      // Sur iOS natif : utiliser directement le partage
      return await shareFile(dataStr, fileName);
    } else if (isIOSWeb) {
      // Sur iOS PWA/Safari : copier dans le presse-papier (seule méthode fiable)
      try {
        await navigator.clipboard.writeText(dataStr);
        showToast(t('messages.copiedPaste', { name: fileName }), 'success', 6000);
        return true;
      } catch (error) {
        console.error('Erreur clipboard:', error);
        prompt(t('messages.copyManually'), dataStr.substring(0, 500) + '...');
        return false;
      }
    } else {
      // Sur web desktop : utiliser la méthode classique avec Data URL
      const dataUrl = `data:${mimeType};charset=utf-8,${encodeURIComponent(dataStr)}`;

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 500);

      return true;
    }
  };

  return { exportModalData, setExportModalData, downloadFile, saveToDownloads, shareFile };
};
