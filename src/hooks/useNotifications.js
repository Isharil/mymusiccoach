import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isReminderId, planReminders } from '../utils/reminders';

// Notifications locales (Android uniquement) : permission, rappels de pratique, notifications ponctuelles
export const useNotifications = ({ settings, t, showToast, weeklySchedule, workouts, sessionHistory, workoutName }) => {
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
        // Programmer les rappels
        await scheduleReminders();
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

  // Annule tous les rappels programmés (y compris l'ancien rappel quotidien répété)
  const cancelReminders = useCallback(async () => {
    if (!isNativePlatform) return;

    try {
      const { notifications } = await LocalNotifications.getPending();
      const ids = notifications.map(n => n.id).filter(isReminderId);
      if (ids.length > 0) {
        await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
      }
    } catch (error) {
      console.error('Erreur annulation rappels:', error);
    }
  }, [isNativePlatform]);

  // Programme les rappels des prochains jours (voir utils/reminders.js)
  const scheduleReminders = useCallback(async () => {
    if (!isNativePlatform) return;
    if (!settings.notifications || !settings.reminderEnabled) return;

    try {
      await cancelReminders();
      const reminders = planReminders({
        now: new Date(),
        time: settings.practiceReminder,
        weeklySchedule,
        workouts,
        cycleStartDate: settings.cycleStartDate,
        sessionHistory,
      });
      if (reminders.length === 0) return;

      await LocalNotifications.schedule({
        notifications: reminders.map(reminder => ({
          id: reminder.id,
          title: `🎵 ${t('messages.dailyReminderTitle')}`,
          // Les sessions prévues ce jour-là, sinon le message général
          body: reminder.workouts.length > 0
            ? t('messages.reminderWithSessions', { sessions: reminder.workouts.map(workoutName).join(', ') })
            : t('messages.dailyReminder'),
          schedule: { at: reminder.at, allowWhileIdle: true },
          sound: null,
          smallIcon: 'ic_stat_music_note',
          largeIcon: 'ic_launcher'
        }))
      });
    } catch (error) {
      console.error('Erreur planification rappels:', error);
    }
  }, [
    isNativePlatform, settings.notifications, settings.reminderEnabled, settings.practiceReminder,
    settings.cycleStartDate, weeklySchedule, workouts, sessionHistory, t, workoutName, cancelReminders
  ]);

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

  // Reprogrammer les rappels à l'ouverture et à chaque changement utile
  // (réglages, planning, sessions, pratique enregistrée aujourd'hui)
  useEffect(() => {
    if (!isNativePlatform) return;

    const updateReminders = async () => {
      if (settings.notifications && settings.reminderEnabled) {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display === 'granted') {
          await scheduleReminders();
        }
      } else {
        await cancelReminders();
      }
    };

    updateReminders();
  }, [isNativePlatform, settings.notifications, settings.reminderEnabled, scheduleReminders, cancelReminders]);

  return { isNativePlatform, notificationPermission, requestNotificationPermission, sendTestNotification, sendImmediateNotification };
};
