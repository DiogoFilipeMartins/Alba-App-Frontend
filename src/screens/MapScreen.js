import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';

// Dados mock de profissionais e instituições em Portugal
const MOCK_LOCATIONS = [
    {
        id: 1,
        type: 'professional',
        name: 'Dr. João Silva',
        specialty: 'Psicólogo Clínico',
        phone: '+351 912 345 678',
        coordinate: { latitude: 38.7223, longitude: -9.1393 }, // Lisboa
    },
    {
        id: 2,
        type: 'institution',
        name: 'APPDA Lisboa',
        description: 'Associação Portuguesa para as Perturbações do Desenvolvimento e Autismo',
        phone: '+351 213 513 120',
        coordinate: { latitude: 38.7150, longitude: -9.1500 },
    },
    {
        id: 3,
        type: 'professional',
        name: 'Dra. Maria Santos',
        specialty: 'Terapeuta Ocupacional',
        phone: '+351 918 765 432',
        coordinate: { latitude: 41.1579, longitude: -8.6291 }, // Porto
    },
    {
        id: 4,
        type: 'institution',
        name: 'Centro de Desenvolvimento Infantil',
        description: 'Centro especializado em intervenção precoce',
        phone: '+351 225 123 456',
        coordinate: { latitude: 41.1496, longitude: -8.6109 }, // Porto
    },
    {
        id: 5,
        type: 'diagnostic',
        name: 'Clínica de Diagnóstico PEA',
        specialty: 'Diagnóstico e Avaliação',
        phone: '+351 239 123 456',
        coordinate: { latitude: 40.2033, longitude: -8.4103 }, // Coimbra
    },
    {
        id: 6,
        type: 'professional',
        name: 'Dr. Pedro Costa',
        specialty: 'Pedopsiquiatra',
        phone: '+351 914 567 890',
        coordinate: { latitude: 38.5245, longitude: -8.8926 }, // Setúbal
    },
];

// Cores para cada tipo de localização
const MARKER_COLORS = {
    professional: '#3b82f6', // Azul
    institution: '#22c55e',  // Verde
    diagnostic: '#8b5cf6',   // Roxo
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
    const [selectedMarker, setSelectedMarker] = useState(null);

    useEffect(() => {
        requestLocationPermission();
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
                setLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            setLoading(false);
        } catch (error) {
            console.error('Erro ao obter localização:', error);
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
            Alert.alert(
                'Localização Indisponível',
                'Não foi possível obter a tua localização.',
                [{ text: 'OK' }]
            );
        }
    };

    const getMarkerColor = (type) => MARKER_COLORS[type] || '#6b7280';

    const getMarkerIcon = (type) => {
        switch (type) {
            case 'professional':
                return 'person';
            case 'institution':
                return 'business';
            case 'diagnostic':
                return 'medical';
            default:
                return 'location';
        }
    };

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
                {MOCK_LOCATIONS.map((location) => (
                    <Marker
                        key={location.id}
                        coordinate={location.coordinate}
                        pinColor={getMarkerColor(location.type)}
                        onPress={() => setSelectedMarker(location)}
                    >
                        <View style={[tw`w-10 h-10 rounded-full items-center justify-center`, { backgroundColor: getMarkerColor(location.type) }]}>
                            <Ionicons name={getMarkerIcon(location.type)} size={20} color="white" />
                        </View>

                        <Callout>
                            <View style={tw`p-2 w-64`}>
                                <Text style={tw`font-bold text-base mb-1`}>{location.name}</Text>
                                <Text style={tw`text-gray-600 text-sm mb-2`}>
                                    {location.specialty || location.description}
                                </Text>
                                {location.phone && (
                                    <View style={tw`flex-row items-center`}>
                                        <Ionicons name="call" size={14} color="#3b82f6" />
                                        <Text style={tw`text-blue-600 text-sm ml-1`}>{location.phone}</Text>
                                    </View>
                                )}
                            </View>
                        </Callout>
                    </Marker>
                ))}
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
                    <View style={tw`w-10`} />
                </LinearGradient>
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
                    <Text style={tw`text-white font-semibold mb-3`}>Legenda</Text>
                    <View style={tw`flex-row flex-wrap`}>
                        <View style={tw`flex-row items-center mr-4 mb-2`}>
                            <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: MARKER_COLORS.professional }]} />
                            <Text style={tw`text-white text-xs`}>Profissionais</Text>
                        </View>
                        <View style={tw`flex-row items-center mr-4 mb-2`}>
                            <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: MARKER_COLORS.institution }]} />
                            <Text style={tw`text-white text-xs`}>Instituições</Text>
                        </View>
                        <View style={tw`flex-row items-center mb-2`}>
                            <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: MARKER_COLORS.diagnostic }]} />
                            <Text style={tw`text-white text-xs`}>Diagnóstico</Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* Loading Overlay */}
            {loading && (
                <View style={tw`absolute inset-0 bg-black/50 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={tw`text-white mt-4`}>A obter localização...</Text>
                </View>
            )}
        </View>
    );
}
