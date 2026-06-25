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
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds timeout

    try {
        const response = await fetch(`${API_URL}${path}`, {
            ...init,
            headers,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return handleResponse(response);
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('O servidor está a demorar a responder. Tente novamente.');
        }
        throw error;
    }
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
        low_noise?: boolean;
        soft_lighting?: boolean;
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

export interface DonationCampaign {
    id: string;
    title: string;
    description?: string;
    goal_amount: number;
    current_amount: number;
    place_id: string;
    is_active: boolean;
    place?: Place;
}

export interface DonationRecord {
    id: string;
    amount: number;
    status: string;
    donor_name?: string | null;
    note?: string | null;
    created_at: string;
    campaign?: DonationCampaign | null;
}

export interface Community {
    id: string;
    name: string;
    description?: string;
    created_by: string;
    is_member?: boolean;
    member_count?: number;
    color?: string;
    photo_url?: string;
    created_at?: string;
    last_message?: {
        content: string;
        created_at: string;
        sender_name: string;
    } | null;
}

export interface CommunityMember {
    user_id: string;
    role: string;
    joined_at: string;
    profiles?: { full_name: string };
}

export interface CommunityMessage {
    id: string;
    community_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: { full_name: string };
}

export interface NewsItem {
    id: string;
    title: string;
    description: string;
    content: string;
    category: string;
    imageUrl?: string;
    sourceName: string;
    sourceUrl?: string;
    publishedAt: string;
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

    async updatePlace(id: string, placeData: Partial<Pick<Place, 'name' | 'description' | 'phone' | 'address_line' | 'city'>> & { accessibility?: { wheelchair_accessible?: boolean; low_noise?: boolean; soft_lighting?: boolean } }): Promise<Place> {
        return apiFetch(`/places/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(placeData),
        });
    },

    async searchPlaces(query: string): Promise<Place[]> {
        const params = new URLSearchParams({ query }).toString();
        const response = await apiFetch(`/search?${params}`, {}, false) as { success: boolean; results: Place[] };
        return response.results ?? [];
    },

    async getFavoritePlaces(): Promise<Place[]> {
        return apiFetch('/favorites');
    },

    async addFavoritePlace(placeId: string): Promise<void> {
        await apiFetch('/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ placeId }),
        });
    },

    async removeFavoritePlace(placeId: string): Promise<void> {
        await apiFetch(`/favorites/${placeId}`, {
            method: 'DELETE',
        });
    },

    async getDonationCampaigns(): Promise<DonationCampaign[]> {
        return apiFetch('/donation-campaigns');
    },

    async getMyDonations(): Promise<DonationRecord[]> {
        return apiFetch('/donations/me');
    },

    async createDonation(payload: { campaignId: string; amount: number; donorName?: string; note?: string }): Promise<DonationRecord> {
        return apiFetch('/donations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
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

    async deleteMyAccount(): Promise<void> {
        await apiFetch('/account', {
            method: 'DELETE',
        });
    },

    // Communities
    async getCommunities(): Promise<Community[]> {
        return apiFetch('/communities');
    },

    async createCommunity(data: { name: string, description: string }): Promise<Community> {
        return apiFetch('/communities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async updateCommunity(id: string, data: { name?: string; description?: string; color?: string; photo_url?: string }): Promise<Community> {
        return apiFetch(`/communities/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async joinCommunity(id: string): Promise<void> {
        await apiFetch(`/communities/${id}/join`, {
            method: 'POST',
        });
    },

    async getCommunityMessages(id: string): Promise<CommunityMessage[]> {
        return apiFetch(`/communities/${id}/messages`);
    },

    async sendCommunityMessage(id: string, content: string): Promise<CommunityMessage> {
        return apiFetch(`/communities/${id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
    },

    async deleteCommunityMessage(communityId: string, messageId: string): Promise<void> {
        await apiFetch(`/communities/${communityId}/messages/${messageId}`, {
            method: 'DELETE',
        });
    },

    async getCommunityMembers(id: string): Promise<CommunityMember[]> {
        return apiFetch(`/communities/${id}/members`);
    },

    async sendChatMessage(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<{ reply: string; results?: Place[] }> {
        // Timeout generoso (60s) para lidar com cold starts do Render free tier
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages }),
                signal: controller.signal,
            });
            const data = await handleResponse(response) as { reply: string; results?: Place[] };
            return data;
        } catch (err: any) {
            if (err.name === 'AbortError') {
                throw new Error('O servidor demorou demasiado a responder. Tenta novamente.');
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    },

    async getMapboxToken(): Promise<{ token: string }> {
        return apiFetch('/mapbox-token', {}, false);
    },

    // Profile management
    async updateProfile(data: { full_name?: string; phone?: string; specialty?: string; bio?: string; website?: string; account_type?: string }): Promise<any> {
        return apiFetch('/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async claimPlace(placeId: string): Promise<any> {
        return apiFetch(`/places/${placeId}/claim`, {
            method: 'POST',
        });
    },

    async changePassword(newPassword: string): Promise<void> {
        await apiFetch('/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword }),
        });
    },

    // Leave community
    async leaveCommunity(id: string): Promise<void> {
        await apiFetch(`/communities/${id}/leave`, {
            method: 'DELETE',
        });
    },

    // Admin: Users
    async getAdminUsers(): Promise<any[]> {
        return apiFetch('/admin/users');
    },

    async updateUserRole(id: string, role: 'user' | 'admin'): Promise<any> {
        return apiFetch(`/admin/users/${id}/role`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
    },

    async updateUserVerification(id: string, verified: boolean): Promise<any> {
        return apiFetch(`/admin/users/${id}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verified }),
        });
    },

    async getProfessionals(filters: any = {}): Promise<any[]> {
        const params = new URLSearchParams(filters).toString();
        return apiFetch(`/professionals?${params}`);
    },

    // Admin: Campaigns
    async getAdminCampaigns(): Promise<DonationCampaign[]> {
        return apiFetch('/admin/campaigns');
    },

    async createAdminCampaign(data: { title: string; description?: string; goal_amount: number; place_id?: string }): Promise<DonationCampaign> {
        return apiFetch('/admin/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    async updateAdminCampaign(id: string, data: { title?: string; description?: string; goal_amount?: number; is_active?: boolean }): Promise<DonationCampaign> {
        return apiFetch(`/admin/campaigns/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    },

    // News
    async getNews(filters: { query?: string; category?: string } = {}): Promise<NewsItem[]> {
        const params = new URLSearchParams(filters as any).toString();
        return apiFetch(`/news?${params}`);
    },
};

