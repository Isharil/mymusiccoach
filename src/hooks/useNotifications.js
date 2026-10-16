import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Notifications locales (Android uniquement) : permission, rappel quotidien, notifications ponctuelles
export const useNotifications = ({ settings, t, showToast }) => {
  const isNativePlatform = Capacitor.isNativePlatform();

  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const requestNotificationPermission = async () => {
    if (!isNativePlatform) {
      showToast(t('messages.notificationsMobileOnly'), 'warning');
      return;
    }

    try {
      const permStatus = await LocalNotifications.checkPermissions();

      if (permStatus.display === 'granted') {
        setNotificationPermission('granted');
        showToast(t('messages.notificationsAlreadyAllowed'), 'success');
        return;
      }

      const result = await LocalNotifications.requestPermissions();
      setNotificationPermission(result.display);

      if (result.display === 'granted') {
        await sendTestNotification();
        // Planifier le rappel quotidien
        await scheduleDailyReminder();
      }
    } catch (error) {
      console.error('Erreur permissions notification:', error);
      showToast(t('messages.permissionError'), 'error');
    }
  };

  const sendTestNotification = async () => {
    if (!isNativePlatform) return;

    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: '🎵 MyMusicCoach',
          body: t('messages.notificationsHello', { name: settings.userName }),
          id: 9999,
          schedule: { at: new Date(Date.now() + 1000) },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }]
      });
    } catch (error) {
      console.error('Erreur envoi notification test:', error);
    }
  };

  const scheduleDailyReminder = useCallback(async () => {
    if (!isNativePlatform) return;
    if (!settings.notifications || !settings.reminderEnabled) return;

    try {
      // Annuler les anciennes notifications planifiées
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

      // Parser l'heure du rappel
      const [hours, minutes] = settings.practiceReminder.split(':').map(Number);

      // Créer la date du prochain rappel
      const now = new Date();
      const scheduledDate = new Date();
      scheduledDate.setHours(hours, minutes, 0, 0);

      // Si l'heure est déjà passée aujourd'hui, planifier pour demain
      if (scheduledDate <= now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [{
          title: `🎵 ${t('messages.dailyReminderTitle')}`,
          body: t('messages.dailyReminder'),
          id: 1,
          schedule: {
            at: scheduledDate,
            repeats: true,
            every: 'day'
          },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }]
      });

      console.log('Rappel quotidien planifié pour:', scheduledDate);
    } catch (error) {
      console.error('Erreur planification rappel:', error);
    }
  }, [isNativePlatform, settings.notifications, settings.reminderEnabled, settings.practiceReminder, t]);

  const cancelDailyReminder = useCallback(async () => {
    if (!isNativePlatform) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      console.log('Rappel quotidien annulé');
    } catch (error) {
      console.error('Erreur annulation rappel:', error);
    }
  }, [isNativePlatform]);

  // Envoyer une notification immédiate (pour session terminée, etc.)
  const sendImmediateNotification = async (title, body, id = 9998) => {
    if (!isNativePlatform) return;
    if (!settings.notifications) return;

    try {
      const permStatus = await LocalNotifications.checkPermissions();
      if (permStatus.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [{
          title,
          body,
          id,
          schedule: { at: new Date(Date.now() + 500) },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }]
      });
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  };

  // Vérifier et mettre à jour les permissions au démarrage
  useEffect(() => {
    const checkPermissions = async () => {
      if (!isNativePlatform) return;

      try {
        const permStatus = await LocalNotifications.checkPermissions();
        setNotificationPermission(permStatus.display);
      } catch (error) {
        console.error('Erreur vérification permissions:', error);
      }
    };

    checkPermissions();
  }, [isNativePlatform]);

  // Mettre à jour le rappel quotidien quand les settings changent
  useEffect(() => {
    if (!isNativePlatform) return;

    const updateReminder = async () => {
      if (settings.notifications && settings.reminderEnabled) {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'granted') {
          await scheduleDailyReminder();
        }
      } else {
        await cancelDailyReminder();
      }
    };

    updateReminder();
  }, [isNativePlatform, settings.notifications, settings.reminderEnabled, scheduleDailyReminder, cancelDailyReminder]);

  return { isNativePlatform, notificationPermission, requestNotificationPermission, sendTestNotification, sendImmediateNotification };
};
