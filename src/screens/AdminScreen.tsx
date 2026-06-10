import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    Pressable,
    FlatList,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiService, Place, DonationCampaign } from '../services/apiService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

const MAIN_TABS = [
    { key: 'places', label: 'Locais' },
    { key: 'users', label: 'Utilizadores' },
    { key: 'campaigns', label: 'Campanhas' },
] as const;

const STATUS_TABS = [
    { key: 'pending', label: 'Pendentes' },
    { key: 'approved', label: 'Aprovados' },
    { key: 'rejected', label: 'Rejeitados' },
] as const;

type MainTabKey = typeof MAIN_TABS[number]['key'];
type StatusKey = typeof STATUS_TABS[number]['key'];

const TYPE_LABEL = { professional: 'Profissional', institution: 'Instituição' };
const TYPE_COLOR = { professional: '#3b82f6', institution: '#22c55e' };

export default function AdminScreen({ navigation }: Props) {
    const [mainTab, setMainTab] = useState<MainTabKey>('places');
    const [statusTab, setStatusTab] = useState<StatusKey>('pending');
    const [places, setPlaces] = useState<Place[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);

    // Campaign form modal
    const [campaignModal, setCampaignModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<DonationCampaign | null>(null);
    const [campTitle, setCampTitle] = useState('');
    const [campDesc, setCampDesc] = useState('');
    const [campGoal, setCampGoal] = useState('');
    const [campSaving, setCampSaving] = useState(false);

    const fetchPlaces = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getPlaces({ status: statusTab });
            setPlaces(data ?? []);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível carregar os locais.');
        } finally {
            setLoading(false);
        }
    }, [statusTab]);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getAdminUsers();
            setUsers(data ?? []);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível carregar os utilizadores.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCampaigns = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiService.getAdminCampaigns();
            setCampaigns(data ?? []);
        } catch (e) {
            Alert.alert('Erro', 'Não foi possível carregar as campanhas.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPendingCount = async () => {
        try {
            const { count } = await apiService.getPendingPlacesCount();
            setPendingCount(count ?? 0);
        } catch (e) {
            console.warn('Error fetching pending count:', e);
        }
    };

    useEffect(() => {
        fetchPendingCount();
    }, []);

    useEffect(() => {
        if (mainTab === 'places') fetchPlaces();
        else if (mainTab === 'users') fetchUsers();
        else if (mainTab === 'campaigns') fetchCampaigns();
    }, [mainTab, fetchPlaces, fetchUsers, fetchCampaigns]);

    const updatePlaceStatus = async (id: string, newStatus: string) => {
        try {
            await apiService.updatePlaceStatus(id, newStatus);
            setPlaces((prev) => prev.filter((p) => p.id !== id));
            if (statusTab === 'pending') setPendingCount((c) => Math.max(0, c - 1));
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível atualizar o estado.');
        }
    };

    const confirmPlaceAction = (id: string, newStatus: string, name: string) => {
        const verb = newStatus === 'approved' ? 'aprovar' : 'rejeitar';
        Alert.alert(`Confirmar ${verb}`, `Tens a certeza que queres ${verb} "${name}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: newStatus === 'approved' ? 'Aprovar' : 'Rejeitar', onPress: () => updatePlaceStatus(id, newStatus) },
        ]);
    };

    const toggleUserRole = (user: any) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        const action = newRole === 'admin' ? 'promover a Admin' : 'remover de Admin';
        Alert.alert(`${action}`, `Queres ${action} "${user.full_name || user.email}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Confirmar',
                onPress: async () => {
                    try {
                        const updated = await apiService.updateUserRole(user.id, newRole);
                        setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
                    } catch (e: any) {
                        Alert.alert('Erro', e.message || 'Não foi possível alterar o role.');
                    }
                }
            },
        ]);
    };

    const openNewCampaign = () => {
        setEditingCampaign(null);
        setCampTitle('');
        setCampDesc('');
        setCampGoal('');
        setCampaignModal(true);
    };

    const openEditCampaign = (c: DonationCampaign) => {
        setEditingCampaign(c);
        setCampTitle(c.title);
        setCampDesc(c.description || '');
        setCampGoal(String(c.goal_amount));
        setCampaignModal(true);
    };

    const saveCampaign = async () => {
        if (!campTitle.trim() || !campGoal) {
            Alert.alert('Campos obrigatórios', 'Título e objetivo são obrigatórios.');
            return;
        }
        try {
            setCampSaving(true);
            if (editingCampaign) {
                const updated = await apiService.updateAdminCampaign(editingCampaign.id, {
                    title: campTitle.trim(),
                    description: campDesc.trim() || undefined,
                    goal_amount: Number(campGoal),
                });
                setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? updated : c));
            } else {
                const created = await apiService.createAdminCampaign({
                    title: campTitle.trim(),
                    description: campDesc.trim() || undefined,
                    goal_amount: Number(campGoal),
                });
                setCampaigns(prev => [created, ...prev]);
            }
            setCampaignModal(false);
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível guardar a campanha.');
        } finally {
            setCampSaving(false);
        }
    };

    const toggleCampaignActive = async (c: DonationCampaign) => {
        try {
            const updated = await apiService.updateAdminCampaign(c.id, { is_active: !c.is_active });
            setCampaigns(prev => prev.map(item => item.id === c.id ? updated : item));
        } catch (e: any) {
            Alert.alert('Erro', e.message);
        }
    };

    const renderPlace = ({ item }: { item: Place }) => {
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
                {statusTab === 'pending' && (
                    <View style={tw`flex-row`}>
                        <Pressable onPress={() => confirmPlaceAction(item.id, 'approved', item.name)} style={tw`flex-1 mr-2 bg-green-600/20 border border-green-600 rounded-xl py-2.5 items-center flex-row justify-center`}>
                            <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                            <Text style={tw`text-green-400 font-semibold ml-1.5 text-sm`}>Aprovar</Text>
                        </Pressable>
                        <Pressable onPress={() => confirmPlaceAction(item.id, 'rejected', item.name)} style={tw`flex-1 bg-red-600/20 border border-red-600 rounded-xl py-2.5 items-center flex-row justify-center`}>
                            <Ionicons name="close-circle" size={16} color="#ef4444" />
                            <Text style={tw`text-red-400 font-semibold ml-1.5 text-sm`}>Rejeitar</Text>
                        </Pressable>
                    </View>
                )}
                {statusTab === 'approved' && (
                    <Pressable onPress={() => confirmPlaceAction(item.id, 'rejected', item.name)} style={tw`bg-red-600/20 border border-red-600 rounded-xl py-2 items-center flex-row justify-center`}>
                        <Ionicons name="close-circle" size={16} color="#ef4444" />
                        <Text style={tw`text-red-400 font-semibold ml-1.5 text-sm`}>Rejeitar</Text>
                    </Pressable>
                )}
                {statusTab === 'rejected' && (
                    <Pressable onPress={() => confirmPlaceAction(item.id, 'approved', item.name)} style={tw`bg-green-600/20 border border-green-600 rounded-xl py-2 items-center flex-row justify-center`}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={tw`text-green-400 font-semibold ml-1.5 text-sm`}>Aprovar</Text>
                    </Pressable>
                )}
            </View>
        );
    };

    const renderUser = ({ item }: { item: any }) => (
        <View style={tw`bg-[#1a1a1a] rounded-2xl border border-[#058c42]/20 p-4 mb-3 flex-row items-center`}>
            <View style={tw`w-10 h-10 rounded-full bg-[#058c42]/20 items-center justify-center mr-3`}>
                <Text style={tw`text-white font-bold text-base`}>
                    {(item.full_name || item.email || '?')[0].toUpperCase()}
                </Text>
            </View>
            <View style={tw`flex-1`}>
                <Text style={tw`text-white font-bold text-sm`}>{item.full_name || '—'}</Text>
                <Text style={tw`text-gray-400 text-xs`}>{item.email}</Text>
            </View>
            <Pressable
                onPress={() => toggleUserRole(item)}
                style={[
                    tw`px-3 py-1.5 rounded-xl`,
                    item.role === 'admin'
                        ? tw`bg-yellow-600/20 border border-yellow-600`
                        : tw`bg-gray-600/20 border border-gray-600`
                ]}
            >
                <Text style={[tw`text-xs font-bold`, item.role === 'admin' ? tw`text-yellow-400` : tw`text-gray-400`]}>
                    {item.role === 'admin' ? '⭐ Admin' : 'Utilizador'}
                </Text>
            </Pressable>
        </View>
    );

    const renderCampaign = ({ item }: { item: DonationCampaign }) => {
        const progress = Math.min((Number(item.current_amount) / Number(item.goal_amount)) * 100, 100);
        return (
            <View style={tw`bg-[#1a1a1a] rounded-2xl border border-[#058c42]/20 p-4 mb-3`}>
                <View style={tw`flex-row items-start justify-between mb-2`}>
                    <View style={tw`flex-1 mr-2`}>
                        <Text style={tw`text-white font-bold text-base`}>{item.title}</Text>
                        {item.description ? <Text style={tw`text-gray-400 text-xs mt-1`}>{item.description}</Text> : null}
                    </View>
                    <View style={[tw`px-2 py-0.5 rounded-full`, { backgroundColor: item.is_active ? '#22c55e25' : '#6b728025' }]}>
                        <Text style={[tw`text-xs font-bold`, { color: item.is_active ? '#22c55e' : '#6b7280' }]}>
                            {item.is_active ? 'Ativa' : 'Inativa'}
                        </Text>
                    </View>
                </View>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                    <Text style={tw`text-gray-300 text-sm`}>{Number(item.current_amount).toFixed(2)}€ / {Number(item.goal_amount).toFixed(2)}€</Text>
                    <Text style={tw`text-gray-400 text-xs`}>{progress.toFixed(0)}%</Text>
                </View>
                <View style={tw`h-1.5 bg-[#2a2a2a] rounded-full mb-3 overflow-hidden`}>
                    <View style={[tw`h-full rounded-full`, { width: `${progress}%`, backgroundColor: '#058c42' }]} />
                </View>
                <View style={tw`flex-row gap-2`}>
                    <Pressable onPress={() => openEditCampaign(item)} style={tw`flex-1 bg-blue-600/20 border border-blue-600 rounded-xl py-2 items-center flex-row justify-center`}>
                        <Ionicons name="create-outline" size={14} color="#60a5fa" />
                        <Text style={tw`text-blue-400 font-semibold ml-1.5 text-xs`}>Editar</Text>
                    </Pressable>
                    <Pressable onPress={() => toggleCampaignActive(item)} style={[tw`flex-1 rounded-xl py-2 items-center flex-row justify-center border`, item.is_active ? tw`bg-red-600/20 border-red-600` : tw`bg-green-600/20 border-green-600`]}>
                        <Ionicons name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'} size={14} color={item.is_active ? '#ef4444' : '#22c55e'} />
                        <Text style={[tw`font-semibold ml-1.5 text-xs`, { color: item.is_active ? '#ef4444' : '#22c55e' }]}>{item.is_active ? 'Desativar' : 'Ativar'}</Text>
                    </Pressable>
                </View>
            </View>
        );
    };

    const getCurrentData = () => {
        if (mainTab === 'places') return places;
        if (mainTab === 'users') return users;
        return campaigns;
    };

    const getCurrentRender = () => {
        if (mainTab === 'places') return renderPlace as any;
        if (mainTab === 'users') return renderUser as any;
        return renderCampaign as any;
    };

    return (
        <View style={tw`flex-1 bg-[#020202]`}>
            {/* Header */}
            <View style={tw`flex-row items-center px-5 pt-12 pb-4`}>
                <Pressable onPress={() => navigation.goBack()} style={tw`p-2 mr-3`}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </Pressable>
                <Text style={tw`text-white text-xl font-bold flex-1`}>Painel de Admin</Text>
                {mainTab === 'campaigns' && (
                    <Pressable onPress={openNewCampaign} style={tw`p-2`}>
                        <Ionicons name="add-circle" size={24} color="#16db65" />
                    </Pressable>
                )}
                <Pressable onPress={() => {
                    if (mainTab === 'places') fetchPlaces();
                    else if (mainTab === 'users') fetchUsers();
                    else fetchCampaigns();
                }} style={tw`p-2`}>
                    <Ionicons name="refresh" size={22} color="#9ca3af" />
                </Pressable>
            </View>

            {/* Main Tabs */}
            <View style={tw`flex-row px-5 mb-2`}>
                {MAIN_TABS.map((t) => (
                    <Pressable
                        key={t.key}
                        onPress={() => setMainTab(t.key)}
                        style={[
                            tw`flex-1 items-center py-2.5 rounded-xl mr-2`,
                            mainTab === t.key ? tw`bg-[#058c42]` : tw`bg-[#1a1a1a] border border-[#058c42]/20`,
                        ]}
                    >
                        <View style={tw`flex-row items-center`}>
                            <Text style={[tw`font-semibold text-sm`, mainTab === t.key ? tw`text-white` : tw`text-gray-400`]}>
                                {t.label}
                            </Text>
                            {t.key === 'places' && pendingCount > 0 && (
                                <View style={tw`ml-1.5 bg-red-500 rounded-full w-5 h-5 items-center justify-center`}>
                                    <Text style={tw`text-white text-xs font-bold`}>{pendingCount}</Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                ))}
            </View>

            {/* Sub-tabs for Places */}
            {mainTab === 'places' && (
                <View style={tw`flex-row px-5 mb-4`}>
                    {STATUS_TABS.map((t) => (
                        <Pressable
                            key={t.key}
                            onPress={() => setStatusTab(t.key)}
                            style={[
                                tw`flex-1 items-center py-2 rounded-xl mr-2`,
                                statusTab === t.key ? tw`bg-[#058c42]/30 border border-[#058c42]` : tw`bg-[#111] border border-[#333]`,
                            ]}
                        >
                            <Text style={[tw`font-semibold text-xs`, statusTab === t.key ? tw`text-green-400` : tw`text-gray-500`]}>
                                {t.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {/* List */}
            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
                    <ActivityIndicator size="large" color="#16db65" />
                    <Text style={tw`text-gray-400 mt-3`}>A carregar...</Text>
                </View>
            ) : (
                <FlatList
                    data={getCurrentData()}
                    keyExtractor={(item) => item.id}
                    renderItem={getCurrentRender()}
                    contentContainerStyle={tw`px-5 pb-10`}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={tw`items-center justify-center mt-16`}>
                            <Ionicons name="checkmark-done-circle" size={56} color="#374151" />
                            <Text style={tw`text-gray-500 mt-3 text-base`}>
                                {mainTab === 'places' ? `Nenhum local ${STATUS_TABS.find((t) => t.key === statusTab)?.label.toLowerCase()}`
                                    : mainTab === 'users' ? 'Nenhum utilizador encontrado'
                                    : 'Nenhuma campanha criada'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Campaign Modal */}
            <Modal visible={campaignModal} transparent animationType="slide" onRequestClose={() => setCampaignModal(false)}>
                <View style={tw`flex-1 bg-black/60 justify-end`}>
                    <View style={tw`bg-[#111] rounded-t-3xl p-6`}>
                        <Text style={tw`text-white text-xl font-bold mb-5`}>
                            {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                        </Text>

                        <Text style={tw`text-gray-400 text-xs mb-2 uppercase tracking-wider`}>Título *</Text>
                        <TextInput
                            value={campTitle}
                            onChangeText={setCampTitle}
                            placeholder="Nome da campanha"
                            placeholderTextColor="#4b5563"
                            style={tw`bg-[#1a1a1a] text-white rounded-xl px-4 py-3 mb-4 border border-[#333]`}
                        />

                        <Text style={tw`text-gray-400 text-xs mb-2 uppercase tracking-wider`}>Descrição</Text>
                        <TextInput
                            value={campDesc}
                            onChangeText={setCampDesc}
                            placeholder="Descrição opcional"
                            placeholderTextColor="#4b5563"
                            multiline
                            style={tw`bg-[#1a1a1a] text-white rounded-xl px-4 py-3 mb-4 border border-[#333] h-20`}
                            textAlignVertical="top"
                        />

                        <Text style={tw`text-gray-400 text-xs mb-2 uppercase tracking-wider`}>Objetivo (€) *</Text>
                        <TextInput
                            value={campGoal}
                            onChangeText={setCampGoal}
                            placeholder="Ex: 1000"
                            placeholderTextColor="#4b5563"
                            keyboardType="numeric"
                            style={tw`bg-[#1a1a1a] text-white rounded-xl px-4 py-3 mb-6 border border-[#333]`}
                        />

                        <View style={tw`flex-row gap-3`}>
                            <Pressable onPress={() => setCampaignModal(false)} style={tw`flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl py-3.5 items-center`}>
                                <Text style={tw`text-gray-400 font-semibold`}>Cancelar</Text>
                            </Pressable>
                            <Pressable onPress={saveCampaign} disabled={campSaving} style={tw`flex-1 bg-[#058c42] rounded-xl py-3.5 items-center`}>
                                {campSaving
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={tw`text-white font-bold`}>{editingCampaign ? 'Atualizar' : 'Criar'}</Text>
                                }
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
