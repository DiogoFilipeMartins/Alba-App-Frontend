import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TextInput,
    ScrollView,
    Modal,
    Animated,
    Dimensions,
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const DRAWER_W = SCREEN_W * 0.78;

// ── Cores e ícones por tipo ────────────────────────────────────────────────
const TYPE_CONFIG = {
    professional: { color: '#6c63ff', icon: 'person', label: 'Profissionais' },
    institution: { color: '#0ea5e9', icon: 'business', label: 'Centros' },
};
const DEFAULT_CONFIG = { color: '#f43f5e', icon: 'location', label: 'Outros' };
const getConfig = (type) => TYPE_CONFIG[type] ?? DEFAULT_CONFIG;

const parseLocation = (geoPoint) => {
    if (!geoPoint?.coordinates) return null;
    return { longitude: geoPoint.coordinates[0], latitude: geoPoint.coordinates[1] };
};

// ── Pin teardrop ───────────────────────────────────────────────────────────
function TearDropMarker({ color, icon }) {
    return (
        <View style={{ alignItems: 'center' }}>
            <View style={[styles.pinBody, { borderColor: color }]}>
                <View style={[styles.pinInner, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={14} color="white" />
                </View>
            </View>
            <View style={[styles.pinTail, { borderTopColor: color }]} />
        </View>
    );
}

// ── Filter pill ────────────────────────────────────────────────────────────
function FilterPill({ active, label, icon, color, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            style={[styles.pill, active ? { backgroundColor: color, borderColor: color } : styles.pillInactive]}
        >
            {icon && <Ionicons name={icon} size={13} color={active ? 'white' : color} style={{ marginRight: 4 }} />}
            <Text style={[styles.pillText, active && { color: 'white' }]}>{label}</Text>
        </Pressable>
    );
}

// ── Bottom bar button ──────────────────────────────────────────────────────
function BottomBtn({ icon, label, color, active, onPress }) {
    return (
        <Pressable onPress={onPress} style={styles.bottomBtn}>
            <View style={[styles.bottomIcon, { backgroundColor: active ? color + '25' : 'transparent' }]}>
                <Ionicons name={icon} size={22} color={active ? color : '#94a3b8'} />
            </View>
            <Text style={[styles.bottomLabel, active && { color, fontWeight: '700' }]}>{label}</Text>
        </Pressable>
    );
}

// ── Drawer item ────────────────────────────────────────────────────────────
function DrawerItem({ icon, label, color = '#475569', onPress, badge }) {
    return (
        <Pressable onPress={onPress} style={styles.drawerItem}>
            <View style={[styles.drawerIconWrap, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={[styles.drawerLabel, { color }]}>{label}</Text>
            {badge > 0 && (
                <View style={styles.drawerBadge}>
                    <Text style={styles.drawerBadgeText}>{badge}</Text>
                </View>
            )}
        </Pressable>
    );
}

// ── Ecrã principal ──────────────────────────────────────────────────────────
export default function MapScreen({ navigation }) {
    const { user, profile, isAdmin, signOut } = useAuth();

    const [region, setRegion] = useState({
        latitude: 39.5, longitude: -8.0, latitudeDelta: 3.5, longitudeDelta: 3.5,
    });
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [places, setPlaces] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [activeTab, setActiveTab] = useState('map');

    const drawerAnim = useRef(new Animated.Value(-DRAWER_W)).current;
    const mapRef = useRef(null);

    useEffect(() => {
        requestLocation();
        fetchPlaces();
    }, []);

    useEffect(() => {
        if (isAdmin) {
            supabase
                .from('places')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending')
                .then(({ count }) => setPendingCount(count ?? 0));
        }
    }, [isAdmin]);

    const openDrawer = () => {
        setDrawerOpen(true);
        Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    };

    const closeDrawer = () => {
        Animated.timing(drawerAnim, { toValue: -DRAWER_W, duration: 220, useNativeDriver: true }).start(() => setDrawerOpen(false));
    };

    const requestLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation(coords);
            const r = { ...coords, latitudeDelta: 0.15, longitudeDelta: 0.15 };
            setRegion(r);
            mapRef.current?.animateToRegion(r, 800);
        } catch (e) { console.error(e); }
    };

    const fetchPlaces = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('places')
                .select(`id, type, name, description, phone, email, website, address_line, city, location,
                    place_accessibility (wheelchair_accessible),
                    place_categories (service_categories (name))`)
                .eq('status', 'approved')
                .eq('is_active', true);
            if (error) throw error;
            setPlaces((data || []).filter(p => parseLocation(p.location)));
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível carregar os lugares.');
        } finally {
            setLoading(false);
        }
    };

    const centerOnUser = () => {
        if (userLocation) {
            mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta: 0.08, longitudeDelta: 0.08 }, 500);
        } else {
            Alert.alert('Localização indisponível', 'Não foi possível obter a tua localização.');
        }
    };

    const handleLogout = async () => {
        closeDrawer();
        try {
            await signOut();
            navigation.replace('Login');
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível terminar sessão.');
        }
    };

    const goTo = (screen) => {
        closeDrawer();
        setTimeout(() => navigation.navigate(screen), 250);
    };

    const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Utilizador';
    const initials = username.charAt(0).toUpperCase();

    const filteredPlaces = places.filter(p => {
        const matchType = filter === 'all' || p.type === filter;
        const q = search.trim().toLowerCase();
        const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q);
        return matchType && matchSearch;
    });

    const categories = (place) =>
        place.place_categories?.map(pc => pc.service_categories?.name).filter(Boolean).join(', ');

    const filters = [
        { key: 'all', label: 'Todos', icon: 'location', color: '#6366f1' },
        { key: 'professional', label: 'Profissionais', icon: 'person', color: '#6c63ff' },
        { key: 'institution', label: 'Centros', icon: 'business', color: '#0ea5e9' },
    ];

    return (
        <View style={tw`flex-1`}>
            {/* ── Mapa ── */}
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation
                showsMyLocationButton={false}
                customMapStyle={LIGHT_MAP_STYLE}
            >
                {filteredPlaces.map(place => {
                    const coord = parseLocation(place.location);
                    const cfg = getConfig(place.type);
                    return (
                        <Marker key={place.id} coordinate={coord} tracksViewChanges={false}>
                            <TearDropMarker color={cfg.color} icon={cfg.icon} />
                            <Callout tooltip>
                                <View style={styles.callout}>
                                    <View style={[styles.calloutBadge, { backgroundColor: cfg.color + '22' }]}>
                                        <Text style={[styles.calloutBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                    <Text style={styles.calloutName}>{place.name}</Text>
                                    {place.city ? <Text style={styles.calloutSub}>📍 {place.city}</Text> : null}
                                    {categories(place) ? <Text style={styles.calloutCat}>🏷️ {categories(place)}</Text> : null}
                                    {place.phone ? <Text style={styles.calloutPhone}>📞 {place.phone}</Text> : null}
                                    {place.place_accessibility?.[0]?.wheelchair_accessible ?
                                        <Text style={styles.calloutAccess}>♿ Acessível</Text> : null}
                                </View>
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            {/* ── Header: hamburger + pesquisa + refresh ── */}
            <View style={styles.headerWrap}>
                <View style={styles.headerCard}>
                    <Pressable onPress={openDrawer} style={styles.iconBtn}>
                        <Ionicons name="menu" size={22} color="#334155" />
                    </Pressable>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Pesquisar locais de apoio..."
                            placeholderTextColor="#94a3b8"
                            value={search}
                            onChangeText={setSearch}
                            returnKeyType="search"
                        />
                        {search.length > 0 && (
                            <Pressable onPress={() => setSearch('')}>
                                <Ionicons name="close-circle" size={16} color="#94a3b8" />
                            </Pressable>
                        )}
                    </View>
                    <Pressable onPress={fetchPlaces} style={styles.iconBtn}>
                        <Ionicons name="refresh" size={22} color="#6366f1" />
                    </Pressable>
                </View>

                {/* Filter pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
                    {filters.map(f => (
                        <FilterPill key={f.key} active={filter === f.key} label={f.label} icon={f.icon}
                            color={f.color} onPress={() => setFilter(f.key)} />
                    ))}
                </ScrollView>
            </View>

            {/* GPS button */}
            <Pressable onPress={centerOnUser} style={styles.gpsBtn}>
                <Ionicons name="locate" size={22} color="#6366f1" />
            </Pressable>

            {/* Contador */}
            <View style={styles.countBadge}>
                <Text style={styles.countText}>{filteredPlaces.length} lugar(es)</Text>
            </View>

            {/* ── Bottom bar ── */}
            <View style={styles.bottomBar}>
                <BottomBtn icon="map" label="Mapa" color="#6366f1" active={activeTab === 'map'} onPress={() => setActiveTab('map')} />
                <BottomBtn icon="add-circle" label="Sugerir" color="#22c55e" active={activeTab === 'suggest'} onPress={() => { setActiveTab('suggest'); navigation.navigate('SuggestPlace'); }} />
                <BottomBtn icon="heart" label="Doações" color="#f43f5e" active={activeTab === 'donate'} onPress={() => setActiveTab('donate')} />
                <BottomBtn icon="chatbubbles" label="Comunidade" color="#8b5cf6" active={activeTab === 'community'} onPress={() => setActiveTab('community')} />
            </View>

            {/* ── Drawer overlay ── */}
            {drawerOpen && (
                <Modal transparent animationType="none" onRequestClose={closeDrawer}>
                    {/* Fundo escuro */}
                    <Pressable style={styles.drawerOverlay} onPress={closeDrawer} />

                    {/* Painel lateral */}
                    <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
                        {/* Profile header */}
                        <LinearGradient colors={['#4f46e5', '#6c63ff']} style={styles.drawerHeader}>
                            <View style={styles.drawerAvatar}>
                                <Text style={styles.drawerAvatarText}>{initials}</Text>
                            </View>
                            <Text style={styles.drawerUsername}>{username}</Text>
                            <Text style={styles.drawerEmail}>{user?.email}</Text>
                        </LinearGradient>

                        <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.drawerSection}>Principal</Text>
                            <DrawerItem icon="map" label="Mapa" color="#6366f1" onPress={closeDrawer} />
                            <DrawerItem icon="add-circle" label="Sugerir Local" color="#22c55e" onPress={() => goTo('SuggestPlace')} />
                            <DrawerItem icon="heart" label="Doações" color="#f43f5e" onPress={closeDrawer} />
                            <DrawerItem icon="chatbubbles" label="Comunidade" color="#8b5cf6" onPress={closeDrawer} />

                            <Text style={[styles.drawerSection, { marginTop: 12 }]}>Mais</Text>
                            <DrawerItem icon="calendar" label="Agenda" color="#0ea5e9" onPress={closeDrawer} />
                            <DrawerItem icon="star" label="Favoritos" color="#f59e0b" onPress={closeDrawer} />

                            {isAdmin && (
                                <>
                                    <Text style={[styles.drawerSection, { marginTop: 12 }]}>Administração</Text>
                                    <DrawerItem
                                        icon="shield-checkmark"
                                        label="Painel Admin"
                                        color="#f59e0b"
                                        badge={pendingCount}
                                        onPress={() => goTo('Admin')}
                                    />
                                </>
                            )}
                        </ScrollView>

                        {/* Logout */}
                        <Pressable onPress={handleLogout} style={styles.drawerLogout}>
                            <Ionicons name="log-out" size={20} color="#ef4444" />
                            <Text style={styles.drawerLogoutText}>Terminar Sessão</Text>
                        </Pressable>
                    </Animated.View>
                </Modal>
            )}

            {/* Loading */}
            {loading && (
                <View style={tw`absolute inset-0 bg-white/40 items-center justify-center`}>
                    <View style={styles.loadingCard}>
                        <ActivityIndicator size="large" color="#6366f1" />
                        <Text style={styles.loadingText}>A carregar...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

// ── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Pin
    pinBody: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
    pinInner: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    pinTail: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },

    // Header
    headerWrap: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 8 },
    headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6, marginBottom: 10 },
    iconBtn: { padding: 6 },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 6 },
    searchInput: { flex: 1, fontSize: 14, color: '#1e293b', paddingVertical: 0 },

    // Pills
    pillsRow: { paddingRight: 8, gap: 8, flexDirection: 'row' },
    pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
    pillInactive: { backgroundColor: 'white', borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    pillText: { fontSize: 12, fontWeight: '600', color: '#475569' },

    // Callout
    callout: { backgroundColor: 'white', borderRadius: 14, padding: 12, width: 220, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
    calloutBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6 },
    calloutBadgeText: { fontSize: 11, fontWeight: '700' },
    calloutName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    calloutSub: { fontSize: 12, color: '#64748b', marginBottom: 2 },
    calloutCat: { fontSize: 11, color: '#6366f1', marginBottom: 2 },
    calloutPhone: { fontSize: 12, color: '#0ea5e9', marginTop: 2 },
    calloutAccess: { fontSize: 11, color: '#22c55e', marginTop: 4 },

    // GPS & count
    gpsBtn: { position: 'absolute', bottom: 110, right: 16, backgroundColor: 'white', borderRadius: 50, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 5 },
    countBadge: { position: 'absolute', bottom: 110, left: 16, backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    countText: { fontSize: 12, fontWeight: '600', color: '#475569' },

    // Bottom bar
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingBottom: 22, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 12 },
    bottomBtn: { alignItems: 'center', flex: 1 },
    bottomIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
    bottomLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

    // Drawer
    drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 20 },
    drawerHeader: { paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20 },
    drawerAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    drawerAvatarText: { fontSize: 24, fontWeight: '800', color: 'white' },
    drawerUsername: { fontSize: 17, fontWeight: '700', color: 'white' },
    drawerEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    drawerBody: { flex: 1, paddingHorizontal: 12, paddingTop: 16 },
    drawerSection: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 8, marginBottom: 4 },
    drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, marginBottom: 2 },
    drawerIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    drawerLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
    drawerBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, minWidth: 20, alignItems: 'center' },
    drawerBadgeText: { fontSize: 11, fontWeight: '700', color: 'white' },
    drawerLogout: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginBottom: 8 },
    drawerLogoutText: { color: '#ef4444', fontWeight: '700', fontSize: 15, marginLeft: 12 },

    // Loading
    loadingCard: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
    loadingText: { color: '#64748b', marginTop: 12, fontWeight: '500' },
});

// ── Mapa pastel claro ────────────────────────────────────────────────────────
const LIGHT_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#e8f0f7' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6d8ba0' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9d2d8' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#d4e8d4' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#b8dfc0' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f0f4f8' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dde8f0' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c5d5e0' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#d4e0ec' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b3d4e8' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7cafc4' }] },
];
