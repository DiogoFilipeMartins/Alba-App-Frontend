import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMember } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityDetail'>;

const getAvatarColor = (id: string) => {
    const colors = ['#6D28D9', '#0369a1', '#0f766e', '#b45309', '#be185d', '#047857', '#c2410c', '#1d4ed8'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export default function CommunityDetailScreen({ route, navigation }: Props) {
    const { communityId, communityName, communityColor, description, memberCount } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [joining, setJoining] = useState(false);
    const [leaving, setLeaving] = useState(false);

    const accentColor = communityColor || colors.primary;

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const data = await apiService.getCommunityMembers(communityId);
                setMembers(data);
                setIsMember(data.some(m => m.user_id === user?.id));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchMembers();
    }, [communityId]);

    const handleJoin = async () => {
        try {
            setJoining(true);
            await apiService.joinCommunity(communityId);
            navigation.replace('CommunityChat', {
                communityId,
                communityName,
                communityColor,
            });
        } catch (e: any) {
            Alert.alert('Erro', e.message || 'Não foi possível aderir.');
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = () => {
        Alert.alert('Sair da Comunidade', 'Tens a certeza que queres sair?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair', style: 'destructive',
                onPress: async () => {
                    try {
                        setLeaving(true);
                        await apiService.leaveCommunity(communityId);
                        navigation.goBack();
                    } catch (e: any) {
                        Alert.alert('Erro', e.message || 'Não foi possível sair.');
                    } finally {
                        setLeaving(false);
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Header */}
                <View style={[styles.hero, { backgroundColor: accentColor }]}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </Pressable>
                    <View style={styles.heroContent}>
                        <View style={[styles.heroIconWrap]}>
                        <Ionicons name="people" size={52} color="rgba(255,255,255,0.9)" />
                    </View>
                        <Text style={styles.heroName}>{communityName}</Text>
                        <View style={styles.heroMeta}>
                            <Ionicons name="people" size={14} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.heroMetaText}>{memberCount || members.length} membros</Text>
                        </View>
                    </View>
                </View>

                {/* Description */}
                {!!description && (
                    <View style={[styles.section, { backgroundColor: colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DESCRIÇÃO</Text>
                        <Text style={[styles.descText, { color: colors.textPrimary }]}>{description}</Text>
                    </View>
                )}

                {/* Action buttons */}
                <View style={styles.actionRow}>
                    {isMember ? (
                        <>
                            <Pressable
                                style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                                onPress={() => navigation.navigate('CommunityChat', { communityId, communityName, communityColor })}
                            >
                                <Ionicons name="chatbubbles" size={18} color="#fff" />
                                <Text style={styles.primaryBtnText}>Abrir Chat</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.secondaryBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
                                onPress={handleLeave}
                                disabled={leaving}
                            >
                                {leaving
                                    ? <ActivityIndicator color="#ef4444" size="small" />
                                    : <Text style={[styles.secondaryBtnText, { color: '#ef4444' }]}>Sair</Text>
                                }
                            </Pressable>
                        </>
                    ) : (
                        <Pressable
                            style={[styles.primaryBtn, { backgroundColor: accentColor, flex: 1 }]}
                            onPress={handleJoin}
                            disabled={joining}
                        >
                            {joining
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <Ionicons name="person-add" size={18} color="#fff" />
                                    <Text style={styles.primaryBtnText}>Aderir à Comunidade</Text>
                                </>
                            }
                        </Pressable>
                    )}
                </View>

                {/* Members list */}
                <View style={styles.membersSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary, paddingHorizontal: 20 }]}>MEMBROS</Text>
                    {loading ? (
                        <ActivityIndicator color={accentColor} style={{ marginTop: 20 }} />
                    ) : (
                        members.map(m => {
                            const name = m.profiles?.full_name || 'Utilizador';
                            const aColor = getAvatarColor(m.user_id);
                            const isMe = m.user_id === user?.id;
                            return (
                                <View key={m.user_id} style={[styles.memberRow, { backgroundColor: colors.card }]}>
                                    <View style={[styles.memberAvatar, { backgroundColor: aColor }]}>
                                        <Text style={styles.memberAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                                            {name}{isMe ? ' (tu)' : ''}
                                        </Text>
                                        {m.role === 'admin' && (
                                            <Text style={[styles.memberRole, { color: accentColor }]}>Administrador</Text>
                                        )}
                                    </View>
                                    {m.role === 'admin' && (
                                        <View style={[styles.adminBadge, { backgroundColor: accentColor + '20' }]}>
                                            <Ionicons name="shield-checkmark" size={14} color={accentColor} />
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    hero: { paddingTop: 16, paddingBottom: 36, paddingHorizontal: 20 },
    backBtn: { padding: 4, marginBottom: 16, alignSelf: 'flex-start' },
    heroContent: { alignItems: 'center' },
    heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    heroName: { fontSize: 26, fontFamily: 'Poppins_700Bold', color: '#fff', textAlign: 'center' },
    heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    heroMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'Poppins_500Medium' },
    section: { margin: 16, borderRadius: 16, padding: 16 },
    sectionTitle: { fontSize: 11, fontFamily: 'Poppins_700Bold', letterSpacing: 0.8, marginBottom: 12 },
    descText: { fontSize: 15, fontFamily: 'Poppins_400Regular', lineHeight: 24 },
    actionRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 24 },
    primaryBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
    primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
    secondaryBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
    secondaryBtnText: { fontSize: 15, fontFamily: 'Poppins_700Bold' },
    membersSection: { paddingTop: 8 },
    memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 16, marginBottom: 8, borderRadius: 16, gap: 12 },
    memberAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    memberAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
    memberName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    memberRole: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
    adminBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});
