const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

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
        const response = await fetch(`${API_URL}/places?${params}`);
        return handleResponse(response);
    },

    async getPendingPlacesCount(): Promise<{ count: number }> {
        const response = await fetch(`${API_URL}/places/pending-count`);
        return handleResponse(response);
    },

    async updatePlaceStatus(id: string, status: string): Promise<Place> {
        const response = await fetch(`${API_URL}/places/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        return handleResponse(response);
    },

    async createPlace(placeData: any): Promise<Place> {
        const response = await fetch(`${API_URL}/places`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placeData),
        });
        return handleResponse(response);
    },

    // Calendar Events
    async getCalendarEvents(userId: string, from?: string, to?: string): Promise<CalendarEvent[]> {
        const params = new URLSearchParams({ userId, from: from || '', to: to || '' }).toString();
        const response = await fetch(`${API_URL}/calendar-events?${params}`);
        return handleResponse(response);
    },

    async createCalendarEvent(eventData: any): Promise<CalendarEvent> {
        const response = await fetch(`${API_URL}/calendar-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
        });
        return handleResponse(response);
    },

    async deleteCalendarEvent(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/calendar-events/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },

    // Profile
    async getProfile(id: string): Promise<any> {
        const response = await fetch(`${API_URL}/profile/${id}`);
        return handleResponse(response);
    },
};
