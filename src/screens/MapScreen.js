import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';

// Cores para cada tipo de localização
const MARKER_COLORS = {
    professional: '#3b82f6', // Azul
    institution: '#22c55e',  // Verde
};

// Ícones para cada tipo
const getMarkerIcon = (type) => {
    switch (type) {
        case 'professional': return 'person';
        case 'institution': return 'business';
        default: return 'location';
    }
};

// Converte geography(point) do PostGIS para { latitude, longitude }
const parseLocation = (geoPoint) => {
    if (!geoPoint) return null;
    // O Supabase retorna geography como GeoJSON { type: 'Point', coordinates: [lng, lat] }
    if (geoPoint.coordinates) {
        return {
            longitude: geoPoint.coordinates[0],
            latitude: geoPoint.coordinates[1],
        };
    }
    return null;
};

export default function MapScreen({ navigation }) {
    const [region, setRegion] = useState({
        latitude: 39.5, // Centro de Portugal
        longitude: -8.0,
        latitudeDelta: 3.5,
        longitudeDelta: 3.5,
    });
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [places, setPlaces] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all' | 'professional' | 'institution'

    useEffect(() => {
        requestLocationPermission();
        fetchPlaces();
    }, []);

    const requestLocationPermission = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permissão Negada',
                    'A Alba precisa de acesso à localização para mostrar profissionais próximos.',
                    [{ text: 'OK' }]
                );
                return;
            }
            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch (error) {
            console.error('Erro ao obter localização:', error);
        }
    };

    const fetchPlaces = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('places')
                .select(`
                    id,
                    type,
                    name,
                    description,
                    phone,
                    email,
                    website,
                    address_line,
                    city,
                    location,
                    opening_hours,
                    place_accessibility (
                        wheelchair_accessible,
                        noise_level,
                        sensory_friendly
                    ),
                    place_categories (
                        service_categories ( name )
                    )
                `)
                .eq('status', 'approved')
                .eq('is_active', true);

            if (error) throw error;

            // Filtra apenas lugares com coordenadas válidas
            const withCoords = (data || []).filter(p => parseLocation(p.location));
            setPlaces(withCoords);
        } catch (error) {
            console.error('Erro ao carregar lugares:', error);
            Alert.alert('Erro', 'Não foi possível carregar os lugares. Verifica a tua ligação.');
        } finally {
            setLoading(false);
        }
    };

    const centerOnUser = () => {
        if (userLocation) {
            setRegion({
                ...userLocation,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            });
        } else {
            Alert.alert('Localização Indisponível', 'Não foi possível obter a tua localização.');
        }
    };

    const getMarkerColor = (type) => MARKER_COLORS[type] || '#6b7280';

    const filteredPlaces = filter === 'all'
        ? places
        : places.filter(p => p.type === filter);

    const categories = (place) =>
        place.place_categories?.map(pc => pc.service_categories?.name).filter(Boolean).join(', ');

    return (
        <View style={tw`flex-1`}>
            {/* Map */}
            <MapView
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                region={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {filteredPlaces.map((place) => {
                    const coord = parseLocation(place.location);
                    return (
                        <Marker
                            key={place.id}
                            coordinate={coord}
                            pinColor={getMarkerColor(place.type)}
                        >
                            <View style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: getMarkerColor(place.type) }]}>
                                <Ionicons name={getMarkerIcon(place.type)} size={20} color="white" />
                            </View>

                            <Callout>
                                <View style={tw`p-2 w-64`}>
                                    <Text style={tw`font-bold text-base mb-1`}>{place.name}</Text>
                                    {place.description ? (
                                        <Text style={tw`text-gray-600 text-sm mb-1`}>{place.description}</Text>
                                    ) : null}
                                    {place.city ? (
                                        <Text style={tw`text-gray-500 text-xs mb-1`}>📍 {place.city}</Text>
                                    ) : null}
                                    {categories(place) ? (
                                        <Text style={tw`text-blue-500 text-xs mb-1`}>🏷️ {categories(place)}</Text>
                                    ) : null}
                                    {place.phone ? (
                                        <View style={tw`flex-row items-center mt-1`}>
                                            <Ionicons name="call" size={14} color="#3b82f6" />
                                            <Text style={tw`text-blue-600 text-sm ml-1`}>{place.phone}</Text>
                                        </View>
                                    ) : null}
                                    {place.place_accessibility?.[0]?.wheelchair_accessible ? (
                                        <Text style={tw`text-green-600 text-xs mt-1`}>♿ Acessível</Text>
                                    ) : null}
                                </View>
                            </Callout>
                        </Marker>
                    );
                })}
            </MapView>

            {/* Header */}
            <View style={tw`absolute top-0 left-0 right-0 pt-12 px-5`}>
                <LinearGradient
                    colors={['rgba(17, 24, 39, 0.95)', 'rgba(17, 24, 39, 0.7)']}
                    style={tw`rounded-2xl flex-row items-center justify-between px-4 py-3`}
                >
                    <Pressable onPress={() => navigation.goBack()} style={tw`p-2`}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </Pressable>
                    <Text style={tw`text-white text-lg font-bold`}>Mapa de Apoio</Text>
                    <Pressable onPress={fetchPlaces} style={tw`p-2`}>
                        <Ionicons name="refresh" size={22} color="white" />
                    </Pressable>
                </LinearGradient>
            </View>

            {/* Filter Buttons */}
            <View style={tw`absolute top-32 left-5 right-5 flex-row justify-center`}>
                {[
                    { key: 'all', label: 'Todos' },
                    { key: 'professional', label: 'Profissionais' },
                    { key: 'institution', label: 'Instituições' },
                ].map(f => (
                    <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={[
                            tw`mr-2 px-3 py-1 rounded-full`,
                            { backgroundColor: filter === f.key ? '#3b82f6' : 'rgba(17,24,39,0.85)' }
                        ]}
                    >
                        <Text style={tw`text-white text-xs font-semibold`}>{f.label}</Text>
                    </Pressable>
                ))}
            </View>

            {/* My Location Button */}
            <Pressable
                onPress={centerOnUser}
                style={tw`absolute bottom-24 right-5 bg-white rounded-full p-4 shadow-lg`}
            >
                <Ionicons name="locate" size={24} color="#3b82f6" />
            </Pressable>

            {/* Legend */}
            <View style={tw`absolute bottom-5 left-5 right-5`}>
                <LinearGradient
                    colors={['rgba(17, 24, 39, 0.95)', 'rgba(17, 24, 39, 0.8)']}
                    style={tw`rounded-2xl p-4`}
                >
                    <View style={tw`flex-row items-center justify-between mb-2`}>
                        <Text style={tw`text-white font-semibold`}>Legenda</Text>
                        <Text style={tw`text-gray-400 text-xs`}>{filteredPlaces.length} lugar(es)</Text>
                    </View>
                    <View style={tw`flex-row flex-wrap`}>
                        <View style={tw`flex-row items-center mr-4 mb-1`}>
                            <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: MARKER_COLORS.professional }]} />
                            <Text style={tw`text-white text-xs`}>Profissionais</Text>
                        </View>
                        <View style={tw`flex-row items-center mb-1`}>
                            <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: MARKER_COLORS.institution }]} />
                            <Text style={tw`text-white text-xs`}>Instituições</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Loading Overlay */}
            {loading && (
                <View style={tw`absolute inset-0 bg-black/50 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={tw`text-white mt-4`}>A carregar lugares...</Text>
                </View>
            )}
        </View>
    );
}
