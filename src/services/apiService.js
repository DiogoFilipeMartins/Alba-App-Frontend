const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const handleResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro na comunicação com o servidor');
    }
    if (response.status === 204) return null;
    return response.json();
};

export const apiService = {
    // Places
    async getPlaces(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/places?${params}`);
        return handleResponse(response);
    },

    async getPendingPlacesCount() {
        const response = await fetch(`${API_URL}/places/pending-count`);
        return handleResponse(response);
    },

    async updatePlaceStatus(id, status) {
        const response = await fetch(`${API_URL}/places/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        return handleResponse(response);
    },

    async createPlace(placeData) {
        const response = await fetch(`${API_URL}/places`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placeData),
        });
        return handleResponse(response);
    },

    // Calendar Events
    async getCalendarEvents(userId, from, to) {
        const params = new URLSearchParams({ userId, from, to }).toString();
        const response = await fetch(`${API_URL}/calendar-events?${params}`);
        return handleResponse(response);
    },

    async createCalendarEvent(eventData) {
        const response = await fetch(`${API_URL}/calendar-events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData),
        });
        return handleResponse(response);
    },

    async deleteCalendarEvent(id) {
        const response = await fetch(`${API_URL}/calendar-events/${id}`, {
            method: 'DELETE',
        });
        return handleResponse(response);
    },

    // Profile
    async getProfile(id) {
        const response = await fetch(`${API_URL}/profile/${id}`);
        return handleResponse(response);
    },
};
