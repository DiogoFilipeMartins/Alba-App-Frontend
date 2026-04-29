import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import tw from 'twrnc';
import { apiService } from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'SuggestPlace'>;


const FIELD_STYLE = tw`bg-[#1a1a1a] border border-[#058c42]/20 rounded-xl px-4 py-3 text-white text-sm mb-3`;
const LABEL_STYLE = tw`text-gray-500 text-xs mb-1`;

export default function SuggestPlaceScreen({ navigation, route }: Props) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        type: 'professional' as 'professional' | 'institution',
        description: '',
        phone: '',
        email: '',
        website: '',
        address_line: '',
        city: '',
        postal_code: '',
        lat: '',
        lng: '',
    });

    const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

    useEffect(() => {
        const coords = route.params?.pickedCoords;
        if (coords) {
            setForm((f) => ({
                ...f,
                lat: String(coords.lat),
                lng: String(coords.lng),
            }));
        }
    }, [route.params?.pickedCoords]);

    const useMyLocation = async () => {
        try {
            setLocLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permissão negada', 'Precisamos de acesso à localização.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            setForm((f) => ({
                ...f,
                lat: String(loc.coords.latitude),
                lng: String(loc.coords.longitude),
            }));
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível obter a localização.');
        } finally {
            setLocLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.lat.trim() || !form.lng.trim()) {
            Alert.alert('Campos obrigatórios', 'Preenche pelo menos o nome e as coordenadas.');
            return;
        }
        const lat = parseFloat(form.lat);
        const lng = parseFloat(form.lng);
        if (isNaN(lat) || isNaN(lng)) {
            Alert.alert('Coordenadas inválidas', 'Latitude e longitude devem ser números.');
            return;
        }

        try {
            setLoading(true);
            await apiService.createPlace({
                name: form.name.trim(),
                type: form.type,
                description: form.description.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                website: form.website.trim() || null,
                address_line: form.address_line.trim() || null,
                city: form.city.trim() || null,
                postal_code: form.postal_code.trim() || null,
                latitude: lat,
                longitude: lng,
                created_by: user?.id ?? null,
            });

            Alert.alert(
                'Sugestão enviada! 🎉',
                'O teu local foi submetido e será revisto por um administrador.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (e: any) {
            console.error('Erro ao sugerir local:', e);
            Alert.alert('Erro', e.message || 'Não foi possível enviar a sugestão.');
        } finally {
            setLoading(false);
        }
    };

    const TypeButton = ({ value, label, icon, color }: { value: 'professional' | 'institution', label: string, icon: any, color: string }) => (
        <Pressable
            onPress={() => setForm(f => ({ ...f, type: value }))}
            style={[
                tw`flex-1 flex-row items-center justify-center py-3 rounded-xl border mr-2`,
                form.type === value
                    ? { backgroundColor: color + '30', borderColor: color }
                    : tw`border-gray-600 bg-gray-800`,
            ]}
        >
            <Ionicons name={icon} size={18} color={form.type === value ? color : '#6b7280'} />
            <Text style={[tw`ml-2 font-medium text-sm`, { color: form.type === value ? color : '#6b7280' }]}>
                {label}
            </Text>
        </Pressable>
    );

    return (
        <View style={tw`flex-1 bg-[#020202]`}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1`}>
                <View style={tw`flex-row items-center px-5 pt-12 pb-4`}>
                    <Text style={tw`text-white text-xl font-bold`}>Sugerir Local</Text>
                </View>

                <ScrollView style={tw`flex-1 px-5`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <Text style={tw`text-white font-semibold mb-2`}>Tipo de local *</Text>
                    <View style={tw`flex-row mb-4`}>
                        <TypeButton value="professional" label="Profissional" icon="person" color="#16db65" />
                        <TypeButton value="institution" label="Instituição" icon="business" color="#22c55e" />
                    </View>

                    <Text style={LABEL_STYLE}>Nome *</Text>
                    <TextInput
                        style={FIELD_STYLE as any}
                        placeholder="Nome do local"
                        placeholderTextColor="#6b7280"
                        value={form.name}
                        onChangeText={set('name')}
                    />

                    <Text style={LABEL_STYLE}>Descrição</Text>
                    <TextInput
                        style={[FIELD_STYLE, tw`h-24`] as any}
                        placeholder="Breve descrição..."
                        placeholderTextColor="#6b7280"
                        value={form.description}
                        onChangeText={set('description')}
                        multiline
                        textAlignVertical="top"
                    />

                    <Text style={tw`text-white font-semibold mb-2 mt-1`}>Contactos</Text>
                    <Text style={LABEL_STYLE}>Telefone</Text>
                    <TextInput style={FIELD_STYLE as any} placeholder="Ex: 213 000 000" placeholderTextColor="#6b7280" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />

                    <Text style={LABEL_STYLE}>Email</Text>
                    <TextInput style={FIELD_STYLE as any} placeholder="email@exemplo.com" placeholderTextColor="#6b7280" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />

                    <Text style={LABEL_STYLE}>Website</Text>
                    <TextInput style={FIELD_STYLE as any} placeholder="https://..." placeholderTextColor="#6b7280" value={form.website} onChangeText={set('website')} autoCapitalize="none" />

                    <Text style={tw`text-white font-semibold mb-2 mt-1`}>Morada</Text>
                    <Text style={LABEL_STYLE}>Rua / Número</Text>
                    <TextInput style={FIELD_STYLE as any} placeholder="Rua Exemplo, 10" placeholderTextColor="#6b7280" value={form.address_line} onChangeText={set('address_line')} />

                    <View style={tw`flex-row`}>
                        <View style={tw`flex-1 mr-2`}>
                            <Text style={LABEL_STYLE}>Cidade</Text>
                            <TextInput style={FIELD_STYLE as any} placeholder="Lisboa" placeholderTextColor="#6b7280" value={form.city} onChangeText={set('city')} />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={LABEL_STYLE}>Cód. Postal</Text>
                            <TextInput style={FIELD_STYLE as any} placeholder="1000-001" placeholderTextColor="#6b7280" value={form.postal_code} onChangeText={set('postal_code')} />
                        </View>
                    </View>

                    <Text style={tw`text-white font-semibold mb-2 mt-1`}>Localização *</Text>

                    <Pressable
                        onPress={() => navigation.navigate('MapPicker', {
                            initialCoords: form.lat && form.lng
                                ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
                                : null,
                        })}
                        style={tw`flex-row items-center justify-center bg-[#058c42]/20 border border-[#058c42] rounded-xl py-3 mb-3`}
                    >
                        <Ionicons name="map" size={18} color="#16db65" />
                        <Text style={tw`text-[#16db65] font-medium ml-2`}>Escolher no mapa</Text>
                    </Pressable>

                    <Pressable
                        onPress={useMyLocation}
                        style={tw`flex-row items-center justify-center bg-gray-700/60 border border-gray-600 rounded-xl py-3 mb-3`}
                    >
                        {locLoading ? (
                            <ActivityIndicator size="small" color="#9ca3af" />
                        ) : (
                            <>
                                <Ionicons name="locate" size={18} color="#9ca3af" />
                                <Text style={tw`text-gray-400 font-medium ml-2`}>Usar a minha localização (GPS)</Text>
                            </>
                        )}
                    </Pressable>

                    {form.lat && form.lng ? (
                        <View style={tw`flex-row items-center bg-green-600/15 border border-green-700 rounded-xl px-4 py-3 mb-3`}>
                            <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                            <Text style={tw`text-green-400 text-xs ml-2 flex-1`} numberOfLines={1}>
                                {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)}
                            </Text>
                            <Pressable onPress={() => setForm(f => ({ ...f, lat: '', lng: '' }))} style={tw`ml-2`}>
                                <Ionicons name="close-circle" size={18} color="#6b7280" />
                            </Pressable>
                        </View>
                    ) : (
                        <View style={tw`flex-row items-center bg-gray-700/40 border border-gray-600 rounded-xl px-4 py-3 mb-3`}>
                            <Ionicons name="location-outline" size={18} color="#6b7280" />
                            <Text style={tw`text-gray-500 text-xs ml-2`}>Nenhuma localização definida</Text>
                        </View>
                    )}

                    <View style={tw`flex-row`}>
                        <View style={tw`flex-1 mr-2`}>
                            <Text style={LABEL_STYLE}>Latitude (manual)</Text>
                            <TextInput style={FIELD_STYLE as any} placeholder="38.7169" placeholderTextColor="#6b7280" value={form.lat} onChangeText={set('lat')} keyboardType="decimal-pad" />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={LABEL_STYLE}>Longitude (manual)</Text>
                            <TextInput style={FIELD_STYLE as any} placeholder="-9.1399" placeholderTextColor="#6b7280" value={form.lng} onChangeText={set('lng')} keyboardType="decimal-pad" />
                        </View>
                    </View>

                    <Pressable onPress={handleSubmit} disabled={loading} style={tw`mb-10 mt-2`}>
                        <View style={[tw`rounded-xl py-4 items-center`, { backgroundColor: loading ? '#374151' : '#058c42' }]}>
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={tw`text-white font-bold text-base`}>Enviar Sugestão</Text>
                            )}
                        </View>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
