import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place } from './apiService';

const FAVORITES_KEY = 'alba.favoritePlaces.v1';

export interface FavoritePlace {
    id: string;
    name: string;
    type: Place['type'];
    city?: string;
}

const normalizePlace = (place: Place): FavoritePlace => ({
    id: place.id,
    name: place.name,
    type: place.type,
    city: place.city,
});

const readFavorites = async (): Promise<FavoritePlace[]> => {
    const rawValue = await AsyncStorage.getItem(FAVORITES_KEY);
    if (!rawValue) {
        return [];
    }

    try {
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeFavorites = async (favorites: FavoritePlace[]) => {
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export const favoritesService = {
    async list(): Promise<FavoritePlace[]> {
        return readFavorites();
    },

    async getIds(): Promise<string[]> {
        const favorites = await readFavorites();
        return favorites.map((favorite) => favorite.id);
    },

    async toggle(place: Place): Promise<boolean> {
        const favorites = await readFavorites();
        const exists = favorites.some((favorite) => favorite.id === place.id);

        if (exists) {
            await writeFavorites(favorites.filter((favorite) => favorite.id !== place.id));
            return false;
        }

        await writeFavorites([normalizePlace(place), ...favorites]);
        return true;
    },
};