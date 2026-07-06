import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, Pressable, FlatList, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
    {
        icon: 'map' as const,
        color: '#13CF75',
        title: 'Mapa de Acessibilidade',
        body: 'Encontra locais acessíveis para pessoas com autismo — clínicas, terapeutas e espaços amigáveis — mesmo perto de ti.',
    },
    {
        icon: 'people' as const,
        color: '#6D28D9',
        title: 'Comunidades',
        body: 'Junta-te a grupos de apoio, partilha experiências e conecta-te com famílias e profissionais que entendem o teu caminho.',
    },
    {
        icon: 'sparkles' as const,
        color: '#f59e0b',
        title: 'Alba IA',
        body: 'O teu assistente pessoal para dúvidas sobre autismo, recursos disponíveis e sugestões de locais próximos de ti.',
    },
    {
        icon: 'calendar' as const,
        color: '#0369a1',
        title: 'Agenda e Notícias',
        body: 'Mantém-te atualizado com eventos, consultas e as últimas notícias sobre o espetro do autismo em Portugal.',
    },
];

interface Props {
    visible: boolean;
    onDone: () => void;
}

export default function OnboardingModal({ visible, onDone }: Props) {
    const { colors, isDark } = useTheme();
    const [current, setCurrent] = useState(0);
    const flatRef = useRef<FlatList>(null);

    const isLast = current === SLIDES.length - 1;

    const goNext = () => {
        if (isLast) {
            onDone();
            return;
        }
        const next = current + 1;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        setCurrent(next);
    };

    const goBack = () => {
        if (current === 0) return;
        const prev = current - 1;
        flatRef.current?.scrollToIndex({ index: prev, animated: true });
        setCurrent(prev);
    };

    const bg = isDark ? '#0B141A' : '#F0F2F5';
    const cardBg = isDark ? '#111B21' : '#FFFFFF';

    return (
        <Modal visible={visible} animationType="fade" statusBarTranslucent>
            <SafeAreaView style={[s.root, { backgroundColor: bg }]} edges={['top', 'bottom']}>
                {/* Skip button */}
                <Pressable style={s.skipBtn} onPress={onDone}>
                    <Text style={[s.skipText, { color: colors.textSecondary }]}>Saltar</Text>
                </Pressable>

                <FlatList
                    ref={flatRef}
                    data={SLIDES}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, i) => String(i)}
                    getItemLayout={(_, index) => ({ length: SCREEN_W, offset: SCREEN_W * index, index })}
                    renderItem={({ item }) => (
                        <View style={[s.slide, { width: SCREEN_W }]}>
                            <View style={[s.iconCircle, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
                                <Ionicons name={item.icon} size={64} color={item.color} />
                            </View>
                            <Text style={[s.title, { color: isDark ? '#E9EDEF' : '#111B21' }]}>{item.title}</Text>
                            <Text style={[s.body, { color: isDark ? '#8696A0' : '#667781' }]}>{item.body}</Text>
                        </View>
                    )}
                />

                {/* Dots */}
                <View style={s.dots}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                s.dot,
                                { backgroundColor: i === current ? SLIDES[current].color : (isDark ? '#222E35' : '#D1D5DB') },
                                i === current && { width: 24 },
                            ]}
                        />
                    ))}
                </View>

                {/* Navigation buttons */}
                <View style={s.nav}>
                    {current > 0 ? (
                        <Pressable style={[s.navBtn, { borderColor: isDark ? '#222E35' : '#E5E7EB', borderWidth: 1 }]} onPress={goBack}>
                            <Ionicons name="arrow-back" size={20} color={isDark ? '#8696A0' : '#667781'} />
                        </Pressable>
                    ) : <View style={s.navBtn} />}

                    <Pressable
                        style={[s.nextBtn, { backgroundColor: SLIDES[current].color }]}
                        onPress={goNext}
                    >
                        <Text style={s.nextText}>{isLast ? 'Começar' : 'Seguinte'}</Text>
                        {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />}
                    </Pressable>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const s = StyleSheet.create({
    root: { flex: 1 },
    skipBtn: { alignSelf: 'flex-end', padding: 20 },
    skipText: { fontSize: 14, fontFamily: 'Poppins_600SemiBold' },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 20 },
    iconCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    title: { fontSize: 26, fontFamily: 'Poppins_700Bold', textAlign: 'center' },
    body: { fontSize: 15, fontFamily: 'Poppins_400Regular', textAlign: 'center', lineHeight: 24 },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingBottom: 32 },
    dot: { height: 8, width: 8, borderRadius: 4 },
    nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 24, gap: 16 },
    navBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    nextBtn: { flex: 1, height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
    nextText: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_700Bold' },
});
