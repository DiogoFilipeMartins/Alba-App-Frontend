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
    ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMessage, CommunityMember } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Clipboard from '@react-native-clipboard/clipboard';

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
        Alert.alert('Apagar mensagem', 'Tens a certeza que queres apagar esta mensagem?', [
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
        Alert.alert('Sair da Comunidade', 'Tens a certeza que queres sair desta comunidade?', [
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
                <View style={styles.dateSeparatorContainer}>
                    <View style={[styles.dateSeparatorPill, { backgroundColor: isDark ? '#1C1C1E' : '#E1E1E6' }]}>
                        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>{item.date}</Text>
                    </View>
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
                <View style={[
                    styles.msgBubble,
                    isMine
                        ? { 
                            backgroundColor: isDark ? '#005C4B' : '#E7FFDB',
                            borderBottomRightRadius: 2,
                            alignSelf: 'flex-end',
                          }
                        : { 
                            backgroundColor: isDark ? '#202C33' : '#FFFFFF',
                            borderBottomLeftRadius: 2,
                            alignSelf: 'flex-start',
                          },
                    styles.bubbleShadow
                ]}>
                    {!isMine && (
                        <Text style={[styles.senderName, { color: avatarColor }]}>{name}</Text>
                    )}
                    <View style={styles.messageContentRow}>
                        <Text style={[styles.msgText, { color: isDark ? '#E9EDEF' : '#303030' }]}>
                            {msg.content}
                        </Text>
                        <Text style={[styles.msgTime, { color: isDark ? '#8696A0' : '#667781' }]}>
                            {formatTime(msg.created_at)}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    };
    const chatBgColor = isDark ? '#0B141A' : '#efeae2';
    const headerBg = isDark ? '#202C33' : '#F0F2F5';

    return (
        <View style={[styles.root, { backgroundColor: chatBgColor }]}>
            {/* Header Safe Area */}
            <SafeAreaView style={{ backgroundColor: headerBg }} edges={['top']}>
                <View style={[styles.header, { borderBottomColor: isDark ? '#222E35' : '#E9E9EB', backgroundColor: headerBg }]}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#E9EDEF' : '#54656F'} />
                    </Pressable>
                    
                    <View style={[styles.headerEmoji, { backgroundColor: accentColor }]}>
                        <Ionicons name="people" size={20} color="#fff" />
                    </View>
                    
                    <View style={styles.headerTitleWrap}>
                        <Text style={[styles.headerTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>
                            {communityName}
                        </Text>
                        <Text style={[styles.headerSub, { color: isDark ? '#8696A0' : '#667781' }]}>
                            {members.length} membros
                        </Text>
                    </View>

                    <Pressable onPress={() => { fetchMembers(); setMembersVisible(true); }} style={styles.headerBtn}>
                        <Ionicons name="people-outline" size={22} color={isDark ? '#E9EDEF' : '#54656F'} />
                    </Pressable>
                    
                    <Pressable onPress={handleLeave} style={styles.headerBtn}>
                        <Ionicons name="exit-outline" size={22} color="#ef4444" />
                    </Pressable>
                </View>
            </SafeAreaView>

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
                            <Ionicons name="chatbubbles-outline" size={48} color={accentColor + '80'} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sê o primeiro a dizer olá! 👋</Text>
                        </View>
                    }
                />
            )}

            {/* Input Bar - WhatsApp Style */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <SafeAreaView style={[styles.inputContainer, { backgroundColor: chatBgColor }]} edges={['bottom']}>
                    <View style={[styles.inputCapsule, { backgroundColor: isDark ? '#2A3942' : '#FFFFFF' }]}>
                        <Pressable style={styles.inputIcon}>
                            <Ionicons name="happy-outline" size={24} color={isDark ? '#8696A0' : '#54656F'} />
                        </Pressable>
                        <TextInput
                            style={[styles.input, { color: isDark ? '#E9EDEF' : '#111B21' }]}
                            placeholder="Mensagem"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={text}
                            onChangeText={setText}
                            multiline
                        />
                        <Pressable style={styles.inputIcon}>
                            <Ionicons name="attach-outline" size={24} color={isDark ? '#8696A0' : '#54656F'} />
                        </Pressable>
                    </View>
                    
                    <Pressable
                        onPress={handleSend}
                        style={[
                            styles.sendCircle, 
                            { 
                                backgroundColor: text.trim() ? '#00A884' : (isDark ? '#8696A0' : '#54656F'), 
                                opacity: text.trim() ? 1 : 0.6 
                            }
                        ]}
                        disabled={!text.trim() || sending}
                    >
                        {sending ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
                        )}
                    </Pressable>
                </SafeAreaView>
            </KeyboardAvoidingView>

            {/* Members Panel Modal */}
            <Modal visible={membersVisible} transparent animationType="slide" onRequestClose={() => setMembersVisible(false)}>
                <View style={styles.membersOverlay}>
                    <View style={[styles.membersPanel, { backgroundColor: isDark ? '#222E35' : '#FFFFFF' }]}>
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
                                                <Text style={[styles.memberRole, { color: '#00A884' }]}>Administrador</Text>
                                            )}
                                        </View>
                                        {item.user_id === user?.id && (
                                            <View style={[styles.meBadge, { backgroundColor: 'rgba(0,168,132,0.15)' }]}>
                                                <Text style={[styles.meBadgeText, { color: '#00A884' }]}>Tu</Text>
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
                    <View style={[styles.contextMenu, { backgroundColor: isDark ? '#222E35' : '#FFFFFF' }]}>
                        <Text style={[styles.contextMsgPreview, { color: colors.textSecondary }]} numberOfLines={2}>
                            {contextMsg?.content}
                        </Text>
                        <View style={[styles.contextDivider, { backgroundColor: colors.border }]} />
                        <TouchableOpacity
                            style={styles.contextAction}
                            onPress={() => {
                                if (contextMsg) {
                                    Clipboard.setString(contextMsg.content);
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
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
    headerBtn: { padding: 8 },
    headerEmoji: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    headerTitleWrap: { flex: 1 },
    headerTitle: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
    headerSub: { fontSize: 11, fontFamily: 'Poppins_400Regular', marginTop: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 16 },

    // Separators
    dateSeparatorContainer: { alignItems: 'center', marginVertical: 16 },
    dateSeparatorPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
    dateLabel: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },

    // Message Rows
    msgRow: { flexDirection: 'row', marginVertical: 3, maxWidth: '85%' },
    msgRowMine: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    msgRowOther: { alignSelf: 'flex-start', justifyContent: 'flex-start' },
    
    // Bubble design
    msgBubble: { 
        paddingHorizontal: 12, 
        paddingTop: 6, 
        paddingBottom: 6, 
        borderRadius: 10,
        position: 'relative',
        minWidth: 80,
    },
    bubbleShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 1,
        elevation: 1,
    },
    senderName: { fontSize: 12, fontFamily: 'Poppins_700Bold', marginBottom: 2 },
    messageContentRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    msgText: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 19, paddingRight: 45 },
    msgTime: { 
        fontSize: 10, 
        fontFamily: 'Poppins_400Regular', 
        position: 'absolute', 
        right: 4, 
        bottom: 2,
    },

    empty: { alignItems: 'center', marginTop: 120, gap: 12 },
    emptyText: { fontSize: 15, fontFamily: 'Poppins_500Medium', textAlign: 'center' },

    // Custom WhatsApp input row
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
    inputCapsule: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        borderRadius: 24, 
        paddingHorizontal: 8,
        minHeight: 48,
        maxHeight: 120,
    },
    input: { 
        flex: 1, 
        fontSize: 15, 
        fontFamily: 'Poppins_400Regular', 
        paddingVertical: 8,
        paddingHorizontal: 6,
    },
    inputIcon: { padding: 6 },
    
    sendCircle: { 
        width: 48, 
        height: 48, 
        borderRadius: 24, 
        justifyContent: 'center', 
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },

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
