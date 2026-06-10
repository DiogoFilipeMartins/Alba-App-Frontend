import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    RefreshControl,
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

export default function CommunitiesScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [creating, setCreating] = useState(false);
    const [joining, setJoining] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

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
        const unsubscribe = navigation.addListener('focus', () => {
            fetchData();
        });
        return unsubscribe;
    }, [navigation]);

    const handleCreate = async () => {
        if (!newName.trim()) return Alert.alert('Aviso', 'O nome da comunidade é obrigatório.');
        
        try {
            setCreating(true);
            await apiService.createCommunity({ name: newName.trim(), description: newDesc.trim() });
            setNewName('');
            setNewDesc('');
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
            navigation.navigate('CommunityChat', { communityId: community.id, communityName: community.name });
            return;
        }

        try {
            setJoining(community.id);
            await apiService.joinCommunity(community.id);
            navigation.navigate('CommunityChat', { communityId: community.id, communityName: community.name });
            // Atualizar a lista em background
            fetchData();
        } catch (e: any) {
            Alert.alert('Erro', 'Não foi possível juntar-se à comunidade.');
        } finally {
            setJoining(null);
        }
    };

    const renderCommunity = ({ item }: { item: Community }) => (
        <Pressable 
            style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
            onPress={() => handleJoinAndEnter(item)}
            disabled={joining === item.id}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <Ionicons name="people" size={24} color={colors.primary} />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
                    </Text>
                </View>
                {item.is_member ? (
                    <View style={[styles.joinedBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.joinedText}>Aderiu</Text>
                    </View>
                ) : joining === item.id ? (
                    <ActivityIndicator color={colors.primary} />
                ) : (
                    <View style={[styles.joinBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                        <Text style={[styles.joinText, { color: colors.primary }]}>Juntar</Text>
                    </View>
                )}
            </View>
            {!!item.description && (
                <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                </Text>
            )}
        </Pressable>
    );

    if (loading) {
        return (
            <SafeAreaView style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center' }]} edges={['top']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Comunidades</Text>
                <Pressable onPress={() => setModalVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="add" size={20} color={colors.primary} />
                </Pressable>
            </View>

            <FlatList
                data={communities}
                keyExtractor={item => item.id}
                renderItem={renderCommunity}
                contentContainerStyle={styles.list}
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
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.border} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Não existem comunidades. Cria a primeira!</Text>
                    </View>
                }
            />

            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nova Comunidade</Text>
                        
                        <TextInput
                            style={[styles.input, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: colors.textPrimary }]}
                            placeholder="Nome da comunidade"
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

                        <View style={styles.modalActions}>
                            <Pressable onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                            </Pressable>
                            <Pressable onPress={handleCreate} style={[styles.createBtn, { backgroundColor: colors.primary }]} disabled={creating}>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontFamily: 'Poppins_700Bold' },
    addBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 20, gap: 16 },
    card: { padding: 16, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardInfo: { flex: 1 },
    title: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
    subtitle: { fontSize: 13, fontFamily: 'Poppins_400Regular' },
    joinedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    joinedText: { color: '#fff', fontSize: 11, fontFamily: 'Poppins_700Bold' },
    joinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    joinText: { fontSize: 12, fontFamily: 'Poppins_700Bold' },
    description: { fontSize: 14, fontFamily: 'Poppins_400Regular', marginTop: 4, lineHeight: 20 },
    empty: { alignItems: 'center', marginTop: 60, opacity: 0.7 },
    emptyText: { marginTop: 16, fontSize: 15, fontFamily: 'Poppins_500Medium' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontFamily: 'Poppins_700Bold', marginBottom: 20 },
    input: { borderRadius: 16, padding: 16, fontSize: 15, fontFamily: 'Poppins_400Regular', marginBottom: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 12 },
    cancelText: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minWidth: 100, alignItems: 'center' },
    createText: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_700Bold' },
});
