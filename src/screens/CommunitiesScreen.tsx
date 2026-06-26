import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ActivityIndicator,
    Modal,
    TextInput,
    RefreshControl,
    FlatList,
    Platform,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../components/CustomAlertModal';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { apiService, Community } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { FontSize, FontFamily } from '../theme/font';

type Props = CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, 'Communities'>,
    NativeStackScreenProps<RootStackParamList>
>;

const COLORS = ['#128C7E', '#075E54', '#34B7F1', '#6D28D9', '#be185d', '#0f766e', '#b45309', '#1d4ed8'];

const getAvatarColor = (id: string) => {
    const palette = ['#128C7E', '#075E54', '#34B7F1', '#6D28D9', '#be185d', '#0f766e', '#c2410c', '#1d4ed8'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
};

const formatLastMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    }
    if (d.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
    }
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
};



export default function CommunitiesScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'my' | 'explore'>('my');

    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newColor, setNewColor] = useState(COLORS[0]);
    const [alertState, setAlertState] = useState({ visible: false, title: '', message: '', icon: undefined as any, iconColor: undefined as any, primaryButton: undefined as any });
    const closeAlert = () => setAlertState(s => ({ ...s, visible: false }));
    const showAlert = (config: Omit<typeof alertState, 'visible'>) => setAlertState({ ...config, visible: true });


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

    const myCommunities = useMemo(() => {
        const filtered = communities.filter(c => c.is_member);
        if (!search.trim()) return filtered;
        return filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }, [communities, search]);

    const exploreCommunities = useMemo(() => {
        const filtered = communities.filter(c => !c.is_member);
        if (!search.trim()) return filtered;
        return filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    }, [communities, search]);

    const handleCreate = async () => {
        if (!newName.trim()) {
            showAlert({ title: 'Aviso', message: 'O nome da comunidade é obrigatório.', icon: 'alert-circle', iconColor: '#f59e0b', primaryButton: undefined });
            return;
        }
        try {
            setCreating(true);
            await apiService.createCommunity({ name: newName.trim(), description: newDesc.trim() });
            setNewName(''); setNewDesc(''); setNewColor(COLORS[0]);
            setModalVisible(false);
            fetchData();
        } catch (e: any) {
            showAlert({ title: 'Erro', message: e.message || 'Não foi possível criar a comunidade.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
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
        if (community.is_private) {
            showAlert({ title: 'Comunidade Privada', message: 'Esta comunidade é privada. Precisas de receber um convite para entrar.', icon: 'lock-closed', iconColor: colors.textMuted, primaryButton: undefined });
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
            showAlert({ title: 'Erro', message: 'Não foi possível juntar-se à comunidade.', icon: 'alert-circle', iconColor: '#ef4444', primaryButton: undefined });
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
            photoUrl: community.photo_url,
        });
    };

    const renderCommunityRow = ({ item }: { item: Community }) => {
        const accentColor = item.color || getAvatarColor(item.id);
        const lastMsg = item.last_message;

        if (activeTab === 'my') {
            return (
                <Pressable
                    style={({ pressed }) => [
                        styles.chatRow,
                        { 
                            backgroundColor: pressed ? (isDark ? '#2C2C2E' : '#EFEFF4') : colors.card,
                            borderColor: colors.border 
                        }
                    ]}
                    onPress={() => handleJoinAndEnter(item)}
                    onLongPress={() => openDetail(item)}
                >
                    <View style={[styles.avatar, { backgroundColor: accentColor }]}>
                        {item.photo_url ? (
                            <Image source={{ uri: item.photo_url }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="people" size={24} color="#fff" />
                        )}
                    </View>
                    <View style={styles.chatInfo}>
                        <View style={styles.chatHeader}>
                            <Text style={[styles.chatTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            {lastMsg && (
                                <Text style={[styles.chatTime, { color: colors.textMuted }]}>
                                    {formatLastMessageTime(lastMsg.created_at)}
                                </Text>
                            )}
                        </View>
                        <View style={styles.chatFooter}>
                            <Text style={[styles.chatDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                                {lastMsg ? (
                                    <Text>
                                        <Text style={{ fontFamily: 'Poppins_700Bold' }}>{lastMsg.sender_name}: </Text>
                                        {lastMsg.content}
                                    </Text>
                                ) : (
                                    'Sem mensagens ainda. Toca para conversar!'
                                )}
                            </Text>
                            <View style={[styles.badge, { backgroundColor: isDark ? '#2c2c2e' : '#F2F2F7' }]}>
                                <Ionicons name="people-outline" size={10} color={colors.textMuted} />
                                <Text style={[styles.badgeText, { color: colors.textMuted }]}>{item.member_count || 0}</Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            );
        } else {
            return (
                <Pressable
                    style={({ pressed }) => [
                        styles.chatRow,
                        { 
                            backgroundColor: pressed ? (isDark ? '#2C2C2E' : '#EFEFF4') : colors.card,
                            borderColor: colors.border 
                        }
                    ]}
                    onPress={() => handleJoinAndEnter(item)}
                    onLongPress={() => openDetail(item)}
                >
                    <View style={[styles.avatar, { backgroundColor: accentColor }]}>
                        {item.photo_url ? (
                            <Image source={{ uri: item.photo_url }} style={styles.avatarImage} />
                        ) : (
                            <Ionicons name="people" size={24} color="#fff" />
                        )}
                    </View>
                    <View style={styles.chatInfo}>
                        <View style={styles.chatHeader}>
                            <Text style={[styles.chatTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                        </View>
                        <Text style={[styles.chatDesc, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                            {item.description || 'Comunidade aberta para apoio e partilha.'}
                        </Text>
                        <View style={styles.exploreFooter}>
                            <View style={styles.memberCountContainer}>
                                <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                                <Text style={[styles.memberCountText, { color: colors.textMuted }]}>
                                    {item.member_count || 0} membros
                                </Text>
                            </View>
                            {joining === item.id ? (
                                <ActivityIndicator color={accentColor} size="small" />
                            ) : item.is_private ? (
                                <View style={[styles.joinBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                                    <Ionicons name="lock-closed" size={11} color={colors.textMuted} />
                                    <Text style={[styles.joinText, { color: colors.textMuted }]}>Privada</Text>
                                </View>
                            ) : (
                                <View style={[styles.joinBtn, { backgroundColor: accentColor }]}>
                                    <Text style={styles.joinText}>Juntar-se</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Pressable>
            );
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center' }]} edges={['top']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    const currentData = activeTab === 'my' ? myCommunities : exploreCommunities;

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Comunidades</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Conecta-te com a tua rede</Text>
                </View>
                <Pressable onPress={() => setModalVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="add" size={24} color="#fff" />
                </Pressable>
            </View>

            {/* Custom Segmented Tab Control */}
            <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
                <Pressable 
                    onPress={() => setActiveTab('my')}
                    style={[
                        styles.tabButton, 
                        activeTab === 'my' && { borderBottomColor: colors.primary }
                    ]}
                >
                    <Text style={[
                        styles.tabText, 
                        { color: activeTab === 'my' ? colors.primary : colors.textSecondary },
                        activeTab === 'my' && styles.tabTextActive
                    ]}>
                        As minhas conversas ({myCommunities.length})
                    </Text>
                </Pressable>
                <Pressable 
                    onPress={() => setActiveTab('explore')}
                    style={[
                        styles.tabButton, 
                        activeTab === 'explore' && { borderBottomColor: colors.primary }
                    ]}
                >
                    <Text style={[
                        styles.tabText, 
                        { color: activeTab === 'explore' ? colors.primary : colors.textSecondary },
                        activeTab === 'explore' && styles.tabTextActive
                    ]}>
                        Descobrir ({exploreCommunities.length})
                    </Text>
                </Pressable>
            </View>

            {/* Search bar */}
            <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary }]}
                    placeholder={activeTab === 'my' ? "Pesquisar as minhas conversas..." : "Pesquisar novas comunidades..."}
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

            {/* FlatList for chats */}
            <FlatList
                data={currentData}
                keyExtractor={item => item.id}
                renderItem={renderCommunityRow}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchData(true)}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={60} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {search ? 'Nenhuma comunidade encontrada.' : 
                             activeTab === 'my' ? 'Ainda não pertences a nenhuma comunidade. Vai a "Descobrir"!' : 
                             'Ainda não há novas comunidades disponíveis. Cria uma no botão +!'}
                        </Text>
                    </View>
                }
            />

            {/* WhatsApp-Style FAB */}
            <Pressable 
                onPress={() => setModalVisible(true)} 
                style={[styles.fab, { backgroundColor: colors.primary }]}
            >
                <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
            </Pressable>

            {/* Create Community Modal (WhatsApp style fullscreen flow) */}
            <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                        <Pressable onPress={() => setModalVisible(false)} style={styles.modalHeaderBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.primary} />
                        </Pressable>
                        <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>Nova Comunidade</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <FlatList
                        data={[{ key: 'form' }]}
                        renderItem={() => (
                            <View style={styles.modalScroll}>
                                {/* WhatsApp-style group avatar */}
                                <View style={styles.avatarSelectionContainer}>
                                    <View style={[styles.bigAvatar, { backgroundColor: newColor }]}>
                                        <Ionicons name="people" size={48} color="#fff" />
                                    </View>
                                </View>

                                {/* Color selection row */}
                                <View style={styles.fieldContainer}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>COR DA COMUNIDADE</Text>
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
                                </View>

                                {/* Input: Group Name */}
                                <View style={styles.fieldContainer}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NOME DA COMUNIDADE</Text>
                                    <View style={[styles.inputUnderline, { borderBottomColor: newName.trim() ? colors.primary : colors.border }]}>
                                        <TextInput
                                            style={[styles.underlineInput, { color: colors.textPrimary }]}
                                            placeholder="Escreve o nome da comunidade..."
                                            placeholderTextColor={colors.textMuted}
                                            value={newName}
                                            onChangeText={(t) => { if (t.length <= 25) setNewName(t); }}
                                            maxLength={25}
                                        />
                                        <Text style={[styles.charCount, { color: colors.textMuted }]}>
                                            {25 - newName.length}
                                        </Text>
                                    </View>
                                </View>

                                {/* Input: Description */}
                                <View style={styles.fieldContainer}>
                                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
                                    <View style={[styles.inputUnderline, { borderBottomColor: newDesc.trim() ? colors.primary : colors.border, minHeight: 60 }]}>
                                        <TextInput
                                            style={[styles.underlineInput, styles.descriptionInput, { color: colors.textPrimary }]}
                                            placeholder="Descreve o propósito desta comunidade..."
                                            placeholderTextColor={colors.textMuted}
                                            value={newDesc}
                                            onChangeText={setNewDesc}
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </View>
                                </View>

                                {/* Large Create Button */}
                                <View style={{ marginTop: 24 }}>
                                    <Pressable 
                                        onPress={handleCreate} 
                                        style={[styles.largeCreateBtn, { backgroundColor: newName.trim() ? colors.primary : colors.border }]}
                                        disabled={!newName.trim() || creating}
                                    >
                                        {creating ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.largeCreateText}>Criar Comunidade</Text>
                                        )}
                                    </Pressable>
                                </View>
                            </View>
                        )}
                        keyExtractor={item => item.key}
                        keyboardShouldPersistTaps="handled"
                    />
                </SafeAreaView>
            </Modal>

            <CustomAlertModal
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                icon={alertState.icon}
                iconColor={alertState.iconColor}
                primaryButton={alertState.primaryButton}
                onClose={closeAlert}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: FontSize.huge, fontFamily: FontFamily.poppinsBold },
    headerSub: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular, marginTop: -2 },
    addBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    
    // Tab Segmented Control
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20, marginBottom: 12 },
    tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabText: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsSemiBold },
    tabTextActive: { fontFamily: FontFamily.poppinsBold },

    searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14 },
    searchInput: { flex: 1, fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular, paddingVertical: 0 },
    
    listContainer: { paddingHorizontal: 20, paddingBottom: 80 },
    
    // Premium chat card styles
    chatRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 16, 
        borderRadius: 20, 
        marginBottom: 12,
        borderWidth: 1,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    avatarImage: { width: '100%', height: '100%', borderRadius: 25 },
    chatInfo: { flex: 1, justifyContent: 'center' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatTitle: { fontSize: FontSize.m, fontFamily: FontFamily.poppinsBold, flex: 1 },
    chatTime: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular },
    chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
    chatDesc: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular, flex: 1, paddingRight: 10 },
    
    badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    badgeText: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsSemiBold },

    exploreFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    memberCountContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    memberCountText: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular },
    joinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    joinText: { color: '#fff', fontSize: FontSize.s, fontFamily: FontFamily.poppinsBold },

    empty: { alignItems: 'center', marginTop: 100, gap: 12, paddingHorizontal: 20 },
    emptyText: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsMedium, textAlign: 'center', lineHeight: 20 },
    
    // FAB
    fab: { width: 56, height: 56, borderRadius: 28, position: 'absolute', right: 20, bottom: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 6 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%' },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC', alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: FontSize.xxxl, fontFamily: FontFamily.poppinsBold, marginBottom: 20 },
    fieldLabel: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsBold, letterSpacing: 0.5, marginBottom: 8 },
    colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    colorBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    colorBtnSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    input: { borderRadius: 16, padding: 16, fontSize: FontSize.m, fontFamily: FontFamily.poppinsRegular, marginBottom: 12 },
    textArea: { height: 80, textAlignVertical: 'top' },
    previewCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 16, marginBottom: 20 },
    previewName: { color: '#fff', fontSize: FontSize.l, fontFamily: FontFamily.poppinsBold, flex: 1 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 14, justifyContent: 'center' },
    cancelText: { fontSize: FontSize.m, fontFamily: FontFamily.poppinsSemiBold },
    createBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, minWidth: 100, alignItems: 'center' },
    createText: { color: '#fff', fontSize: FontSize.m, fontFamily: FontFamily.poppinsBold },

    // Fullscreen creation styles
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
    modalHeaderBtn: { padding: 8 },
    modalHeaderTitle: { fontSize: FontSize.xl, fontFamily: FontFamily.poppinsBold },
    modalScroll: { padding: 24, paddingBottom: 60 },
    avatarSelectionContainer: { alignItems: 'center', marginBottom: 24 },
    bigAvatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    bigAvatarEmoji: { fontSize: 48 },
    cameraOverlay: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
    avatarTip: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular, marginTop: 8 },
    fieldContainer: { marginBottom: 20 },
    inputUnderline: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingVertical: 4 },
    underlineInput: { flex: 1, fontSize: FontSize.l, fontFamily: FontFamily.poppinsMedium, paddingVertical: 6 },
    charCount: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsMedium, marginLeft: 8 },
    descriptionInput: { fontSize: FontSize.s, fontFamily: FontFamily.poppinsRegular },
    largeCreateBtn: { paddingVertical: 14, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    largeCreateText: { color: '#fff', fontSize: FontSize.l, fontFamily: FontFamily.poppinsBold },
});
