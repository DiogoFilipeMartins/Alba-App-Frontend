import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    RefreshControl,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { apiService, Community } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Communities'>,
    NativeStackScreenProps<RootStackParamList>
>;

const COLORS = ['#6D28D9', '#0369a1', '#0f766e', '#b45309', '#be185d', '#047857', '#7c3aed', '#1d4ed8'];

const getAvatarColor = (id: string) => {
    const palette = ['#6D28D9', '#0369a1', '#0f766e', '#b45309', '#be185d', '#047857', '#c2410c', '#1d4ed8'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
};

export default function CommunitiesScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newColor, setNewColor] = useState(COLORS[0]);

    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            const data = await apiService.getCommunities();
            setCommunities(data);
        } catch (error: any) {
            console.error('Erro ao carregar comunidades', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        const unsubscribe = navigation.addListener('focus', () => fetchData());
        return unsubscribe;
    }, [navigation]);

    const myCommunities = useMemo(() => communities.filter(c => c.is_member), [communities]);

    const allFiltered = useMemo(() => {
        const others = communities.filter(c => !c.is_member);
        if (!search.trim()) return others;
        return others.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }, [communities, search]);

    const handleCreate = async () => {
        if (!newName.trim()) return Alert.alert('Aviso', 'O nome da comunidade é obrigatório.');
        try {
            setCreating(true);
            await apiService.createCommunity({ name: newName.trim(), description: newDesc.trim() });
            setNewName(''); setNewDesc(''); setNewColor(COLORS[0]);
            setModalVisible(false);
            fetchData();
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível criar a comunidade.');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinAndEnter = async (community: Community) => {
        if (community.is_member) {
            navigation.navigate('CommunityChat', {
                communityId: community.id,
                communityName: community.name,
                communityColor: community.color || colors.primary,
            });
            return;
        }
        try {
            setJoining(community.id);
            await apiService.joinCommunity(community.id);
            navigation.navigate('CommunityChat', {
                communityId: community.id,
                communityName: community.name,
                communityColor: community.color || colors.primary,
            });
            fetchData();
        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível juntar-se à comunidade.');
        } finally {
            setJoining(null);
        }
    };

    const openDetail = (community: Community) => {
        navigation.navigate('CommunityDetail', {
            communityId: community.id,
            communityName: community.name,
            communityColor: community.color || colors.primary,
            description: community.description,
            memberCount: community.member_count,
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center' }]} edges={['top']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} colors={[colors.primary]} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Comunidades</Text>
                        <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Conecta-te com a tua rede</Text>
                    </View>
                    <Pressable onPress={() => setModalVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </Pressable>
                </View>

                {/* Search bar */}
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                    <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Pesquisar comunidades..."
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <Pressable onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>

                {/* My Communities */}
                {myCommunities.length > 0 && !search && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>As Minhas Comunidades</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.myCommunitiesScroll}>
                            {myCommunities.map(c => {
                                const accentColor = c.color || getAvatarColor(c.id);
                                return (
                                    <Pressable
                                        key={c.id}
                                        style={[styles.myCard, { backgroundColor: accentColor }]}
                                        onPress={() => handleJoinAndEnter(c)}
                                        onLongPress={() => openDetail(c)}
                                    >
                                        <View style={styles.myCardIconWrap}>
                                            <Ionicons name="people" size={26} color="rgba(255,255,255,0.9)" />
                                        </View>
                                        <Text style={styles.myCardName} numberOfLines={2}>{c.name}</Text>
                                        <View style={styles.myCardMeta}>
                                            <Ionicons name="person" size={11} color="rgba(255,255,255,0.75)" />
                                            <Text style={styles.myCardCount}>{c.member_count || 0}</Text>
                                        </View>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Discover */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        {search ? `Resultados para "${search}"` : 'Descobrir'}
                    </Text>
                    {allFiltered.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {search ? 'Nenhuma comunidade encontrada.' : 'Ainda não há comunidades. Cria a primeira!'}
                            </Text>
                        </View>
                    ) : (
                        allFiltered.map(item => {
                            const accentColor = item.color || getAvatarColor(item.id);
                            return (
                                <Pressable
                                    key={item.id}
                                    style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
                                    onPress={() => handleJoinAndEnter(item)}
                                    onLongPress={() => openDetail(item)}
                                    disabled={joining === item.id}
                                >
                                    <View style={[styles.cardIcon, { backgroundColor: accentColor }]}>
                                        <Ionicons name="people" size={22} color="#fff" />
                                    </View>
                                    <View style={styles.cardInfo}>
                                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                        {!!item.description && (
                                            <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
                                        )}
                                        <View style={styles.cardMeta}>
                                            <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                                            <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>{item.member_count || 0} membros</Text>
                                        </View>
                                    </View>
                                    {joining === item.id ? (
                                        <ActivityIndicator color={accentColor} />
                                    ) : (
                                        <View style={[styles.joinBtn, { backgroundColor: accentColor }]}>
                                            <Text style={styles.joinText}>Juntar</Text>
                                        </View>
                                    )}
                                </Pressable>
                            );
                        })
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Create Community Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHandle} />
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nova Comunidade</Text>

                        {/* Color picker */}
                        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>COR</Text>
                        <View style={styles.colorRow}>
                            {COLORS.map(c => (
                                <Pressable
                                    key={c}
                                    onPress={() => setNewColor(c)}
                                    style={[styles.colorBtn, { backgroundColor: c }, newColor === c && styles.colorBtnSelected]}
                                >
                                    {newColor === c && <Ionicons name="checkmark" size={14} color="#fff" />}
                                </Pressable>
                            ))}
                        </View>

                        <TextInput
                            style={[styles.input, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: colors.textPrimary }]}
                            placeholder="Nome da comunidade *"
                            placeholderTextColor={colors.textMuted}
                            value={newName}
                            onChangeText={setNewName}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: colors.textPrimary }]}
                            placeholder="Descrição (opcional)"
                            placeholderTextColor={colors.textMuted}
                            value={newDesc}
                            onChangeText={setNewDesc}
                            multiline
                        />

                        {/* Preview */}
                        <View style={[styles.previewCard, { backgroundColor: newColor }]}>
                            <Ionicons name="people" size={24} color="#fff" />
                            <Text style={styles.previewName}>{newName || 'Nome da Comunidade'}</Text>
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable onPress={handleCreate} style={[styles.createBtn, { backgroundColor: newColor }]} disabled={creating}>
                                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createText}>Criar</Text>}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold' },
    headerSub: { fontSize: 13, fontFamily: 'Poppins_400Regular', marginTop: -2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: 'Poppins_400Regular', paddingVertical: 0 },
    section: { marginTop: 20, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold', marginBottom: 12 },
    myCommunitiesScroll: { gap: 12, paddingRight: 4, paddingBottom: 4 },
    myCard: { width: 130, borderRadius: 20, padding: 16, justifyContent: 'space-between', minHeight: 130 },
    myCardIconWrap: { marginBottom: 8 },
    myCardName: { color: '#fff', fontSize: 13, fontFamily: 'Poppins_700Bold', flex: 1 },
    myCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
    myCardCount: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Poppins_500Medium' },
    card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 18, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    cardIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
    cardDesc: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 1 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    cardMetaText: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
    joinBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    joinText: { color: '#fff', fontSize: 12, fontFamily: 'Poppins_700Bold' },
    empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText: { fontSize: 14, fontFamily: 'Poppins_500Medium', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 20 },
    fieldLabel: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 0.5, marginBottom: 8 },
    colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    colorBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    colorBtnSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    input: { borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Poppins_400Regular', marginBottom: 12 },
    textArea: { height: 80, textAlignVertical: 'top' },
    previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, marginBottom: 20 },
    previewName: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold', flex: 1 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center' },
    cancelText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    createBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, minWidth: 100, alignItems: 'center' },
    createText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
});
