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
} from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';

// ── Cores e ícones por tipo ─────────────────────────────────────────────────
const TYPE_CONFIG = {
    professional: { color: '#6c63ff', icon: 'person', label: 'Profissionais' },
    institution: { color: '#0ea5e9', icon: 'business', label: 'Centros' },
};
const DEFAULT_CONFIG = { color: '#f43f5e', icon: 'location', label: 'Outros' };

const getConfig = (type) => TYPE_CONFIG[type] ?? DEFAULT_CONFIG;

// ── Parser de geography(Point) do PostGIS ───────────────────────────────────
const parseLocation = (geoPoint) => {
    if (!geoPoint?.coordinates) return null;
    return { longitude: geoPoint.coordinates[0], latitude: geoPoint.coordinates[1] };
};

// ── Marcador em forma de teardrop ────────────────────────────────────────────
function TearDropMarker({ color, icon }) {
    return (
        <View style={{ alignItems: 'center' }}>
            {/* Corpo circular */}
            <View style={[styles.pinBody, { backgroundColor: '#1e293b', borderColor: color }]}>
                <View style={[styles.pinInner, { backgroundColor: color }]}>
                    <Ionicons name={icon} size={14} color="white" />
                </View>
            </View>
            {/* Ponteiro */}
            <View style={[styles.pinTail, { borderTopColor: color }]} />
        </View>
    );
}

// ── Filtro pill ──────────────────────────────────────────────────────────────
function FilterPill({ active, label, icon, color, onPress }) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.pill,
                active && { backgroundColor: color, borderColor: color },
                !active && styles.pillInactive,
            ]}
        >
            {icon && <Ionicons name={icon} size={13} color={active ? 'white' : color} style={{ marginRight: 4 }} />}
            <Text style={[styles.pillText, active && { color: 'white' }]}>{label}</Text>
        </Pressable>
    );
}

// ── Botão da barra inferior ──────────────────────────────────────────────────
function BottomBarBtn({ icon, label, color, onPress }) {
    return (
        <Pressable onPress={onPress} style={styles.bottomBtn}>
            <View style={[styles.bottomIcon, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <Text style={styles.bottomLabel}>{label}</Text>
        </Pressable>
    );
}

// ── Ecrã principal ───────────────────────────────────────────────────────────
export default function MapScreen({ navigation }) {
    const [region, setRegion] = useState({
        latitude: 39.5,
        longitude: -8.0,
        latitudeDelta: 3.5,
        longitudeDelta: 3.5,
    });
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [places, setPlaces] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const mapRef = useRef(null);

    useEffect(() => {
        requestLocationPermission();
        fetchPlaces();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            const loc = await Location.getCurrentPositionAsync({});
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation(coords);
            const r = { ...coords, latitudeDelta: 0.15, longitudeDelta: 0.15 };
            setRegion(r);
            mapRef.current?.animateToRegion(r, 800);
        } catch (e) {
            console.error('Erro ao obter localização:', e);
        }
    };

    const fetchPlaces = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('places')
                .select(`
                    id, type, name, description, phone, email,
                    website, address_line, city, location,
                    place_accessibility (wheelchair_accessible),
                    place_categories (service_categories (name))
                `)
                .eq('status', 'approved')
                .eq('is_active', true);
            if (error) throw error;
            setPlaces((data || []).filter(p => parseLocation(p.location)));
        } catch (e) {
            console.error('Erro ao carregar lugares:', e);
            Alert.alert('Erro', 'Não foi possível carregar os lugares.');
        } finally {
            setLoading(false);
        }
    };

    const centerOnUser = () => {
        if (userLocation) {
            const r = { ...userLocation, latitudeDelta: 0.08, longitudeDelta: 0.08 };
            mapRef.current?.animateToRegion(r, 500);
        } else {
            Alert.alert('Localização indisponível', 'Não foi possível obter a tua localização.');
        }
    };

    // Filtro tipo + pesquisa por nome/cidade
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
        <View style={tw`flex-1 bg-[#f0f4f9]`}>
            {/* Mapa */}
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
                        <Marker
                            key={place.id}
                            coordinate={coord}
                            tracksViewChanges={false}
                        >
                            <TearDropMarker color={cfg.color} icon={cfg.icon} />
                            <Callout tooltip>
                                <View style={styles.callout}>
                                    <View style={[styles.calloutBadge, { backgroundColor: cfg.color + '25' }]}>
                                        <Text style={[styles.calloutBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                    <Text style={styles.calloutName}>{place.name}</Text>
                                    {place.city ? (
                                        <Text style={styles.calloutCity}>📍 {place.city}</Text>
                                    ) : null}
                                    {categories(place) ? (
                                        <Text style={styles.calloutCat}>🏷️ {categories(place)}</Text>
                                    ) : null}
                                    {place.phone ? (
                                        <Text style={styles.calloutPhone}>📞 {place.phone}</Text>
                                    ) : null}
                                    {place.place_accessibility?.[0]?.wheelchair_accessible ? (
                                        <Text style={styles.calloutAccess}>♿ Acessível</Text>
                                    ) : null}
                                </View>
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            {/* ── HEADER: barra de pesquisa ── */}
            <View style={styles.headerWrap}>
                <View style={styles.headerCard}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.menuBtn}>
                        <Ionicons name="arrow-back" size={22} color="#334155" />
                    </Pressable>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
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
                    <Pressable onPress={fetchPlaces} style={styles.menuBtn}>
                        <Ionicons name="refresh" size={22} color="#6366f1" />
                    </Pressable>
                </View>

                {/* Filtros */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.pillsRow}
                >
                    {filters.map(f => (
                        <FilterPill
                            key={f.key}
                            active={filter === f.key}
                            label={f.label}
                            icon={f.icon}
                            color={f.color}
                            onPress={() => setFilter(f.key)}
                        />
                    ))}
                </ScrollView>
            </View>

            {/* Botão GPS */}
            <Pressable onPress={centerOnUser} style={styles.gpsBtn}>
                <Ionicons name="locate" size={22} color="#6366f1" />
            </Pressable>

            {/* Contador de resultados */}
            <View style={styles.countBadge}>
                <Text style={styles.countText}>{filteredPlaces.length} lugar(es)</Text>
            </View>

            {/* ── BARRA INFERIOR ── */}
            <View style={styles.bottomBar}>
                <BottomBarBtn
                    icon="hardware-chip"
                    label="Chatbot"
                    color="#8b5cf6"
                    onPress={() => navigation.navigate('Home')}
                />
                <BottomBarBtn
                    icon="list"
                    label="Lista"
                    color="#0ea5e9"
                    onPress={() => {/* TODO */ }}
                />
                <BottomBarBtn
                    icon="calendar"
                    label="Agenda"
                    color="#22c55e"
                    onPress={() => {/* TODO */ }}
                />
                <BottomBarBtn
                    icon="chatbubbles"
                    label="Comunidade"
                    color="#f43f5e"
                    onPress={() => {/* TODO */ }}
                />
            </View>

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

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Pin
    pinBody: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1e293b',
    },
    pinInner: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pinTail: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
    // Header
    headerWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    headerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 18,
        paddingHorizontal: 10,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 10,
    },
    menuBtn: {
        padding: 6,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1e293b',
        paddingVertical: 0,
    },
    // Filter pills
    pillsRow: {
        paddingRight: 8,
        gap: 8,
        flexDirection: 'row',
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    pillInactive: {
        backgroundColor: 'white',
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
    },
    // Callout
    callout: {
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 12,
        width: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    calloutBadge: {
        alignSelf: 'flex-start',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginBottom: 6,
    },
    calloutBadgeText: { fontSize: 11, fontWeight: '700' },
    calloutName: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
    calloutCity: { fontSize: 12, color: '#64748b', marginBottom: 2 },
    calloutCat: { fontSize: 11, color: '#6366f1', marginBottom: 2 },
    calloutPhone: { fontSize: 12, color: '#0ea5e9', marginTop: 2 },
    calloutAccess: { fontSize: 11, color: '#22c55e', marginTop: 4 },
    // GPS button
    gpsBtn: {
        position: 'absolute',
        bottom: 130,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 50,
        padding: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 5,
    },
    // Count badge
    countBadge: {
        position: 'absolute',
        bottom: 130,
        left: 16,
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    countText: { fontSize: 12, fontWeight: '600', color: '#475569' },
    // Bottom bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingBottom: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 12,
    },
    bottomBtn: { alignItems: 'center', flex: 1 },
    bottomIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    bottomLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    // Loading
    loadingCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    loadingText: { color: '#64748b', marginTop: 12, fontWeight: '500' },
});

// ── Estilo claro do mapa (pastel, limpo) ─────────────────────────────────────
const LIGHT_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#e8f0f7' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6d8ba0' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9d2d8' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#d4e8d4' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7c7b' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#b8dfc0' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f0f4f8' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dde8f0' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c5d5e0' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#d4e0ec' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#b3d4e8' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#7cafc4' }] },
];
