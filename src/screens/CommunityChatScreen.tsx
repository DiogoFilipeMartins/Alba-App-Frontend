import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, CommunityMessage } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'CommunityChat'>;

export default function CommunityChatScreen({ route, navigation }: Props) {
    const { communityId, communityName } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const flatListRef = useRef<FlatList>(null);

    const fetchMessages = async () => {
        try {
            const data = await apiService.getCommunityMessages(communityId);
            setMessages(data);
        } catch (error) {
            console.error('Erro ao carregar mensagens', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Polling simples
        return () => clearInterval(interval);
    }, [communityId]);

    const handleSend = async () => {
        if (!text.trim() || sending) return;
        const msgText = text.trim();
        setText(''); // Otimismo UI
        setSending(true);
        try {
            const newMsg = await apiService.sendCommunityMessage(communityId, msgText);
            setMessages(prev => [...prev, newMsg]);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Erro ao enviar', error);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: CommunityMessage }) => {
        const isMine = item.user_id === user?.id;
        const name = item.profiles?.full_name || 'Utilizador';

        return (
            <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
                {!isMine && (
                    <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <View style={[styles.msgBubble, isMine ? { backgroundColor: colors.primary } : { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
                    {!isMine && <Text style={[styles.senderName, { color: colors.textSecondary }]}>{name}</Text>}
                    <Text style={[styles.msgText, { color: isMine ? '#fff' : colors.textPrimary }]}>{item.content}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </Pressable>
                <View style={styles.headerTitleWrap}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{communityName}</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Comunidade Alba</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.list}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sê o primeiro a dizer olá!</Text>
                        </View>
                    }
                />
            )}

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
                    <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.5 }]} disabled={!text.trim() || sending}>
                        <Ionicons name="send" size={18} color="#fff" />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    backBtn: { padding: 4, marginRight: 8 },
    headerTitleWrap: { flex: 1 },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins_700Bold' },
    headerSubtitle: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 16, gap: 12, paddingBottom: 32 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, maxWidth: '85%' },
    msgRowMine: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    msgRowOther: { alignSelf: 'flex-start' },
    avatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarText: { fontSize: 12, fontFamily: 'Poppins_700Bold' },
    msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
    senderName: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', marginBottom: 2 },
    msgText: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 20 },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 14, fontFamily: 'Poppins_500Medium' },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1 },
    input: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, fontFamily: 'Poppins_400Regular' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
});
