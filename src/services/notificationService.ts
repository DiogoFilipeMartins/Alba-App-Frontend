import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
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
     * Get the Expo push token for this device.
     * Returns the token string or null if unavailable.
     */
    async getExpoPushToken(): Promise<string | null> {
        try {
            if (Platform.OS === 'web') return null;
            if (!Device.isDevice) {
                console.warn('[Notifications] Push tokens apenas funcionam em dispositivos reais.');
                return null;
            }

            const granted = await this.requestPermissions();
            if (!granted) return null;

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('messages', {
                    name: 'Mensagens',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#6366f1',
                    sound: 'default',
                });
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'Geral',
                    importance: Notifications.AndroidImportance.DEFAULT,
                });
            }

            const tokenData = await Notifications.getExpoPushTokenAsync();
            return tokenData.data;
        } catch (error) {
            console.warn('[Notifications] Erro ao obter push token:', error);
            return null;
        }
    },

    /**
     * Show a local notification for an incoming community message.
     * Use this when the app is in the foreground to alert the user.
     */
    async showLocalMessageNotification(
        communityName: string,
        senderName: string,
        messageContent: string,
        communityId: string,
    ): Promise<void> {
        try {
            const granted = await this.requestPermissions();
            if (!granted) return;

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: `💬 ${communityName}`,
                    body: `${senderName}: ${messageContent}`,
                    data: { type: 'community_message', communityId },
                    sound: true,
                    ...(Platform.OS === 'android' ? { channelId: 'messages' } : {}),
                },
                trigger: null, // immediate
            });
        } catch (error) {
            console.warn('[Notifications] Erro ao mostrar notificação local:', error);
        }
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
