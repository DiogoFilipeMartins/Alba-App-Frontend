import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import tw from 'twrnc';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/apiService';

type Props = NativeStackScreenProps<RootStackParamList, 'MapPicker'>;

export default function MapPickerScreen({ navigation, route }: Props) {
    const [mapboxToken, setMapboxToken] = useState<string | null>(null);
    const initial = route.params?.initialCoords ?? null;

    const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(
        initial ? { latitude: initial.lat, longitude: initial.lng } : null
    );
    const [locLoading, setLocLoading] = useState(false);
    const cameraRef = useRef<Mapbox.Camera>(null);

    useEffect(() => {
        if (mapboxToken) {
            Mapbox.setAccessToken(mapboxToken);
        }
    }, [mapboxToken]);

    useEffect(() => {
        (async () => {
            try {
                console.log('[MapPickerDebug] A buscar token do Mapbox...');
                const res = await apiService.getMapboxToken();
                console.log('[MapPickerDebug] Resposta do backend:', res);
                if (res && res.token && !res.token.startsWith('pk.mock_')) {
                    console.log('[MapPickerDebug] Token válido obtido com sucesso!');
                    setMapboxToken(res.token);
                } else {
                    console.warn('[MapPickerDebug] Token recebido é inválido ou mock:', res?.token);
                }
            } catch (e) {
                console.error('[MapPickerDebug] Erro ao buscar token do Mapbox:', e);
            }
        })();
    }, []);

    useEffect(() => {
        if (initial) return;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({});
                cameraRef.current?.setCamera({
                    centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
                    zoomLevel: 14,
                    animationDuration: 800,
                });
            } catch (_) { }
        })();
    }, []);

    const handleMapPress = (feature: any) => {
        const [longitude, latitude] = feature.geometry.coordinates;
        setMarker({ latitude, longitude });
    };

    const centerOnUser = async () => {
        try {
            setLocLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos de acesso à localização.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            cameraRef.current?.setCamera({
                centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
                zoomLevel: 14,
                animationDuration: 500,
            });
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível obter a localização.');
        } finally {
            setLocLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!marker) {
            Alert.alert('Nenhum ponto selecionado', 'Toca no mapa para escolher a localização.');
            return;
        }
        (navigation as any).navigate('Main', {
            screen: 'SuggestPlace',
            params: {
                pickedCoords: { lat: marker.latitude, lng: marker.longitude },
            }
        });
    };

    if (!mapboxToken) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
                <ActivityIndicator size="large" color="#16db65" />
                <Text style={tw`text-white font-medium mt-4`}>A carregar credenciais do mapa...</Text>
            </View>
        );
    }

    return (
        <View style={tw`flex-1`}>
            <Mapbox.MapView
                style={StyleSheet.absoluteFillObject}
                styleURL={Mapbox.StyleURL.Street}
                onPress={handleMapPress}
            >
                <Mapbox.Camera
                    ref={cameraRef}
                    defaultSettings={{
                        centerCoordinate: initial ? [initial.lng, initial.lat] : [-8.0, 39.5],
                        zoomLevel: initial ? 14 : 6,
                    }}
                />
                <Mapbox.UserLocation />
                {marker && (
                    <Mapbox.MarkerView
                        id="marker-suggested"
                        coordinate={[marker.longitude, marker.latitude]}
                    >
                        <Ionicons name="location" size={36} color="#16db65" />
                    </Mapbox.MarkerView>
                )}
            </Mapbox.MapView>

            <View style={tw`absolute top-0 left-0 right-0 pt-12 px-5`}>
                <View style={[tw`rounded-2xl flex-row items-center px-4 py-3`, { backgroundColor: 'rgba(17,24,39,0.97)' }]}>
                    <Pressable onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </Pressable>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-white text-base font-bold`}>Escolher Localização</Text>
                        <Text style={tw`text-gray-400 text-xs`}>Toca no mapa para colocar o pin</Text>
                    </View>
                </View>
            </View>

            {!marker && (
                <View style={tw`absolute inset-0 items-center justify-center pointer-events-none`}>
                    <View style={tw`bg-black/60 rounded-2xl px-5 py-3 items-center`}>
                        <Ionicons name="finger-print" size={32} color="#16db65" />
                        <Text style={tw`text-white font-medium mt-1 text-sm`}>Toca para marcar</Text>
                    </View>
                </View>
            )}

            <Pressable
                onPress={centerOnUser}
                style={tw`absolute bottom-32 right-5 bg-white rounded-full p-4 shadow-lg`}
            >
                {locLoading ? (
                    <ActivityIndicator size="small" color="#058c42" />
                ) : (
                    <Ionicons name="locate" size={24} color="#058c42" />
                )}
            </Pressable>

            {marker && (
                <View style={tw`absolute bottom-24 left-5 right-5`}>
                    <View style={[tw`rounded-2xl px-4 py-3 flex-row items-center`, { backgroundColor: 'rgba(17,24,39,0.97)' }]}>
                        <Ionicons name="location" size={18} color="#16db65" style={tw`mr-2`} />
                        <Text style={tw`text-white text-xs flex-1`} numberOfLines={1}>
                            {marker.latitude.toFixed(6)}, {marker.longitude.toFixed(6)}
                        </Text>
                        <Pressable onPress={() => setMarker(null)} style={tw`p-1 ml-2`}>
                            <Ionicons name="close-circle" size={18} color="#6b7280" />
                        </Pressable>
                    </View>
                </View>
            )}

            <View style={tw`absolute bottom-5 left-5 right-5`}>
                <Pressable onPress={handleConfirm} disabled={!marker}>
                    <View style={[tw`rounded-2xl py-4 items-center flex-row justify-center`, { backgroundColor: marker ? '#058c42' : '#374151' }]}>
                        <Ionicons name="checkmark-circle" size={20} color={marker ? 'white' : '#6b7280'} style={tw`mr-2`} />
                        <Text style={[tw`font-bold text-base`, { color: marker ? 'white' : '#6b7280' }]}>
                            Confirmar Localização
                        </Text>
                    </View>
                </Pressable>
            </View>
        </View>
    );
}
