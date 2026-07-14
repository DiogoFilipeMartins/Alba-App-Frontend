import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommunityMessage } from './apiService';

// Cache local das mensagens de cada comunidade, por comunidade.
// Objetivo: abrir o chat instantaneamente e permitir ver mensagens offline,
// mantendo o servidor (Supabase) como fonte de verdade.

const PREFIX = 'alba.communityChat.v1.';
const MAX_MESSAGES = 200; // limita o armazenamento por comunidade

const keyFor = (communityId: string) => `${PREFIX}${communityId}`;

export const communityChatCache = {
    async get(communityId: string): Promise<CommunityMessage[]> {
        try {
            const raw = await AsyncStorage.getItem(keyFor(communityId));
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    async set(communityId: string, messages: CommunityMessage[]): Promise<void> {
        try {
            const trimmed = messages.slice(-MAX_MESSAGES);
            await AsyncStorage.setItem(keyFor(communityId), JSON.stringify(trimmed));
        } catch {
            // falha de escrita na cache não deve quebrar o chat
        }
    },

    async clear(communityId: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(keyFor(communityId));
        } catch {
            // ignore
        }
    },
};
