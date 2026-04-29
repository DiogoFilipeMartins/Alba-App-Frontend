import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiService, Place } from '../services/apiService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

const STATUS_TABS = [
    { key: 'pending', label: 'Pendentes' },
    { key: 'approved', label: 'Aprovados' },
    { key: 'rejected', label: 'Rejeitados' },
] as const;

type StatusKey = typeof STATUS_TABS[number]['key'];

const TYPE_LABEL = { professional: 'Profissional', institution: 'Instituição' };
const TYPE_COLOR = { professional: '#3b82f6', institution: '#22c55e' };

export default function AdminScreen({ navigation }: Props) {
    const [tab, setTab] = useState<StatusKey>('pending');
    const [places, setPlaces] = useState<Place[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchPlaces = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getPlaces({ status: tab });
            setPlaces(data ?? []);
        } catch (e) {
            console.error('AdminScreen fetchPlaces:', e);
            Alert.alert('Erro', 'Não foi possível carregar os locais.');
        } finally {
            setLoading(false);
        }
    }, [tab]);

    const fetchPendingCount = async () => {
        try {
            const { count } = await apiService.getPendingPlacesCount();
            setPendingCount(count ?? 0);
        } catch (e) {
            console.warn('Error fetching pending count:', e);
        }
    };

    useEffect(() => {
        fetchPlaces();
        fetchPendingCount();
    }, [fetchPlaces]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await apiService.updatePlaceStatus(id, newStatus);
            setPlaces((prev) => prev.filter((p) => p.id !== id));
            if (tab === 'pending') setPendingCount((c) => Math.max(0, c - 1));
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível atualizar o estado.');
        }
    };

    const confirmAction = (id: string, newStatus: string, name: string) => {
        const verb = newStatus === 'approved' ? 'aprovar' : 'rejeitar';
        Alert.alert(`Confirmar ${verb}`, `Tens a certeza que queres ${verb} "${name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: newStatus === 'approved' ? 'Aprovar' : 'Rejeitar', onPress: () => updateStatus(id, newStatus) },
        ]);
    };

    const renderItem = ({ item }: { item: Place }) => {
        const color = TYPE_COLOR[item.type] ?? '#6b7280';
        const date = new Date(item.created_at).toLocaleDateString('pt-PT');

        return (
            <View style={tw`bg-[#1a1a1a] rounded-2xl border border-[#058c42]/20 p-4 mb-3`}>
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
        <View style={tw`flex-1 bg-[#020202]`}>
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
                                active ? tw`bg-[#058c42]` : tw`bg-[#1a1a1a] border border-[#058c42]/20`,
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
                    <ActivityIndicator size="large" color="#16db65" />
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
        </View>
    );
}
