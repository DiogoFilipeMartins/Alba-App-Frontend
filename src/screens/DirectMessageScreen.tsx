import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, Pressable,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, DirectMessage } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DirectMessage'>;

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

type ListItem =
    | { type: 'separator'; date: string; id: string }
    | { type: 'message'; data: DirectMessage };

export default function DirectMessageScreen({ route, navigation }: Props) {
    const { userId, userName } = route.params;
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const chatBg = isDark ? '#0B141A' : '#efeae2';
    const headerBg = isDark ? '#202C33' : '#F0F2F5';
    const accentGreen = '#13CF75';

    const fetch = useCallback(async () => {
        try {
            const data = await apiService.getDMMessages(userId);
            setMessages(data);
        } catch {}
        finally { setLoading(false); }
    }, [userId]);

    useEffect(() => {
        fetch();
        const interval = setInterval(fetch, 5000);
        return () => clearInterval(interval);
    }, [fetch]);

    const listItems: ListItem[] = React.useMemo(() => {
        const result: ListItem[] = [];
        let lastDate = '';
        for (const msg of messages) {
            const dateKey = new Date(msg.created_at).toDateString();
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
        const content = text.trim();
        setText('');
        setSending(true);
        try {
            const msg = await apiService.sendDM(userId, content);
            setMessages(prev => [...prev, msg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch {}
        finally { setSending(false); }
    };

    const renderItem = ({ item }: { item: ListItem }) => {
        if (item.type === 'separator') {
            return (
                <View style={s.sepRow}>
                    <View style={[s.sepPill, { backgroundColor: isDark ? '#1C1C1E' : '#E1E1E6' }]}>
                        <Text style={[s.sepText, { color: colors.textSecondary }]}>{item.date}</Text>
                    </View>
                </View>
            );
        }
        const msg = item.data;
        const isMine = msg.sender_id === user?.id;
        return (
            <View style={[s.msgRow, isMine ? s.msgRowMine : s.msgRowOther]}>
                <View style={[
                    s.bubble,
                    isMine
                        ? { backgroundColor: isDark ? '#005C4B' : '#E7FFDB', borderBottomRightRadius: 2 }
                        : { backgroundColor: isDark ? '#202C33' : '#FFF', borderBottomLeftRadius: 2 },
                ]}>
                    <Text style={[s.msgText, { color: isDark ? '#E9EDEF' : '#303030' }]}>{msg.content}</Text>
                    <Text style={[s.msgTime, { color: isDark ? '#8696A0' : '#667781' }]}>{formatTime(msg.created_at)}</Text>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[s.root, { backgroundColor: chatBg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <SafeAreaView style={{ backgroundColor: headerBg }} edges={['top']}>
                <View style={[s.header, { backgroundColor: headerBg, borderBottomColor: isDark ? '#222E35' : '#E9E9EB' }]}>
                    <Pressable onPress={() => navigation.goBack()} style={s.headerBtn}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? '#E9EDEF' : '#54656F'} />
                    </Pressable>
                    <View style={[s.avatar, { backgroundColor: accentGreen }]}>
                        <Text style={s.avatarText}>{(userName[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.headerName, { color: isDark ? '#E9EDEF' : '#111B21' }]} numberOfLines={1}>{userName}</Text>
                        <Text style={[s.headerSub, { color: isDark ? '#8696A0' : '#667781' }]}>Mensagem direta</Text>
                    </View>
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={s.centered}><ActivityIndicator color={accentGreen} size="large" /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={listItems}
                    keyExtractor={item => item.type === 'separator' ? item.id : item.data.id}
                    renderItem={renderItem}
                    contentContainerStyle={s.list}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <Ionicons name="chatbubble-outline" size={48} color={accentGreen + '80'} />
                            <Text style={[s.emptyText, { color: colors.textSecondary }]}>Envia a primeira mensagem!</Text>
                        </View>
                    }
                />
            )}

            <SafeAreaView style={[s.inputWrap, { backgroundColor: chatBg }]} edges={['bottom']}>
                <View style={[s.inputCapsule, { backgroundColor: isDark ? '#2A3942' : '#FFF' }]}>
                    <TextInput
                        style={[s.input, { color: isDark ? '#E9EDEF' : '#111B21' }]}
                        placeholder="Mensagem"
                        placeholderTextColor={isDark ? '#8696A0' : '#667781'}
                        value={text}
                        onChangeText={setText}
                        multiline
                        onSubmitEditing={handleSend}
                    />
                </View>
                <Pressable
                    onPress={handleSend}
                    disabled={!text.trim() || sending}
                    style={[s.sendBtn, { backgroundColor: text.trim() ? accentGreen : (isDark ? '#8696A0' : '#54656F'), opacity: text.trim() ? 1 : 0.6 }]}
                >
                    {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />}
                </Pressable>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
    headerBtn: { padding: 8 },
    avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFF', fontFamily: 'Poppins_700Bold', fontSize: 16 },
    headerName: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
    headerSub: { fontSize: 12, fontFamily: 'Poppins_400Regular' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 12, paddingBottom: 8 },
    msgRow: { marginVertical: 2, paddingHorizontal: 4 },
    msgRowMine: { alignItems: 'flex-end' },
    msgRowOther: { alignItems: 'flex-start' },
    bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
    msgText: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 20 },
    msgTime: { fontSize: 10, fontFamily: 'Poppins_400Regular', alignSelf: 'flex-end', marginTop: 4 },
    sepRow: { alignItems: 'center', marginVertical: 8 },
    sepPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    sepText: { fontSize: 11, fontFamily: 'Poppins_600SemiBold' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 14, fontFamily: 'Poppins_400Regular' },
    inputWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
    inputCapsule: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
    input: { fontSize: 15, fontFamily: 'Poppins_400Regular', maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
