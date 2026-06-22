import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMessage, CommunityMember } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityChat'>;

const AVATAR_COLORS = ['#6D28D9', '#0369a1', '#0f766e', '#b45309', '#be185d', '#047857', '#c2410c', '#1d4ed8'];

const getAvatarColor = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Hoje';
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' });
};

type MessageWithSeparator =
    | { type: 'separator'; date: string; id: string }
    | { type: 'message'; data: CommunityMessage };

export default function CommunityChatScreen({ route, navigation }: Props) {
    const { communityId, communityName, communityColor } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [membersVisible, setMembersVisible] = useState(false);
    const [contextMsg, setContextMsg] = useState<CommunityMessage | null>(null);

    const accentColor = communityColor || colors.primary;
    const flatListRef = useRef<FlatList>(null);

    const fetchMessages = useCallback(async () => {
        try {
            const data = await apiService.getCommunityMessages(communityId);
            setMessages(data);
        } catch (error) {
            console.error('Erro ao carregar mensagens', error);
        } finally {
            setLoading(false);
        }
    }, [communityId]);

    const fetchMembers = useCallback(async () => {
        try {
            const data = await apiService.getCommunityMembers(communityId);
            setMembers(data);
        } catch (error) {
            console.error('Erro ao carregar membros', error);
        }
    }, [communityId]);

    useEffect(() => {
        fetchMessages();
        fetchMembers();
        const interval = setInterval(fetchMessages, 5000);
        return () => clearInterval(interval);
    }, [communityId]);

    // Build messages with date separators
    const messagesWithSeparators = React.useMemo<MessageWithSeparator[]>(() => {
        const result: MessageWithSeparator[] = [];
        let lastDate = '';
        for (const msg of messages) {
            const d = new Date(msg.created_at);
            const dateKey = d.toDateString();
            if (dateKey !== lastDate) {
                result.push({ type: 'separator', date: formatDateLabel(msg.created_at), id: `sep-${msg.id}` });
                lastDate = dateKey;
            }
            result.push({ type: 'message', data: msg });
        }
        return result;
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        const msgText = text.trim();
        setText('');
        setSending(true);
        try {
            const newMsg = await apiService.sendCommunityMessage(communityId, msgText);
            setMessages(prev => [...prev, newMsg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error) {
            console.error('Erro ao enviar', error);
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (msg: CommunityMessage) => {
        Alert.alert('Apagar mensagem', 'Tens a certeza?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Apagar', style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.deleteCommunityMessage(communityId, msg.id);
                        setMessages(prev => prev.filter(m => m.id !== msg.id));
                        setContextMsg(null);
                    } catch (e: any) {
                        Alert.alert('Erro', e.message || 'Não foi possível apagar.');
                    }
                },
            },
        ]);
    };

    const handleLeave = () => {
        Alert.alert('Sair da Comunidade', 'Tens a certeza que queres sair?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair', style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.leaveCommunity(communityId);
                        navigation.goBack();
                    } catch (error: any) {
                        Alert.alert('Erro', error?.message || 'Não foi possível sair.');
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: MessageWithSeparator }) => {
        if (item.type === 'separator') {
            return (
                <View style={styles.dateSeparator}>
                    <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dateLabel, { color: colors.textMuted, backgroundColor: colors.background }]}>{item.date}</Text>
                    <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                </View>
            );
        }

        const msg = item.data;
        const isMine = msg.user_id === user?.id;
        const name = msg.profiles?.full_name || 'Utilizador';
        const avatarColor = getAvatarColor(msg.user_id);

        return (
            <Pressable
                onLongPress={() => setContextMsg(msg)}
                style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}
            >
                {!isMine && (
                    <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <View style={styles.msgGroup}>
                    {!isMine && <Text style={[styles.senderName, { color: avatarColor }]}>{name}</Text>}
                    <View style={[
                        styles.msgBubble,
                        isMine
                            ? { backgroundColor: accentColor, borderBottomRightRadius: 4 }
                            : { backgroundColor: isDark ? '#2C2C2E' : '#E9E9EB', borderBottomLeftRadius: 4 }
                    ]}>
                        <Text style={[styles.msgText, { color: isMine ? '#fff' : colors.textPrimary }]}>{msg.content}</Text>
                    </View>
                    <Text style={[styles.msgTime, { color: colors.textMuted, alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
                        {formatTime(msg.created_at)}
                    </Text>
                </View>
                {isMine && <View style={{ width: 32 }} />}
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="chevron-back" size={24} color={accentColor} />
                </Pressable>
                <View style={[styles.headerEmoji, { backgroundColor: accentColor + '20' }]}>
                    <Ionicons name="people" size={20} color={accentColor} />
                </View>
                <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{communityName}</Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{members.length} membros</Text>
                </View>
                <Pressable onPress={() => { fetchMembers(); setMembersVisible(true); }} style={styles.headerBtn}>
                    <Ionicons name="people-outline" size={22} color={accentColor} />
                </Pressable>
                <Pressable onPress={handleLeave} style={styles.headerBtn}>
                    <Ionicons name="exit-outline" size={22} color="#ef4444" />
                </Pressable>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={accentColor} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messagesWithSeparators}
                    keyExtractor={item => item.type === 'separator' ? item.id : item.data.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={48} color={accentColor + '60'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sê o primeiro a dizer olá! 👋</Text>
                        </View>
                    }
                />
            )}

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', color: colors.textPrimary }]}
                        placeholder="Escreve uma mensagem..."
                        placeholderTextColor={colors.textMuted}
                        value={text}
                        onChangeText={setText}
                        multiline
                    />
                    <Pressable
                        onPress={handleSend}
                        style={[styles.sendBtn, { backgroundColor: accentColor, opacity: text.trim() ? 1 : 0.4 }]}
                        disabled={!text.trim() || sending}
                    >
                        {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
                    </Pressable>
                </View>
            </KeyboardAvoidingView>

            {/* Members Panel Modal */}
            <Modal visible={membersVisible} transparent animationType="slide" onRequestClose={() => setMembersVisible(false)}>
                <View style={styles.membersOverlay}>
                    <View style={[styles.membersPanel, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHandle} />
                        <View style={styles.membersPanelHeader}>
                            <Text style={[styles.membersPanelTitle, { color: colors.textPrimary }]}>Membros ({members.length})</Text>
                            <Pressable onPress={() => setMembersVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </Pressable>
                        </View>
                        <FlatList
                            data={members}
                            keyExtractor={m => m.user_id}
                            renderItem={({ item }) => {
                                const name = item.profiles?.full_name || 'Utilizador';
                                const aColor = getAvatarColor(item.user_id);
                                return (
                                    <View style={styles.memberRow}>
                                        <View style={[styles.memberAvatar, { backgroundColor: aColor }]}>
                                            <Text style={styles.memberAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.memberName, { color: colors.textPrimary }]}>{name}</Text>
                                            {item.role === 'admin' && (
                                                <Text style={[styles.memberRole, { color: accentColor }]}>Administrador</Text>
                                            )}
                                        </View>
                                        {item.user_id === user?.id && (
                                            <View style={[styles.meBadge, { backgroundColor: accentColor + '20' }]}>
                                                <Text style={[styles.meBadgeText, { color: accentColor }]}>Tu</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Message Context Menu Modal */}
            <Modal visible={!!contextMsg} transparent animationType="fade" onRequestClose={() => setContextMsg(null)}>
                <Pressable style={styles.contextOverlay} onPress={() => setContextMsg(null)}>
                    <View style={[styles.contextMenu, { backgroundColor: colors.card }]}>
                        <Text style={[styles.contextMsgPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                            {contextMsg?.content}
                        </Text>
                        <View style={[styles.contextDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity
                            style={styles.contextAction}
                            onPress={() => {
                                if (contextMsg) {
                                    require('@react-native-clipboard/clipboard') ?? null;
                                    setContextMsg(null);
                                }
                            }}
                        >
                            <Ionicons name="copy-outline" size={20} color={colors.textPrimary} />
                            <Text style={[styles.contextActionText, { color: colors.textPrimary }]}>Copiar</Text>
                        </TouchableOpacity>
                        {contextMsg?.user_id === user?.id && (
                            <TouchableOpacity
                                style={styles.contextAction}
                                onPress={() => contextMsg && handleDelete(contextMsg)}
                            >
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                <Text style={[styles.contextActionText, { color: '#ef4444' }]}>Apagar mensagem</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.contextAction} onPress={() => setContextMsg(null)}>
                            <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.contextActionText, { color: colors.textSecondary }]}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1 },
    headerBtn: { padding: 8 },
    headerEmoji: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    headerTitleWrap: { flex: 1 },
    headerTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
    headerSub: { fontSize: 11, fontFamily: 'Poppins_400Regular' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, paddingBottom: 8 },

    dateSeparator: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 8 },
    dateLine: { flex: 1, height: 1 },
    dateLabel: { fontSize: 12, fontFamily: 'Poppins_500Medium', paddingHorizontal: 8 },

    msgRow: { flexDirection: 'row', marginBottom: 4, maxWidth: '85%' },
    msgRowMine: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
    msgRowOther: { alignSelf: 'flex-start' },
    avatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 8, alignSelf: 'flex-end' },
    avatarText: { fontSize: 12, fontFamily: 'Poppins_700Bold', color: '#fff' },
    msgGroup: { maxWidth: '100%' },
    senderName: { fontSize: 11, fontFamily: 'Poppins_700Bold', marginBottom: 2, marginLeft: 2 },
    msgBubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
    msgText: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 20 },
    msgTime: { fontSize: 10, fontFamily: 'Poppins_400Regular', marginTop: 3, marginHorizontal: 4 },

    empty: { alignItems: 'center', marginTop: 80, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Poppins_500Medium', textAlign: 'center' },

    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1 },
    input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, fontFamily: 'Poppins_400Regular' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

    membersOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    membersPanel: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '70%' },
    modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC', alignSelf: 'center', marginBottom: 16 },
    membersPanelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    membersPanelTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    memberAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
    memberName: { fontSize: 15, fontFamily: 'Poppins_600SemiBold' },
    memberRole: { fontSize: 12, fontFamily: 'Poppins_500Medium' },
    meBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    meBadgeText: { fontSize: 12, fontFamily: 'Poppins_700Bold' },

    contextOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    contextMenu: { borderRadius: 20, padding: 16, width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    contextMsgPreview: { fontSize: 13, fontFamily: 'Poppins_400Regular', paddingVertical: 8, paddingHorizontal: 4 },
    contextDivider: { height: 1, marginVertical: 8 },
    contextAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
    contextActionText: { fontSize: 16, fontFamily: 'Poppins_500Medium' },
});
