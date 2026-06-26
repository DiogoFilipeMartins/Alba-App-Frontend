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
    Image,
    Linking,
    Keyboard,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMessage, CommunityMember } from '../services/apiService';
import { notificationService } from '../services/notificationService';
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

const POPULAR_EMOJIS = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰',
    '😘','😋','😛','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟',
    '🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓',
    '🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱',
    '😴','🤤','😪','👁️','👀','🧠','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤞','🤟','🤘','🤙','👈','👉','👆','👇','👍',
    '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','⚡'
];

export default function CommunityChatScreen({ route, navigation }: Props) {
    const { communityId, communityName, communityColor } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [members, setMembers] = useState<CommunityMember[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [contextMsg, setContextMsg] = useState<CommunityMessage | null>(null);

    // Emojis & Attachment States
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [activeMockType, setActiveMockType] = useState<'gallery' | 'document' | 'location' | 'contact' | null>(null);

    const accentColor = communityColor || colors.primary;
    const flatListRef = useRef<FlatList>(null);

    const knownMessageIdsRef = useRef<Set<string>>(new Set());
    const isInitialLoadRef = useRef(true);

    const fetchMessages = useCallback(async () => {
        try {
            const data = await apiService.getCommunityMessages(communityId);
            
            // On polling (not initial load), detect new messages from others
            if (!isInitialLoadRef.current) {
                for (const msg of data) {
                    if (!knownMessageIdsRef.current.has(msg.id) && msg.user_id !== user?.id) {
                        // New message from someone else — trigger local notification
                        const senderName = msg.profiles?.full_name || 'Alguém';
                        notificationService.showLocalMessageNotification(
                            communityName,
                            senderName,
                            msg.content.slice(0, 100),
                            communityId,
                        );
                    }
                }
            }

            // Update known IDs
            knownMessageIdsRef.current = new Set(data.map(m => m.id));
            isInitialLoadRef.current = false;

            setMessages(data);
        } catch (error) {
            console.error('Erro ao carregar mensagens', error);
        } finally {
            setLoading(false);
        }
    }, [communityId, communityName, user?.id]);

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

    const handleSend = async (forcedText?: string) => {
        const contentToSend = forcedText !== undefined ? forcedText : text;
        if (!contentToSend.trim() || sending) return;
        
        if (forcedText === undefined) {
            setText('');
        }
        setSending(true);
        try {
            const newMsg = await apiService.sendCommunityMessage(communityId, contentToSend.trim());
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

    // Emoji select handler
    const handleEmojiPress = (emoji: string) => {
        setText(prev => prev + emoji);
    };

    // Toggle Emoji Picker
    const toggleEmojiPicker = () => {
        if (showEmojiPicker) {
            setShowEmojiPicker(false);
        } else {
            Keyboard.dismiss();
            setShowAttachmentMenu(false);
            setShowEmojiPicker(true);
        }
    };

    // Close picker when text input is focused
    const handleFocusInput = () => {
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
    };

    // Handle mock uploads
    const handleSelectMockItem = async (markup: string) => {
        setActiveMockType(null);
        await handleSend(markup);
    };

    // Rich parsing parser
    const parseRichMessage = (content: string) => {
        if (content.startsWith('[IMAGEM: ')) {
            const endIdx = content.indexOf(']');
            if (endIdx !== -1) {
                const url = content.substring(9, endIdx);
                const caption = content.substring(endIdx + 1).trim();
                return { type: 'image', url, caption };
            }
        }
        if (content.startsWith('[DOCUMENTO: ')) {
            const endIdx = content.indexOf(']');
            if (endIdx !== -1) {
                const fileName = content.substring(12, endIdx);
                return { type: 'document', name: fileName };
            }
        }
        if (content.startsWith('[LOCALIZAÇÃO: ')) {
            const endIdx = content.indexOf(']');
            if (endIdx !== -1) {
                const locationName = content.substring(14, endIdx);
                return { type: 'location', name: locationName };
            }
        }
        if (content.startsWith('[CONTACTO: ')) {
            const endIdx = content.indexOf(']');
            if (endIdx !== -1) {
                const inner = content.substring(11, endIdx);
                const parts = inner.split(' - ');
                return { type: 'contact', name: parts[0] || 'Contacto', phone: parts[1] || '912 345 678' };
            }
        }
        return { type: 'text', content };
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
        const parsed = parseRichMessage(msg.content);

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
                    parsed.type === 'image' && { paddingHorizontal: 4, paddingTop: 4 },
                    styles.bubbleShadow
                ]}>
                    {!isMine && (
                        <Text style={[styles.senderName, { color: avatarColor, marginLeft: parsed.type === 'image' ? 8 : 0 }]}>{name}</Text>
                    )}

                    {/* Image Bubble */}
                    {parsed.type === 'image' && (
                        <View style={styles.richImageContainer}>
                            <Image source={{ uri: parsed.url }} style={styles.bubbleImage} resizeMode="cover" />
                            {parsed.caption ? (
                                <Text style={[styles.imageCaption, { color: isDark ? '#E9EDEF' : '#303030' }]}>
                                    {parsed.caption}
                                </Text>
                            ) : null}
                            <Text style={[styles.imageTime, { color: isDark ? '#8696A0' : '#667781' }]}>
                                {formatTime(msg.created_at)}
                            </Text>
                        </View>
                    )}

                    {/* Document Bubble */}
                    {parsed.type === 'document' && (
                        <View style={styles.richDocContainer}>
                            <Pressable 
                                onPress={() => Alert.alert('Download', `A descarregar o ficheiro "${parsed.name}"...`)}
                                style={[styles.docCard, { backgroundColor: isDark ? '#1C2C34' : '#F0F2F5' }]}
                            >
                                <Ionicons name="document" size={30} color="#8b5cf6" />
                                <View style={{ flex: 1, marginLeft: 8, marginRight: 8 }}>
                                    <Text style={[styles.docTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>
                                        {parsed.name}
                                    </Text>
                                    <Text style={[styles.docSubtitle, { color: isDark ? '#8696A0' : '#667781' }]}>
                                        1.4 MB · PDF
                                    </Text>
                                </View>
                                <Ionicons name="arrow-down-circle" size={24} color="#13CF75" />
                            </Pressable>
                            <Text style={[styles.msgTimeNormal, { color: isDark ? '#8696A0' : '#667781' }]}>
                                {formatTime(msg.created_at)}
                            </Text>
                        </View>
                    )}

                    {/* Location Bubble */}
                    {parsed.type === 'location' && (
                        <View style={styles.richLocationContainer}>
                            <View style={[styles.locCard, { backgroundColor: isDark ? '#1C2C34' : '#F0F2F5' }]}>
                                <Ionicons name="location" size={26} color="#ef4444" style={{ marginRight: 8 }} />
                                <Text style={[styles.locTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={2}>
                                    {parsed.name}
                                </Text>
                            </View>
                            <Pressable
                                onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsed.name)}`)}
                                style={[styles.locBtn, { borderColor: isDark ? '#222E35' : '#E9E9EB' }]}
                            >
                                <Text style={{ color: '#13CF75', fontFamily: 'Poppins_700Bold', fontSize: 13 }}>Ver no Mapa</Text>
                            </Pressable>
                            <Text style={[styles.msgTimeNormal, { color: isDark ? '#8696A0' : '#667781' }]}>
                                {formatTime(msg.created_at)}
                            </Text>
                        </View>
                    )}

                    {/* Contact Bubble */}
                    {parsed.type === 'contact' && (
                        <View style={styles.richContactContainer}>
                            <View style={[styles.contactCard, { backgroundColor: isDark ? '#1C2C34' : '#F0F2F5' }]}>
                                <View style={[styles.contactAvatar, { backgroundColor: accentColor }]}>
                                    <Text style={styles.contactAvatarText}>{(parsed.name || 'C')[0].toUpperCase()}</Text>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.contactName, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>
                                        {parsed.name}
                                    </Text>
                                    <Text style={[styles.contactPhone, { color: isDark ? '#8696A0' : '#667781' }]}>
                                        {parsed.phone}
                                    </Text>
                                </View>
                            </View>
                            <Pressable
                                onPress={() => Linking.openURL(`tel:${parsed.phone}`)}
                                style={[styles.contactBtn, { borderColor: isDark ? '#222E35' : '#E9E9EB' }]}
                            >
                                <Ionicons name="call" size={14} color="#13CF75" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#13CF75', fontFamily: 'Poppins_700Bold', fontSize: 13 }}>Ligar</Text>
                            </Pressable>
                            <Text style={[styles.msgTimeNormal, { color: isDark ? '#8696A0' : '#667781' }]}>
                                {formatTime(msg.created_at)}
                            </Text>
                        </View>
                    )}

                    {/* Normal Text Message */}
                    {parsed.type === 'text' && (
                        <View style={styles.messageContentRow}>
                            <Text style={[styles.msgText, { color: isDark ? '#E9EDEF' : '#303030' }]}>
                                {parsed.content}
                            </Text>
                            <Text style={[styles.msgTime, { color: isDark ? '#8696A0' : '#667781' }]}>
                                {formatTime(msg.created_at)}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    };

    const chatBgColor = isDark ? '#0B141A' : '#efeae2';
    const headerBg = isDark ? '#202C33' : '#F0F2F5';
    const accentGreen = '#13CF75';

    return (
        <KeyboardAvoidingView 
            style={[styles.root, { backgroundColor: chatBgColor }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header Safe Area */}
            <SafeAreaView style={{ backgroundColor: headerBg }} edges={['top']}>
                <View style={[styles.header, { borderBottomColor: isDark ? '#222E35' : '#E9E9EB', backgroundColor: headerBg }]}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#E9EDEF' : '#54656F'} />
                    </Pressable>
                    
                    <Pressable 
                        onPress={() => navigation.navigate('CommunityDetail', {
                            communityId,
                            communityName,
                            communityColor: accentColor,
                            memberCount: members.length
                        })}
                        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
                    >
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
                    </Pressable>

                    <Pressable 
                        onPress={() => navigation.navigate('CommunityDetail', {
                            communityId,
                            communityName,
                            communityColor: accentColor,
                            memberCount: members.length
                        })}
                        style={styles.headerBtn}
                    >
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

            {/* Input Bar & Emojis Panel - WhatsApp Style */}
            <View style={{ width: '100%' }}>
                {/* Floating Attachment Menu */}
                {showAttachmentMenu && (
                    <View style={[styles.attachmentPanel, { backgroundColor: isDark ? '#233138' : '#FFFFFF' }]}>
                        {/* Doc */}
                        <Pressable onPress={() => { setShowAttachmentMenu(false); setActiveMockType('document'); }} style={styles.attachItem}>
                            <View style={[styles.attachCircle, { backgroundColor: '#7F66FF' }]}>
                                <Ionicons name="document-text" size={22} color="#FFF" />
                            </View>
                            <Text style={[styles.attachLabel, { color: isDark ? '#E9EDEF' : '#54656F' }]}>Documento</Text>
                        </Pressable>

                        {/* Camera */}
                        <Pressable onPress={() => { setShowAttachmentMenu(false); handleSelectMockItem('[IMAGEM: https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500] Foto da Clínica'); }} style={styles.attachItem}>
                            <View style={[styles.attachCircle, { backgroundColor: '#FF2E74' }]}>
                                <Ionicons name="camera" size={22} color="#FFF" />
                            </View>
                            <Text style={[styles.attachLabel, { color: isDark ? '#E9EDEF' : '#54656F' }]}>Câmara</Text>
                        </Pressable>

                        {/* Gallery */}
                        <Pressable onPress={() => { setShowAttachmentMenu(false); setActiveMockType('gallery'); }} style={styles.attachItem}>
                            <View style={[styles.attachCircle, { backgroundColor: '#C05CFF' }]}>
                                <Ionicons name="image" size={22} color="#FFF" />
                            </View>
                            <Text style={[styles.attachLabel, { color: isDark ? '#E9EDEF' : '#54656F' }]}>Galeria</Text>
                        </Pressable>

                        {/* Audio */}
                        <Pressable onPress={() => { setShowAttachmentMenu(false); Alert.alert('Áudio', 'Enviar notas de voz temporariamente indisponível.'); }} style={styles.attachItem}>
                            <View style={[styles.attachCircle, { backgroundColor: '#FF8A00' }]}>
                                <Ionicons name="musical-notes" size={22} color="#FFF" />
                            </View>
                            <Text style={[styles.attachLabel, { color: isDark ? '#E9EDEF' : '#54656F' }]}>Áudio</Text>
                        </Pressable>

                        {/* Location */}
                        <Pressable onPress={() => { setShowAttachmentMenu(false); setActiveMockType('location'); }} style={styles.attachItem}>
                            <View style={[styles.attachCircle, { backgroundColor: '#058c42' }]}>
                                <Ionicons name="location" size={22} color="#FFF" />
                            </View>
                            <Text style={[styles.attachLabel, { color: isDark ? '#E9EDEF' : '#54656F' }]}>Localização</Text>
                        </Pressable>

                        {/* Contact */}
                        <Pressable onPress={() => { setShowAttachmentMenu(false); setActiveMockType('contact'); }} style={styles.attachItem}>
                            <View style={[styles.attachCircle, { backgroundColor: '#00A3FF' }]}>
                                <Ionicons name="person" size={22} color="#FFF" />
                            </View>
                            <Text style={[styles.attachLabel, { color: isDark ? '#E9EDEF' : '#54656F' }]}>Contacto</Text>
                        </Pressable>
                    </View>
                )}

                <SafeAreaView style={[styles.inputContainer, { backgroundColor: chatBgColor }]} edges={['bottom']}>
                    <View style={[styles.inputCapsule, { backgroundColor: isDark ? '#2A3942' : '#FFFFFF' }]}>
                        <Pressable onPress={toggleEmojiPicker} style={styles.inputIcon}>
                            <Ionicons 
                                name={showEmojiPicker ? 'keypad-outline' : 'happy-outline'} 
                                size={24} 
                                color={isDark ? '#8696A0' : '#54656F'} 
                            />
                        </Pressable>
                        <TextInput
                            style={[styles.input, { color: isDark ? '#E9EDEF' : '#111B21' }]}
                            placeholder="Mensagem"
                            placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                            value={text}
                            onChangeText={setText}
                            multiline
                            onFocus={handleFocusInput}
                        />
                        <Pressable onPress={() => setShowAttachmentMenu(!showAttachmentMenu)} style={styles.inputIcon}>
                            <Ionicons name="attach-outline" size={24} color={isDark ? '#8696A0' : '#54656F'} />
                        </Pressable>
                    </View>
                    
                    <Pressable
                        onPress={() => handleSend()}
                        style={[
                            styles.sendCircle, 
                            { 
                                backgroundColor: text.trim() ? accentGreen : (isDark ? '#8696A0' : '#54656F'), 
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

                {/* Emoji Picker Drawer */}
                {showEmojiPicker && (
                    <View style={[styles.emojiPickerContainer, { backgroundColor: isDark ? '#1F2C34' : '#E8EBEF', borderTopColor: isDark ? '#222E35' : '#D1D5DB' }]}>
                        <ScrollView contentContainerStyle={styles.emojiScroll} keyboardShouldPersistTaps="handled">
                            <View style={styles.emojiGrid}>
                                {POPULAR_EMOJIS.map(emoji => (
                                    <Pressable key={emoji} onPress={() => handleEmojiPress(emoji)} style={styles.emojiBtn}>
                                        <Text style={styles.emojiText}>{emoji}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}
            </View>

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

            {/* Mock Attachment Selection Modal */}
            <Modal visible={activeMockType !== null} transparent animationType="fade" onRequestClose={() => setActiveMockType(null)}>
                <Pressable style={styles.mockOverlay} onPress={() => setActiveMockType(null)}>
                    <View style={[styles.mockContainer, { backgroundColor: isDark ? '#222E35' : '#FFFFFF' }]}>
                        <Text style={[styles.mockTitle, { color: isDark ? '#E9EDEF' : '#111B21' }]}>
                            {activeMockType === 'gallery' && 'Selecionar da Galeria'}
                            {activeMockType === 'document' && 'Selecionar Documento'}
                            {activeMockType === 'location' && 'Partilhar Localização'}
                            {activeMockType === 'contact' && 'Partilhar Contacto'}
                        </Text>

                        {/* MOCK PHOTOS */}
                        {activeMockType === 'gallery' && (
                            <View style={styles.mockPhotosGrid}>
                                {[
                                    { uri: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500', name: 'Consulta Médica' },
                                    { uri: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=500', name: 'Clínica Acessível' },
                                    { uri: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500', name: 'Sessão de Terapia' },
                                    { uri: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500', name: 'Consultório Alba' },
                                ].map(p => (
                                    <Pressable key={p.uri} onPress={() => handleSelectMockItem(`[IMAGEM: ${p.uri}] ${p.name}`)} style={styles.mockPhotoCard}>
                                        <Image source={{ uri: p.uri }} style={styles.mockPhotoThumb} />
                                        <Text style={[styles.mockPhotoLabel, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>{p.name}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {/* MOCK DOCUMENTS */}
                        {activeMockType === 'document' && (
                            <View style={{ gap: 8 }}>
                                {[
                                    'Guia_Acessibilidade_Alba.pdf',
                                    'Receita_Medica_Assinada.pdf',
                                    'Relatorio_Sessao_Terapia.pdf',
                                ].map(doc => (
                                    <Pressable key={doc} onPress={() => handleSelectMockItem(`[DOCUMENTO: ${doc}]`)} style={[styles.mockRowItem, { borderBottomColor: colors.border }]}>
                                        <Ionicons name="document-text" size={24} color="#8b5cf6" style={{ marginRight: 12 }} />
                                        <Text style={[styles.mockRowText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>{doc}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {/* MOCK LOCATIONS */}
                        {activeMockType === 'location' && (
                            <View style={{ gap: 8 }}>
                                {[
                                    'Hospital de Santa Maria, Lisboa',
                                    'Clínica Alba Acessível, Porto',
                                    'Parque das Nações, Lisboa',
                                ].map(loc => (
                                    <Pressable key={loc} onPress={() => handleSelectMockItem(`[LOCALIZAÇÃO: ${loc}]`)} style={[styles.mockRowItem, { borderBottomColor: colors.border }]}>
                                        <Ionicons name="location" size={24} color="#ef4444" style={{ marginRight: 12 }} />
                                        <Text style={[styles.mockRowText, { color: isDark ? '#E9EDEF' : '#111B21' }]}>{loc}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        {/* MOCK CONTACTS */}
                        {activeMockType === 'contact' && (
                            <View style={{ gap: 8 }}>
                                {[
                                    { name: 'Dr. António Silva (Psicólogo)', phone: '912 345 678' },
                                    { name: 'Linha de Apoio Alba', phone: '213 000 000' },
                                    { name: 'Dra. Rita Pereira (Terapeuta)', phone: '934 567 890' },
                                ].map(c => (
                                    <Pressable key={c.name} onPress={() => handleSelectMockItem(`[CONTACTO: ${c.name} - ${c.phone}]`)} style={[styles.mockRowItem, { borderBottomColor: colors.border }]}>
                                        <Ionicons name="person-circle" size={26} color="#00A3FF" style={{ marginRight: 12 }} />
                                        <View>
                                            <Text style={[styles.mockRowText, { color: isDark ? '#E9EDEF' : '#111B21', marginBottom: 2 }]}>{c.name}</Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{c.phone}</Text>
                                        </View>
                                    </Pressable>
                                ))}
                            </View>
                        )}

                        <Pressable onPress={() => setActiveMockType(null)} style={[styles.mockCloseBtn, { backgroundColor: isDark ? '#1C2C34' : '#F0F2F5' }]}>
                            <Text style={[styles.mockCloseBtnText, { color: colors.textPrimary }]}>Cancelar</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </KeyboardAvoidingView>
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
    senderName: { fontSize: 12, fontFamily: 'Poppins_700Bold', marginBottom: 4 },
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
    msgTimeNormal: {
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 4,
    },

    // Rich Bubble components
    richImageContainer: {
        width: 220,
        marginBottom: 2,
    },
    bubbleImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
    },
    imageCaption: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
        marginTop: 6,
        paddingBottom: 14,
    },
    imageTime: {
        fontSize: 10,
        position: 'absolute',
        right: 0,
        bottom: -2,
    },
    richDocContainer: {
        width: 220,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    docTitle: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    docSubtitle: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        marginTop: 1,
    },
    richLocationContainer: {
        width: 220,
    },
    locCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    locTitle: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        flex: 1,
    },
    locBtn: {
        borderTopWidth: 0.5,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    richContactContainer: {
        width: 220,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    contactAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactAvatarText: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins_700Bold',
    },
    contactName: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    contactPhone: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        marginTop: 1,
    },
    contactBtn: {
        borderTopWidth: 0.5,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        flexDirection: 'row',
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

    // Emoji Picker styling
    emojiPickerContainer: {
        height: 250,
        borderTopWidth: 0.5,
    },
    emojiScroll: {
        padding: 12,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    emojiBtn: {
        width: '12.5%', // 8 columns grid
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    emojiText: {
        fontSize: 24,
    },

    // Attachment menu panel
    attachmentPanel: {
        position: 'absolute',
        bottom: 64,
        left: 10,
        right: 10,
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 14,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        zIndex: 100,
    },
    attachItem: {
        width: '28%',
        alignItems: 'center',
        marginVertical: 4,
    },
    attachCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    attachLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
    },

    contextOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    contextMenu: { borderRadius: 20, padding: 16, width: '100%', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
    contextMsgPreview: { fontSize: 13, fontFamily: 'Poppins_400Regular', paddingVertical: 8, paddingHorizontal: 4 },
    contextDivider: { height: 1, marginVertical: 8 },
    contextAction: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 },
    contextActionText: { fontSize: 16, fontFamily: 'Poppins_500Medium' },

    // Mock Selection Overlay & Modals
    mockOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mockContainer: {
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 340,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    mockTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    mockPhotosGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 10,
    },
    mockPhotoCard: {
        width: '48%',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        marginBottom: 6,
    },
    mockPhotoThumb: {
        width: '100%',
        height: 80,
    },
    mockPhotoLabel: {
        fontSize: 11,
        fontFamily: 'Poppins_600SemiBold',
        padding: 6,
        textAlign: 'center',
    },
    mockRowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 0.5,
    },
    mockRowText: {
        fontSize: 13,
        fontFamily: 'Poppins_600SemiBold',
        flex: 1,
    },
    mockCloseBtn: {
        marginTop: 18,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mockCloseBtnText: {
        fontFamily: 'Poppins_700Bold',
        fontSize: 14,
    },
});
