import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Map, Camera, UserLocation, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { resolveMapboxStyle } from '../utils/mapUtils';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import tw from 'twrnc';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService } from '../services/apiService';
import CustomAlertModal from '../components/CustomAlertModal';

type Props = NativeStackScreenProps<RootStackParamList, 'MapPicker'>;

export default function MapPickerScreen({ navigation, route }: Props) {
    const [mapboxToken, setMapboxToken] = useState<string | null>(null);
    const [styleJSON, setStyleJSON] = useState<any>(null);
    const [styleError, setStyleError] = useState(false);
    const [styleReloadKey, setStyleReloadKey] = useState(0);
    const initial = route.params?.initialCoords ?? null;
    const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', icon: undefined as any, iconColor: undefined as any, primaryButton: undefined as any });
    const closeAlert = () => setAlertState(s => ({ ...s, visible: false }));
    const showAlert = (config: Omit<typeof alertState, 'visible'>) => setAlertState({ ...config, visible: true });

    const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(
        initial ? { latitude: initial.lat, longitude: initial.lng } : null
    );
    const [locLoading, setLocLoading] = useState(false);
    const cameraRef = useRef<CameraRef>(null);

    // MapLibre does not require setAccessToken at the global level. Access tokens are passed directly in style URLs.

    useEffect(() => {
        (async () => {
            // Token servido pelo backend — sem fallback embebido no bundle.
            try {
                const res = await apiService.getMapboxToken();
                if (res && res.token && !res.token.startsWith('pk.mock_')) {
                    setMapboxToken(res.token);
                } else {
                    console.warn('[Mapbox] Backend não devolveu token válido.');
                }
            } catch (e) {
                console.error('[Mapbox] Erro ao obter token do backend.', e);
            }
        })();
    }, []);

    useEffect(() => {
        if (mapboxToken) {
            const url = `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${mapboxToken}`;
            fetch(url)
                .then(res => res.json())
                .then(json => {
                    setStyleJSON(resolveMapboxStyle(json, mapboxToken));
                    setStyleError(false);
                })
                .catch(err => {
                    console.error('[MapPicker] Erro ao buscar style JSON:', err);
                    setStyleError(true);
                });
        }
    }, [mapboxToken, styleReloadKey]);

    useEffect(() => {
        if (initial) return;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const loc = await Location.getCurrentPositionAsync({});
                cameraRef.current?.easeTo({
                    center: [loc.coords.longitude, loc.coords.latitude],
                    zoom: 14,
                    duration: 800,
                });
            } catch (_) { }
        })();
    }, []);

    const handleMapPress = (event: any) => {
        const [longitude, latitude] = event.nativeEvent.lngLat;
        setMarker({ latitude, longitude });
    };

    const centerOnUser = async () => {
        try {
            setLocLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                showAlert({ title: 'Permissão negada', message: 'Precisamos de acesso à localização para te centrar no mapa.', icon: 'location', iconColor: '#f59e0b', primaryButton: undefined });
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            cameraRef.current?.easeTo({
                center: [loc.coords.longitude, loc.coords.latitude],
                zoom: 14,
                duration: 500,
            });
        } catch (e) {
            showAlert({ title: 'Erro', message: 'Não foi possível obter a localização.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
        } finally {
            setLocLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!marker) {
            showAlert({ title: 'Nenhum ponto selecionado', message: 'Toca no mapa para escolher a localização.', icon: 'map', iconColor: '#f59e0b', primaryButton: undefined });
            return;
        }
        // O ecrã de destino já está no stack por baixo; navegar diretamente
        // reencaminha-o com os params e dispara o efeito que lê pickedCoords.
        const coords = { lat: marker.latitude, lng: marker.longitude };
        const returnTo = route.params?.returnTo ?? 'SuggestPlace';
        navigation.navigate(returnTo as any, { pickedCoords: coords });
    };

    if (styleError && !styleJSON) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-900 px-8`}>
                <Text style={tw`text-white font-medium text-center`}>Não foi possível carregar o mapa. Verifica a ligação à internet.</Text>
                <Pressable
                    onPress={() => { setStyleError(false); setStyleReloadKey(k => k + 1); }}
                    style={tw`mt-4 bg-[#16db65] py-3 px-6 rounded-lg`}
                >
                    <Text style={tw`text-white font-semibold`}>Tentar novamente</Text>
                </Pressable>
            </View>
        );
    }

    if (!mapboxToken || !styleJSON) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-900`}>
                <ActivityIndicator size="large" color="#16db65" />
                <Text style={tw`text-white font-medium mt-4`}>A carregar credenciais do mapa...</Text>
            </View>
        );
    }

    return (
        <View style={tw`flex-1`}>
            <Map
                style={StyleSheet.absoluteFillObject}
                mapStyle={styleJSON}
                onPress={handleMapPress}
            >
                <Camera
                    ref={cameraRef}
                    initialViewState={{
                        center: initial ? [initial.lng, initial.lat] : [-8.0, 39.5],
                        zoom: initial ? 14 : 6,
                    }}
                />
                <UserLocation />
                {marker && (
                    <Marker
                        id="marker-suggested"
                        lngLat={[marker.longitude, marker.latitude]}
                    >
                        <Ionicons name="location" size={36} color="#16db65" />
                    </Marker>
                )}
            </Map>

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

            <CustomAlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                icon={alertState.icon}
                iconColor={alertState.iconColor}
                primaryButton={alertState.primaryButton}
                onClose={closeAlert}
            />
        </View>
    );
}
