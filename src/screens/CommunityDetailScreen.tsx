import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    Switch,
    Image,
    Modal,
    TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMember } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityDetail'>;

const AVATAR_COLORS = ['#6D28D9', '#0369a1', '#0f766e', '#b45309', '#be185d', '#047857', '#c2410c', '#1d4ed8'];

const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function CommunityDetailScreen({ route, navigation }: Props) {
    const { communityId, communityName, communityColor, description, memberCount } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [leaving, setLeaving] = useState(false);
    
    // Dynamically loaded community states
    const [commDesc, setCommDesc] = useState(description || '');
    const [commColor, setCommColor] = useState(communityColor || colors.primary);
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [createdBy, setCreatedBy] = useState<string | null>(null);
    const [photoUrl, setPhotoUrl] = useState(route.params.photoUrl || '');

    // Edit modal states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editDesc, setEditDesc] = useState(description || '');
    const [editPhotoUrl, setEditPhotoUrl] = useState(route.params.photoUrl || '');
    const [updating, setUpdating] = useState(false);
    
    // Mute Switch Mock State
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        const fetchDetailsAndMembers = async () => {
            try {
                // 1. Fetch community members
                const data = await apiService.getCommunityMembers(communityId);
                setMembers(data);
                setIsMember(data.some(m => m.user_id === user?.id));

                // 2. Fetch communities list to gather description & dates
                const allComms = await apiService.getCommunities();
                const matchedComm = allComms.find(c => c.id === communityId);
                if (matchedComm) {
                    if (matchedComm.description) {
                        setCommDesc(matchedComm.description);
                        setEditDesc(matchedComm.description);
                    }
                    if (matchedComm.color) setCommColor(matchedComm.color);
                    if (matchedComm.created_at) setCreatedAt(matchedComm.created_at);
                    if (matchedComm.created_by) setCreatedBy(matchedComm.created_by);
                    if (matchedComm.photo_url) {
                        setPhotoUrl(matchedComm.photo_url);
                        setEditPhotoUrl(matchedComm.photo_url);
                    }
                }
            } catch (e) {
                console.error('[CommunityDetailScreen] Error fetching info:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchDetailsAndMembers();
    }, [communityId]);

    const handleSaveEdit = async () => {
        try {
            setUpdating(true);
            const updatedComm = await apiService.updateCommunity(communityId, {
                description: editDesc.trim(),
                photo_url: editPhotoUrl.trim(),
            });
            setCommDesc(updatedComm.description || '');
            setPhotoUrl(updatedComm.photo_url || '');
            setEditModalVisible(false);
            Alert.alert('Sucesso', 'Dados da comunidade atualizados.');
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível atualizar a comunidade.');
        } finally {
            setUpdating(false);
        }
    };

    const handleLeave = () => {
        Alert.alert('Sair da Comunidade', 'Tens a certeza que queres sair desta comunidade?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair', style: 'destructive',
                onPress: async () => {
                    try {
                        setLeaving(true);
                        await apiService.leaveCommunity(communityId);
                        (navigation as any).navigate('Main', { screen: 'Communities' });
                    } catch (e: any) {
                        Alert.alert('Erro', e.message || 'Não foi possível sair.');
                    } finally {
                        setLeaving(false);
                    }
                },
            },
        ]);
    };

    // Literal WhatsApp Theme Colors
    const containerBg = isDark ? '#0B141A' : '#F0F2F5';
    const cardBg = isDark ? '#111B21' : '#FFFFFF';
    const textPrimary = isDark ? '#E9EDEF' : '#111B21';
    const textSecondary = isDark ? '#8696A0' : '#667781';
    const borderCol = isDark ? '#222E35' : '#E9E9EB';
    const accentGreen = '#00A884'; // WhatsApp green
    const iconMuted = isDark ? '#8696A0' : '#667781';

    const creatorMember = members.find(m => m.user_id === createdBy);
    const creatorName = creatorMember?.profiles?.full_name 
        ? (creatorMember.user_id === user?.id ? 'tu' : creatorMember.profiles.full_name)
        : 'um administrador';

    const formattedDate = createdAt 
        ? new Date(createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: containerBg }]} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: textPrimary }]} numberOfLines={1}>
                    Dados do grupo
                </Text>
                {isMember ? (
                    <Pressable onPress={() => {
                        setEditDesc(commDesc);
                        setEditPhotoUrl(photoUrl);
                        setEditModalVisible(true);
                    }} style={styles.backBtn}>
                        <Ionicons name="create-outline" size={24} color={accentGreen} />
                    </Pressable>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={accentGreen} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {/* Block 1: Cover Header & Title */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.heroContent}>
                            <View style={[styles.heroIconWrap, { backgroundColor: commColor }]}>
                                {photoUrl ? (
                                    <Image source={{ uri: photoUrl }} style={styles.heroImage} />
                                ) : (
                                    <Ionicons name="people" size={48} color="#fff" />
                                )}
                            </View>
                            <Text style={[styles.heroName, { color: textPrimary }]}>{communityName}</Text>
                            <Text style={[styles.heroMetaText, { color: textSecondary }]}>
                                Grupo · {members.length} participantes
                            </Text>

                            {/* WhatsApp Actions Row */}
                            <View style={styles.actionsRow}>
                                <View style={styles.actionBtnContainer}>
                                    <View style={[styles.actionIconCircle, { borderColor: borderCol }]}>
                                        <Ionicons name="search-outline" size={20} color={accentGreen} />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: textPrimary }]}>Pesquisar</Text>
                                </View>
                                <Pressable onPress={handleLeave} style={styles.actionBtnContainer}>
                                    <View style={[styles.actionIconCircle, { borderColor: borderCol }]}>
                                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                                    </View>
                                    <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Sair</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 2: Description Box */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.descContainer}>
                            <Text style={[styles.descText, { color: textPrimary }]}>
                                {commDesc || 'Este grupo não possui descrição.'}
                            </Text>
                            <Text style={[styles.creationText, { color: textSecondary }]}>
                                Grupo criado por {creatorName} a {formattedDate || 'recentemente'}.
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 3: Media & Files */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <Pressable style={styles.rowItem}>
                            <Ionicons name="image-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Ficheiros, links e docs</Text>
                            <Text style={[styles.rowValue, { color: textSecondary }]}>0</Text>
                            <Ionicons name="chevron-forward" size={16} color={iconMuted} />
                        </Pressable>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 4: Notifications Settings */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        {/* Silenciar */}
                        <View style={styles.rowItem}>
                            <Ionicons name="notifications-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Silenciar notificações</Text>
                            <Switch
                                value={isMuted}
                                onValueChange={setIsMuted}
                                trackColor={{ false: borderCol, true: accentGreen }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />

                        {/* Personalizadas */}
                        <Pressable style={styles.rowItem}>
                            <Ionicons name="musical-notes-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Notificações personalizadas</Text>
                            <Ionicons name="chevron-forward" size={16} color={iconMuted} />
                        </Pressable>
                        <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />

                        {/* Visibilidade */}
                        <Pressable style={styles.rowItem}>
                            <Ionicons name="download-outline" size={22} color={iconMuted} style={styles.rowIcon} />
                            <Text style={[styles.rowText, { color: textPrimary }]}>Visibilidade dos media</Text>
                            <Ionicons name="chevron-forward" size={16} color={iconMuted} />
                        </Pressable>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 5: Encryption Card */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <Pressable style={styles.rowItemMultiLine}>
                            <Ionicons name="lock-closed-outline" size={22} color={accentGreen} style={styles.rowIconTop} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.rowText, { color: textPrimary }]}>Encriptação</Text>
                                <Text style={[styles.rowSubtitle, { color: textSecondary }]}>
                                    As mensagens estão encriptadas de ponta a ponta. Toque para verificar.
                                </Text>
                            </View>
                        </Pressable>
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 6: Participant List */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        <View style={styles.participantsHeader}>
                            <Text style={[styles.participantsTitle, { color: textPrimary }]}>
                                {members.length} participantes
                            </Text>
                            <Pressable style={styles.searchIconBtn}>
                                <Ionicons name="search" size={20} color={accentGreen} />
                            </Pressable>
                        </View>

                        {/* Add members button */}
                        <Pressable style={styles.rowItem}>
                            <View style={[styles.addParticipantCircle, { backgroundColor: accentGreen }]}>
                                <Ionicons name="person-add" size={18} color="#FFF" />
                            </View>
                            <Text style={[styles.rowText, { color: accentGreen, fontFamily: 'Poppins_700Bold' }]}>
                                Adicionar participantes
                            </Text>
                        </Pressable>
                        <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />

                        {/* Invite link button */}
                        <Pressable style={styles.rowItem}>
                            <View style={[styles.addParticipantCircle, { backgroundColor: accentGreen }]}>
                                <Ionicons name="link" size={18} color="#FFF" />
                            </View>
                            <Text style={[styles.rowText, { color: accentGreen, fontFamily: 'Poppins_700Bold' }]}>
                                Convidar via link
                            </Text>
                        </Pressable>
                        <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />

                        {/* Participant entries */}
                        {members.map((m, idx) => {
                            const name = m.profiles?.full_name || 'Utilizador';
                            const isMe = m.user_id === user?.id;
                            const avatarCol = getAvatarColor(m.user_id);
                            
                            return (
                                <View key={m.user_id}>
                                    {idx > 0 && <View style={[styles.innerDivider, { backgroundColor: borderCol }]} />}
                                    <View style={styles.memberRow}>
                                        <View style={[styles.memberAvatar, { backgroundColor: avatarCol }]}>
                                            <Text style={styles.memberAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.memberName, { color: textPrimary }]} numberOfLines={1}>
                                                {name} {isMe && <Text style={{ color: textSecondary, fontFamily: 'Poppins_400Regular' }}>(tu)</Text>}
                                            </Text>
                                        </View>
                                        {m.role === 'admin' && (
                                            <View style={[styles.adminPill, { borderColor: accentGreen }]}>
                                                <Text style={[styles.adminPillText, { color: accentGreen }]}>Admin do grupo</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    <View style={[styles.separator, { backgroundColor: containerBg }]} />

                    {/* Block 7: Dangerous actions */}
                    <View style={[styles.sectionBlock, { backgroundColor: cardBg }]}>
                        {/* Leave */}
                        <Pressable onPress={handleLeave} style={styles.rowItem} disabled={leaving}>
                            <Ionicons name="log-out-outline" size={22} color="#ef4444" style={styles.rowIcon} />
                            {leaving ? (
                                <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                                <Text style={[styles.rowText, { color: '#ef4444', fontFamily: 'Poppins_700Bold' }]}>Sair do grupo</Text>
                            )}
                        </Pressable>
                    </View>

                    <View style={{ height: 40, backgroundColor: containerBg }} />
                </ScrollView>
            )}

            {/* Edit Community Modal */}
            <Modal visible={editModalVisible} animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
                <SafeAreaView style={[styles.root, { backgroundColor: cardBg }]} edges={['top', 'bottom']}>
                    {/* Header */}
                    <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
                        <Pressable onPress={() => setEditModalVisible(false)} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={textPrimary} />
                        </Pressable>
                        <Text style={[styles.headerTitle, { color: textPrimary }]}>Editar Grupo</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20 }}>
                        {/* Current avatar preview */}
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={[styles.heroIconWrap, { backgroundColor: commColor }]}>
                                {editPhotoUrl ? (
                                    <Image source={{ uri: editPhotoUrl }} style={styles.heroImage} />
                                ) : (
                                    <Ionicons name="people" size={48} color="#fff" />
                                )}
                            </View>
                        </View>

                        {/* Presets Grid */}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                            FOTOS PRÉ-DEFINIDAS
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                            {[
                                { uri: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500', name: 'Médica' },
                                { uri: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500', name: 'Clínica' },
                                { uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500', name: 'Terapia' },
                                { uri: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500', name: 'Consultório' },
                                { uri: 'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?w=500', name: 'Apoio' },
                                { uri: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500', name: 'Social' },
                            ].map(p => (
                                <Pressable
                                    key={p.uri}
                                    onPress={() => setEditPhotoUrl(p.uri)}
                                    style={{
                                        width: 55,
                                        height: 55,
                                        borderRadius: 10,
                                        overflow: 'hidden',
                                        borderWidth: editPhotoUrl === p.uri ? 3 : 0,
                                        borderColor: accentGreen,
                                    }}
                                >
                                    <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
                                </Pressable>
                            ))}
                            {editPhotoUrl ? (
                                <Pressable
                                    onPress={() => setEditPhotoUrl('')}
                                    style={{
                                        width: 55,
                                        height: 55,
                                        borderRadius: 10,
                                        backgroundColor: borderCol,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                </Pressable>
                            ) : null}
                        </View>

                        {/* Custom Photo URL Input */}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                            LINK DA FOTO PERSONALIZADO (URL)
                        </Text>
                        <TextInput
                            style={{
                                borderBottomWidth: 1.5,
                                borderBottomColor: editPhotoUrl ? accentGreen : borderCol,
                                color: textPrimary,
                                fontSize: 14,
                                fontFamily: 'Poppins_400Regular',
                                paddingVertical: 6,
                                marginBottom: 24,
                            }}
                            placeholder="Insere o URL de uma foto..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={editPhotoUrl}
                            onChangeText={setEditPhotoUrl}
                        />

                        {/* Description Input */}
                        <Text style={{ fontSize: 13, fontFamily: 'Poppins_700Bold', color: textSecondary, marginBottom: 8, letterSpacing: 0.5 }}>
                            DESCRIÇÃO DO GRUPO
                        </Text>
                        <TextInput
                            style={{
                                borderBottomWidth: 1.5,
                                borderBottomColor: editDesc ? accentGreen : borderCol,
                                color: textPrimary,
                                fontSize: 14,
                                fontFamily: 'Poppins_400Regular',
                                paddingVertical: 6,
                                minHeight: 60,
                                textAlignVertical: 'top',
                                marginBottom: 32,
                            }}
                            placeholder="Descreve o propósito desta comunidade..."
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={editDesc}
                            onChangeText={setEditDesc}
                            multiline
                            numberOfLines={4}
                        />

                        {/* Save Button */}
                        <Pressable
                            onPress={handleSaveEdit}
                            disabled={updating}
                            style={{
                                backgroundColor: accentGreen,
                                paddingVertical: 14,
                                borderRadius: 25,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            {updating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={{ color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' }}>
                                    Guardar Alterações
                                </Text>
                            )}
                        </Pressable>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderBottomWidth: 0.5,
    },
    backBtn: {
        padding: 6,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        flex: 1,
        marginLeft: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionBlock: {
        width: '100%',
        paddingVertical: 4,
    },
    separator: {
        width: '100%',
        height: 10,
    },
    heroContent: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    heroIconWrap: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        borderRadius: 45,
    },
    heroName: {
        fontSize: 22,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    heroMetaText: {
        fontSize: 13,
        fontFamily: 'Poppins_400Regular',
        textAlign: 'center',
        marginBottom: 20,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 28,
        width: '100%',
    },
    actionBtnContainer: {
        alignItems: 'center',
        width: 70,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    actionLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
    },
    descContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    descText: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 20,
        marginBottom: 8,
    },
    creationText: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowItemMultiLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    rowIcon: {
        marginRight: 18,
    },
    rowIconTop: {
        marginRight: 18,
        marginTop: 2,
    },
    rowText: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
        flex: 1,
    },
    rowSubtitle: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 16,
        marginTop: 1,
    },
    rowValue: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
        marginRight: 8,
    },
    innerDivider: {
        height: 0.5,
        marginLeft: 56,
    },
    participantsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    participantsTitle: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    searchIconBtn: {
        padding: 4,
    },
    addParticipantCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 18,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    memberAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    memberAvatarText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
    memberName: {
        fontSize: 14,
        fontFamily: 'Poppins_600SemiBold',
    },
    adminPill: {
        borderWidth: 0.8,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    adminPillText: {
        fontSize: 9,
        fontFamily: 'Poppins_600SemiBold',
    },
});
