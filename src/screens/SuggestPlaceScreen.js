import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FIELD_STYLE = tw`bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-sm mb-3`;
const LABEL_STYLE = tw`text-gray-400 text-xs mb-1`;

export default function SuggestPlaceScreen({ navigation }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [locLoading, setLocLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        type: 'professional',
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

    const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

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
            const { error } = await supabase.from('places').insert({
                name: form.name.trim(),
                type: form.type,
                description: form.description.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                website: form.website.trim() || null,
                address_line: form.address_line.trim() || null,
                city: form.city.trim() || null,
                postal_code: form.postal_code.trim() || null,
                location: `POINT(${lng} ${lat})`,
                status: 'pending',
                is_active: true,
                created_by: user?.id ?? null,
            });

            if (error) throw error;

            Alert.alert(
                'Sugestão enviada! 🎉',
                'O teu local foi submetido e será revisto por um administrador.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (e) {
            console.error('Erro ao sugerir local:', e);
            Alert.alert('Erro', e.message || 'Não foi possível enviar a sugestão.');
        } finally {
            setLoading(false);
        }
    };

    const TypeButton = ({ value, label, icon, color }) => (
        <Pressable
            onPress={() => set('type')(value)}
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
        <LinearGradient colors={['#111827', '#0f172a']} style={tw`flex-1`}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={tw`flex-1`}>
                {/* Header */}
                <View style={tw`flex-row items-center px-5 pt-12 pb-4`}>
                    <Pressable onPress={() => navigation.goBack()} style={tw`p-2 mr-3`}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </Pressable>
                    <Text style={tw`text-white text-xl font-bold`}>Sugerir Local</Text>
                </View>

                <ScrollView style={tw`flex-1 px-5`} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Tipo */}
                    <Text style={tw`text-white font-semibold mb-2`}>Tipo de local *</Text>
                    <View style={tw`flex-row mb-4`}>
                        <TypeButton value="professional" label="Profissional" icon="person" color="#3b82f6" />
                        <TypeButton value="institution" label="Instituição" icon="business" color="#22c55e" />
                    </View>

                    {/* Nome */}
                    <Text style={LABEL_STYLE}>Nome *</Text>
                    <TextInput
                        style={FIELD_STYLE}
                        placeholder="Nome do local"
                        placeholderTextColor="#6b7280"
                        value={form.name}
                        onChangeText={set('name')}
                    />

                    {/* Descrição */}
                    <Text style={LABEL_STYLE}>Descrição</Text>
                    <TextInput
                        style={[FIELD_STYLE, tw`h-24`]}
                        placeholder="Breve descrição..."
                        placeholderTextColor="#6b7280"
                        value={form.description}
                        onChangeText={set('description')}
                        multiline
                        textAlignVertical="top"
                    />

                    {/* Contactos */}
                    <Text style={tw`text-white font-semibold mb-2 mt-1`}>Contactos</Text>
                    <Text style={LABEL_STYLE}>Telefone</Text>
                    <TextInput style={FIELD_STYLE} placeholder="Ex: 213 000 000" placeholderTextColor="#6b7280" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />

                    <Text style={LABEL_STYLE}>Email</Text>
                    <TextInput style={FIELD_STYLE} placeholder="email@exemplo.com" placeholderTextColor="#6b7280" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />

                    <Text style={LABEL_STYLE}>Website</Text>
                    <TextInput style={FIELD_STYLE} placeholder="https://..." placeholderTextColor="#6b7280" value={form.website} onChangeText={set('website')} autoCapitalize="none" />

                    {/* Morada */}
                    <Text style={tw`text-white font-semibold mb-2 mt-1`}>Morada</Text>
                    <Text style={LABEL_STYLE}>Rua / Número</Text>
                    <TextInput style={FIELD_STYLE} placeholder="Rua Exemplo, 10" placeholderTextColor="#6b7280" value={form.address_line} onChangeText={set('address_line')} />

                    <View style={tw`flex-row`}>
                        <View style={tw`flex-1 mr-2`}>
                            <Text style={LABEL_STYLE}>Cidade</Text>
                            <TextInput style={FIELD_STYLE} placeholder="Lisboa" placeholderTextColor="#6b7280" value={form.city} onChangeText={set('city')} />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={LABEL_STYLE}>Cód. Postal</Text>
                            <TextInput style={FIELD_STYLE} placeholder="1000-001" placeholderTextColor="#6b7280" value={form.postal_code} onChangeText={set('postal_code')} />
                        </View>
                    </View>

                    {/* Coordenadas */}
                    <Text style={tw`text-white font-semibold mb-2 mt-1`}>Coordenadas *</Text>
                    <Pressable
                        onPress={useMyLocation}
                        style={tw`flex-row items-center justify-center bg-blue-600/20 border border-blue-500 rounded-xl py-3 mb-3`}
                    >
                        {locLoading ? (
                            <ActivityIndicator size="small" color="#3b82f6" />
                        ) : (
                            <>
                                <Ionicons name="locate" size={18} color="#3b82f6" />
                                <Text style={tw`text-blue-400 font-medium ml-2`}>Usar a minha localização</Text>
                            </>
                        )}
                    </Pressable>

                    <View style={tw`flex-row`}>
                        <View style={tw`flex-1 mr-2`}>
                            <Text style={LABEL_STYLE}>Latitude</Text>
                            <TextInput style={FIELD_STYLE} placeholder="38.7169" placeholderTextColor="#6b7280" value={form.lat} onChangeText={set('lat')} keyboardType="decimal-pad" />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={LABEL_STYLE}>Longitude</Text>
                            <TextInput style={FIELD_STYLE} placeholder="-9.1399" placeholderTextColor="#6b7280" value={form.lng} onChangeText={set('lng')} keyboardType="decimal-pad" />
                        </View>
                    </View>

                    {/* Submit */}
                    <Pressable onPress={handleSubmit} disabled={loading} style={tw`mb-10 mt-2`}>
                        <LinearGradient
                            colors={loading ? ['#374151', '#374151'] : ['#3b82f6', '#22d3ee']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={tw`rounded-xl py-4 items-center`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={tw`text-white font-bold text-base`}>Enviar Sugestão</Text>
                            )}
                        </LinearGradient>
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}
