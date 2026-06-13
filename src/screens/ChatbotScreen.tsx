import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Pressable,
    Animated,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { apiService, Place } from '../services/apiService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Chatbot'>;

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'bot' | 'bot-results' | 'bot-typing';

interface Message {
    id: string;
    role: MessageRole;
    text?: string;
    results?: Place[];
    timestamp: Date;
}

// ─── Suggestion chips shown on start ──────────────────────────────────────────

const SUGGESTIONS = [
    'Terapeuta perto de mim',
    'Espaço com ruído reduzido',
    'Clínica com acesso adaptado',
    'Apoio para autismo',
    'Centro de terapia Lisboa',
];

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ color }: { color: string }) {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

    useEffect(() => {
        const animations = dots.map((dot, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 150),
                    Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
                    Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                    Animated.delay(450),
                ])
            )
        );
        animations.forEach(a => a.start());
        return () => animations.forEach(a => a.stop());
    }, []);

    return (
        <View style={styles.typingWrap}>
            {dots.map((dot, i) => (
                <Animated.View
                    key={i}
                    style={[styles.typingDot, { backgroundColor: color, opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] }]}
                />
            ))}
        </View>
    );
}

// ─── Place result card ────────────────────────────────────────────────────────

function PlaceCard({ place, colors }: { place: Place; colors: any }) {
    const openDirections = () => {
        const lat = Number(place.latitude);
        const lng = Number(place.longitude);
        const label = encodeURIComponent(place.name);
        const url = Platform.select({
            ios: `http://maps.apple.com/?ll=${lat},${lng}&q=${label}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
            default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
        });
        if (url) Linking.openURL(url);
    };

    const accessibility = place.place_accessibility?.[0];
    const badges = [
        accessibility?.wheelchair_accessible && { label: 'Acesso adaptado', icon: 'accessibility' as const, color: '#6366f1' },
        accessibility?.low_noise && { label: 'Ruído reduzido', icon: 'volume-mute' as const, color: '#0ea5e9' },
        accessibility?.soft_lighting && { label: 'Luz suave', icon: 'sunny' as const, color: '#f59e0b' },
    ].filter(Boolean) as { label: string; icon: any; color: string }[];

    return (
        <View style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.placeCardHeader}>
                <View style={[styles.placeIcon, { backgroundColor: place.type === 'professional' ? colors.accent + '20' : '#3b82f620' }]}>
                    <Ionicons
                        name={place.type === 'professional' ? 'medical' : 'business'}
                        size={18}
                        color={place.type === 'professional' ? colors.accent : '#3b82f6'}
                    />
                </View>
                <View style={styles.placeInfo}>
                    <Text style={[styles.placeName, { color: colors.textPrimary }]} numberOfLines={1}>
                        {place.name}
                    </Text>
                    <Text style={[styles.placeCity, { color: colors.textSecondary }]} numberOfLines={1}>
                        {place.type === 'professional' ? 'Profissional' : 'Instituição'}
                        {place.city ? ` · ${place.city}` : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={openDirections} style={[styles.directionsBtn, { backgroundColor: colors.primary }]}>
                    <Ionicons name="navigate" size={14} color="#fff" />
                </TouchableOpacity>
            </View>
            {place.description ? (
                <Text style={[styles.placeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {place.description}
                </Text>
            ) : null}
            {badges.length > 0 && (
                <View style={styles.placeBadges}>
                    {badges.map((b, i) => (
                        <View key={i} style={[styles.placeBadge, { backgroundColor: b.color + '18' }]}>
                            <Ionicons name={b.icon} size={11} color={b.color} />
                            <Text style={[styles.placeBadgeText, { color: b.color }]}>{b.label}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatbotScreen({ navigation }: Props) {
    const { colors, isDark } = useTheme();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'bot',
            text: 'Olá! 👋 Sou a **Alba**, o teu assistente virtual.\n\nDescreve o que precisas e vou sugerir-te profissionais e instituições adaptadas. Por exemplo:\n\n*"Preciso de um terapeuta com ambiente calmo"*',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const listRef = useRef<FlatList>(null);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

    const sendMessage = useCallback(async (text: string) => {
        const query = text.trim();
        if (!query || loading) return;

        setInput('');

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: query,
            timestamp: new Date(),
        };

        const typingMsg: Message = {
            id: 'typing',
            role: 'bot-typing',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg, typingMsg]);
        setLoading(true);

        const newHistory: { role: 'user' | 'assistant'; content: string }[] = [
            ...history,
            { role: 'user', content: query },
        ];

        try {
            const reply = await apiService.sendChatMessage(newHistory);

            const updatedHistory: { role: 'user' | 'assistant'; content: string }[] = [
                ...newHistory,
                { role: 'assistant', content: reply },
            ];
            setHistory(updatedHistory);

            setMessages(prev => {
                const withoutTyping = prev.filter(m => m.id !== 'typing');
                const botReply: Message = {
                    id: Date.now().toString() + '-r',
                    role: 'bot',
                    text: reply,
                    timestamp: new Date(),
                };
                return [...withoutTyping, botReply];
            });
        } catch (err: any) {
            setMessages(prev => {
                const withoutTyping = prev.filter(m => m.id !== 'typing');
                const isTimeout = err?.message?.includes('demorou demasiado');
                return [...withoutTyping, {
                    id: Date.now().toString() + '-e',
                    role: 'bot' as const,
                    text: isTimeout
                        ? '⏳ O servidor está a acordar... Tenta novamente em alguns segundos!'
                        : 'Ocorreu um erro ao contactar a IA. Verifica a ligação e tenta novamente.',
                    timestamp: new Date(),
                }];
            });
        } finally {
            setLoading(false);
        }
    }, [loading, history]);

    const renderBotText = (text: string, textColor: string) => {
        // Simple bold (**text**) and italic (*text*) rendering
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return (
            <Text style={[styles.botText, { color: textColor }]}>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <Text key={i} style={{ fontFamily: 'Poppins_700Bold' }}>{part.slice(2, -2)}</Text>;
                    }
                    if (part.startsWith('*') && part.endsWith('*')) {
                        return <Text key={i} style={{ fontStyle: 'italic', color: colors.accent }}>{part.slice(1, -1)}</Text>;
                    }
                    return <Text key={i}>{part}</Text>;
                })}
            </Text>
        );
    };

    const renderMessage = ({ item }: { item: Message }) => {
        if (item.role === 'bot-typing') {
            return (
                <View style={styles.botRow}>
                    <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.botAvatarText}>A</Text>
                    </View>
                    <View style={[styles.botBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TypingIndicator color={colors.accent} />
                    </View>
                </View>
            );
        }

        if (item.role === 'user') {
            return (
                <View style={styles.userRow}>
                    <View style={[styles.userBubble, { backgroundColor: colors.primary }]}>
                        <Text style={styles.userText}>{item.text}</Text>
                    </View>
                </View>
            );
        }

        // bot or bot-results
        return (
            <View style={styles.botRow}>
                <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.botAvatarText}>A</Text>
                </View>
                <View style={styles.botContent}>
                    <View style={[styles.botBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {item.text ? renderBotText(item.text, colors.textPrimary) : null}
                    </View>
                    {item.results && item.results.length > 0 && (
                        <View style={styles.resultsContainer}>
                            {item.results.map(place => (
                                <PlaceCard key={place.id} place={place} colors={colors} />
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.headerAvatarText}>A</Text>
                    <View style={styles.onlineDot} />
                </View>
                <View style={styles.headerInfo}>
                    <Text style={[styles.headerName, { color: colors.textPrimary }]}>Alba</Text>
                    <Text style={[styles.headerStatus, { color: colors.accent }]}>Assistente virtual · Online</Text>
                </View>
                <View style={[styles.headerBadge, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="sparkles" size={14} color={colors.accent} />
                    <Text style={[styles.headerBadgeText, { color: colors.accent }]}>IA</Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {/* Messages */}
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={scrollToBottom}
                    ListFooterComponent={
                        messages.length === 1 ? (
                            <View style={styles.suggestionsWrap}>
                                <Text style={[styles.suggestionsLabel, { color: colors.textMuted }]}>
                                    Sugestões de pesquisa
                                </Text>
                                <View style={styles.chips}>
                                    {SUGGESTIONS.map((s, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                                            onPress={() => sendMessage(s)}
                                        >
                                            <Text style={[styles.chipText, { color: colors.textPrimary }]}>{s}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : null
                    }
                />

                {/* Input bar */}
                <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TextInput
                        style={[styles.input, { color: colors.textPrimary, backgroundColor: isDark ? '#111' : colors.surface }]}
                        placeholder="Descreve o que precisas..."
                        placeholderTextColor={colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={300}
                        onSubmitEditing={() => sendMessage(input)}
                        blurOnSubmit={false}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.border }]}
                        onPress={() => sendMessage(input)}
                        disabled={!input.trim() || loading}
                        activeOpacity={0.7}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="send" size={18} color="#fff" />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        gap: 12,
    },
    headerAvatar: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    headerAvatarText: { color: '#fff', fontSize: 18, fontFamily: 'Poppins_700Bold' },
    onlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontFamily: 'Poppins_700Bold' },
    headerStatus: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: -2 },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        gap: 4,
    },
    headerBadgeText: { fontSize: 11, fontFamily: 'Poppins_700Bold' },

    // Messages
    messagesList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

    userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
    userBubble: {
        maxWidth: '78%',
        borderRadius: 20,
        borderBottomRightRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    userText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 20 },

    botRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 10 },
    botAvatar: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: 2,
    },
    botAvatarText: { color: '#fff', fontSize: 14, fontFamily: 'Poppins_700Bold' },
    botContent: { flex: 1 },
    botBubble: {
        borderRadius: 20,
        borderTopLeftRadius: 4,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        alignSelf: 'flex-start',
        maxWidth: '100%',
    },
    botText: { fontSize: 14, fontFamily: 'Poppins_400Regular', lineHeight: 22 },

    // Typing
    typingWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
    typingDot: { width: 8, height: 8, borderRadius: 4 },

    // Results
    resultsContainer: { marginTop: 10, gap: 10 },
    placeCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
    },
    placeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    placeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    placeInfo: { flex: 1 },
    placeName: { fontSize: 14, fontFamily: 'Poppins_700Bold' },
    placeCity: { fontSize: 12, fontFamily: 'Poppins_400Regular', marginTop: 1 },
    directionsBtn: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    placeDesc: { fontSize: 12, fontFamily: 'Poppins_400Regular', lineHeight: 18, marginBottom: 8 },
    placeBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    placeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    placeBadgeText: { fontSize: 10, fontFamily: 'Poppins_600SemiBold' },

    // Suggestions
    suggestionsWrap: { paddingTop: 8, paddingBottom: 12 },
    suggestionsLabel: { fontSize: 11, fontFamily: 'Poppins_600SemiBold', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase', paddingLeft: 44 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 44 },
    chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
    chipText: { fontSize: 13, fontFamily: 'Poppins_500Medium' },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        gap: 10,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        maxHeight: 100,
        minHeight: 44,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
});
