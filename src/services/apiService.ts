import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const getAuthHeaders = async (headers: HeadersInit = {}) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
        throw error;
    }

    const accessToken = data.session?.access_token;
    if (!accessToken) {
        throw new Error('Sessão expirada. Inicie sessão novamente.');
    }

    return {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
    };
};

const apiFetch = async (path: string, init: RequestInit = {}, authenticated = true) => {
    const headers = authenticated ? await getAuthHeaders(init.headers) : init.headers;
    const response = await fetch(`${API_URL}${path}`, {
        ...init,
        headers,
    });

    return handleResponse(response);
};

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na comunicação com o servidor');
    }
    if (response.status === 204) return null;
    return response.json();
};

export interface Place {
    id: string;
    name: string;
    type: 'professional' | 'institution';
    description?: string;
    phone?: string;
    email?: string;
    website?: string;
    address_line?: string;
    city?: string;
    postal_code?: string;
    latitude: number;
    longitude: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    created_by?: string;
    place_accessibility?: Array<{
        wheelchair_accessible?: boolean;
    }>;
}

export interface CalendarEvent {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    starts_at: string;
    ends_at: string | null;
    all_day: boolean;
    color?: string;
}

export const apiService = {
    // Places
    async getPlaces(filters: any = {}): Promise<Place[]> {
        const params = new URLSearchParams(filters).toString();
        return apiFetch(`/places?${params}`);
    },

    async getPendingPlacesCount(): Promise<{ count: number }> {
        return apiFetch('/places/pending-count');
    },

    async updatePlaceStatus(id: string, status: string): Promise<Place> {
        return apiFetch(`/places/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
    },

    async createPlace(placeData: any): Promise<Place> {
        return apiFetch('/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placeData),
        });
    },

    async searchPlaces(query: string): Promise<Place[]> {
        const params = new URLSearchParams({ query }).toString();
        const response = await apiFetch(`/search?${params}`, {}, false) as { success: boolean; results: Place[] };
        return response.results ?? [];
    },

    // Calendar Events
    async getCalendarEvents(userId: string, from?: string, to?: string): Promise<CalendarEvent[]> {
        const params = new URLSearchParams({ userId, from: from || '', to: to || '' }).toString();
        return apiFetch(`/calendar-events?${params}`);
    },

    async createCalendarEvent(eventData: any): Promise<CalendarEvent> {
        return apiFetch('/calendar-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
        });
    },

    async updateCalendarEvent(id: string, eventData: any): Promise<CalendarEvent> {
        return apiFetch(`/calendar-events/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
        });
    },

    async deleteCalendarEvent(id: string): Promise<void> {
        await apiFetch(`/calendar-events/${id}`, {
            method: 'DELETE',
        });
    },

    // Profile
    async getProfile(id: string): Promise<any> {
        return apiFetch(`/profile/${id}`);
    },
};
