import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const notificationService = {
    /**
     * Request push notification permissions.
     * Returns true if granted, false otherwise.
     */
    async requestPermissions(): Promise<boolean> {
        if (Platform.OS === 'web') return false;

        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing === 'granted') return true;

        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    },

    /**
     * Schedule a local notification 30 minutes before the event starts.
     * Returns the notification identifier so it can be cancelled later.
     */
    async scheduleEventReminder(
        eventId: string,
        title: string,
        startsAt: string,
    ): Promise<string | null> {
        try {
            const granted = await this.requestPermissions();
            if (!granted) return null;

            const startDate = new Date(startsAt);
            const reminderDate = new Date(startDate.getTime() - 30 * 60 * 1000); // 30 min before

            // Don't schedule if the reminder time is already in the past
            if (reminderDate <= new Date()) return null;

            // Cancel any existing notification for this event first
            await this.cancelEventReminder(eventId);

            const identifier = await Notifications.scheduleNotificationAsync({
                identifier: `event-${eventId}`,
                content: {
                    title: '📅 Lembrete de evento',
                    body: `"${title}" começa em 30 minutos`,
                    data: { eventId },
                    sound: true,
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: reminderDate,
                },
            });

            return identifier;
        } catch (error) {
            console.warn('[Notifications] Erro ao agendar notificação:', error);
            return null;
        }
    },

    /**
     * Cancel the scheduled notification for a specific event.
     */
    async cancelEventReminder(eventId: string): Promise<void> {
        try {
            await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`);
        } catch {
            // Silently ignore if notification doesn't exist
        }
    },

    /**
     * Cancel all scheduled notifications (e.g., on logout).
     */
    async cancelAllReminders(): Promise<void> {
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
        } catch (error) {
            console.warn('[Notifications] Erro ao cancelar notificações:', error);
        }
    },

    /**
     * Get all currently scheduled notifications (useful for debugging).
     */
    async getScheduledReminders() {
        return Notifications.getAllScheduledNotificationsAsync();
    },
};
