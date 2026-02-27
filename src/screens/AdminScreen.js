import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { supabase } from '../lib/supabase';

const STATUS_TABS = [
    { key: 'pending', label: 'Pendentes' },
    { key: 'approved', label: 'Aprovados' },
    { key: 'rejected', label: 'Rejeitados' },
];

const TYPE_LABEL = { professional: 'Profissional', institution: 'Instituição' };
const TYPE_COLOR = { professional: '#3b82f6', institution: '#22c55e' };

export default function AdminScreen({ navigation }) {
    const [tab, setTab] = useState('pending');
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchPlaces = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('places')
                .select('id, name, type, city, status, created_at, created_by')
                .eq('status', tab)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPlaces(data ?? []);
        } catch (e) {
            console.error('AdminScreen fetchPlaces:', e);
            Alert.alert('Erro', 'Não foi possível carregar os locais.');
        } finally {
            setLoading(false);
        }
    }, [tab]);

    const fetchPendingCount = async () => {
        const { count } = await supabase
            .from('places')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');
        setPendingCount(count ?? 0);
    };

    useEffect(() => {
        fetchPlaces();
        fetchPendingCount();
    }, [fetchPlaces]);

    const updateStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase.from('places').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            setPlaces((prev) => prev.filter((p) => p.id !== id));
            if (tab === 'pending') setPendingCount((c) => Math.max(0, c - 1));
        } catch (e) {
            Alert.alert('Erro', e.message || 'Não foi possível atualizar o estado.');
        }
    };

    const confirmAction = (id, newStatus, name) => {
        const verb = newStatus === 'approved' ? 'aprovar' : 'rejeitar';
        Alert.alert(`Confirmar ${verb}`, `Tens a certeza que queres ${verb} "${name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: newStatus === 'approved' ? 'Aprovar' : 'Rejeitar', onPress: () => updateStatus(id, newStatus) },
        ]);
    };

    const renderItem = ({ item }) => {
        const color = TYPE_COLOR[item.type] ?? '#6b7280';
        const date = new Date(item.created_at).toLocaleDateString('pt-PT');

        return (
            <View style={tw`bg-gray-800 rounded-2xl border border-gray-700 p-4 mb-3`}>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                    <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: color + '25' }]}>
                        <Text style={[tw`text-xs font-semibold`, { color }]}>{TYPE_LABEL[item.type] ?? item.type}</Text>
                    </View>
                    <Text style={tw`text-gray-500 text-xs`}>{date}</Text>
                </View>

                <Text style={tw`text-white font-bold text-base mb-0.5`}>{item.name}</Text>
                {item.city ? <Text style={tw`text-gray-400 text-sm mb-3`}>📍 {item.city}</Text> : null}

                {tab === 'pending' && (
                    <View style={tw`flex-row`}>
                        <Pressable
                            onPress={() => confirmAction(item.id, 'approved', item.name)}
                            style={tw`flex-1 mr-2 bg-green-600/20 border border-green-600 rounded-xl py-2.5 items-center flex-row justify-center`}
                        >
                            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                            <Text style={tw`text-green-400 font-semibold ml-1.5 text-sm`}>Aprovar</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => confirmAction(item.id, 'rejected', item.name)}
                            style={tw`flex-1 bg-red-600/20 border border-red-600 rounded-xl py-2.5 items-center flex-row justify-center`}
                        >
                            <Ionicons name="close-circle" size={16} color="#ef4444" />
                            <Text style={tw`text-red-400 font-semibold ml-1.5 text-sm`}>Rejeitar</Text>
                        </Pressable>
                    </View>
                )}

                {tab === 'approved' && (
                    <Pressable
                        onPress={() => confirmAction(item.id, 'rejected', item.name)}
                        style={tw`bg-red-600/20 border border-red-600 rounded-xl py-2 items-center flex-row justify-center`}
                    >
                        <Ionicons name="close-circle" size={16} color="#ef4444" />
                        <Text style={tw`text-red-400 font-semibold ml-1.5 text-sm`}>Rejeitar</Text>
                    </Pressable>
                )}

                {tab === 'rejected' && (
                    <Pressable
                        onPress={() => confirmAction(item.id, 'approved', item.name)}
                        style={tw`bg-green-600/20 border border-green-600 rounded-xl py-2 items-center flex-row justify-center`}
                    >
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={tw`text-green-400 font-semibold ml-1.5 text-sm`}>Aprovar</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    return (
        <LinearGradient colors={['#111827', '#0f172a']} style={tw`flex-1`}>
            {/* Header */}
            <View style={tw`flex-row items-center px-5 pt-12 pb-4`}>
                <Pressable onPress={() => navigation.goBack()} style={tw`p-2 mr-3`}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <Text style={tw`text-white text-xl font-bold flex-1`}>Painel de Admin</Text>
                <Pressable onPress={fetchPlaces} style={tw`p-2`}>
                    <Ionicons name="refresh" size={22} color="#9ca3af" />
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={tw`flex-row px-5 mb-4`}>
                {STATUS_TABS.map((t) => {
                    const active = tab === t.key;
                    return (
                        <Pressable
                            key={t.key}
                            onPress={() => setTab(t.key)}
                            style={[
                                tw`flex-1 items-center py-2.5 rounded-xl mr-2`,
                                active ? tw`bg-blue-600` : tw`bg-gray-800 border border-gray-700`,
                            ]}
                        >
                            <View style={tw`flex-row items-center`}>
                                <Text style={[tw`font-semibold text-sm`, active ? tw`text-white` : tw`text-gray-400`]}>
                                    {t.label}
                                </Text>
                                {t.key === 'pending' && pendingCount > 0 && (
                                    <View style={tw`ml-1.5 bg-red-500 rounded-full w-5 h-5 items-center justify-center`}>
                                        <Text style={tw`text-white text-xs font-bold`}>{pendingCount}</Text>
                                    </View>
                                )}
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            {/* List */}
            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={tw`text-gray-400 mt-3`}>A carregar...</Text>
                </View>
            ) : (
                <FlatList
                    data={places}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={tw`px-5 pb-10`}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center mt-16`}>
                            <Ionicons name="checkmark-done-circle" size={56} color="#374151" />
                            <Text style={tw`text-gray-500 mt-3 text-base`}>
                                Nenhum local {STATUS_TABS.find((t) => t.key === tab)?.label.toLowerCase()}
                            </Text>
                        </View>
                    }
                />
            )}
        </LinearGradient>
    );
}
