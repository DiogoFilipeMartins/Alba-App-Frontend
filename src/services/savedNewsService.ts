import AsyncStorage from '@react-native-async-storage/async-storage';
import { NewsItem } from './apiService';

const SAVED_NEWS_KEY = 'alba.savedNews.v1';

export const savedNewsService = {
    async list(): Promise<NewsItem[]> {
        const rawValue = await AsyncStorage.getItem(SAVED_NEWS_KEY);
        if (!rawValue) return [];
        try {
            const parsed = JSON.parse(rawValue);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    async getIds(): Promise<string[]> {
        const saved = await this.list();
        return saved.map((item) => item.id);
    },

    async toggle(newsItem: NewsItem): Promise<boolean> {
        const saved = await this.list();
        const exists = saved.some((item) => item.id === newsItem.id);
        let updated: NewsItem[];

        if (exists) {
            updated = saved.filter((item) => item.id !== newsItem.id);
        } else {
            updated = [newsItem, ...saved];
        }

        await AsyncStorage.setItem(SAVED_NEWS_KEY, JSON.stringify(updated));
        return !exists;
    },

    async isSaved(id: string): Promise<boolean> {
        const ids = await this.getIds();
        return ids.includes(id);
    }
};
