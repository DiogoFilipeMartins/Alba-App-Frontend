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
    Image,
    ScrollView,
    Linking,
    Dimensions,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { apiService, NewsItem } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';
import tw from 'twrnc';

type Props = NativeStackScreenProps<RootStackParamList, 'News'>;

const { width, height } = Dimensions.get('window');

const CATEGORIES = ['Todos', 'Direitos', 'Educação', 'Ciência', 'Comunidade', 'Tecnologia'];

const getCategoryColor = (category: string) => {
    switch (category) {
        case 'Direitos': return '#FF9500'; // Orange
        case 'Educação': return '#34C759'; // Green
        case 'Ciência': return '#007AFF'; // Blue
        case 'Comunidade': return '#AF52DE'; // Purple
        case 'Tecnologia': return '#FF2D55'; // Pink/Red
        default: return '#8E8E93'; // Gray
    }
};

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} de ${month}, ${year}`;
    } catch (e) {
        return dateString;
    }
};

// Simple helper to calculate reading time
const getReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const noOfWords = text.split(/\s+/).length;
    const minutes = Math.ceil(noOfWords / wordsPerMinute);
    return `Leitura de ${minutes} min`;
};

export default function NewsScreen({}: Props) {
    const { colors, isDark } = useTheme();
    const navigation = useNavigation<any>();
    
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);

    const fetchNews = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const filters = {
                category: selectedCategory,
                query: searchQuery.trim() !== '' ? searchQuery : undefined
            };

            const data = await apiService.getNews(filters);
            setNews(data);
        } catch (error) {
            console.error('Error fetching news:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [selectedCategory]);

    // Handle search query submission
    const handleSearchSubmit = () => {
        fetchNews();
    };

    // Clear search
    const handleClearSearch = () => {
        setSearchQuery('');
        // We need to fetch again with empty query
        setTimeout(() => {
            fetchNews();
        }, 100);
    };

    const renderNewsItem = ({ item }: { item: NewsItem }) => {
        const catColor = getCategoryColor(item.category);
        return (
            <Pressable 
                onPress={() => setSelectedArticle(item)}
                style={({ pressed }) => [
                    styles.card,
                    { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }]
                    }
                ]}
            >
                {item.imageUrl && (
                    <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                )}
                
                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <View style={[styles.catBadge, { backgroundColor: catColor + '15' }]}>
                            <Text style={[styles.catBadgeText, { color: catColor }]}>{item.category}</Text>
                        </View>
                        <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>
                            {getReadingTime(item.content)}
                        </Text>
                    </View>

                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                        {item.description}
                    </Text>

                    <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.cardFooter}>
                        <View style={styles.sourceWrap}>
                            <Ionicons name="newspaper-outline" size={14} color={colors.accent} />
                            <Text style={[styles.sourceName, { color: colors.textSecondary }]}>
                                {item.sourceName}
                            </Text>
                        </View>
                        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                            {formatDate(item.publishedAt)}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top']}>
            
            {/* Custom Header */}
            <View style={styles.headerContainer}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={26} color={colors.primary} />
                </Pressable>
                <View style={styles.headerTextWrap}>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notícias</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Novidades, direitos e ciência sobre o autismo.
                    </Text>
                </View>
            </View>

            {/* Search Input */}
            <View style={styles.searchSection}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7', borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearchSubmit}
                        placeholder="Pesquisar notícias..."
                        placeholderTextColor={colors.textMuted}
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={handleClearSearch} style={styles.clearBtn}>
                            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Horizontal Categories Scroll */}
            <View style={styles.categoriesContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesScrollContent}
                >
                    {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                            <Pressable
                                key={cat}
                                onPress={() => setSelectedCategory(cat)}
                                style={[
                                    styles.categoryChip,
                                    isSelected 
                                        ? { backgroundColor: colors.primary } 
                                        : { backgroundColor: colors.card, borderColor: colors.border }
                                ]}
                            >
                                <Text 
                                    style={[
                                        styles.categoryChipText,
                                        isSelected 
                                            ? { color: '#FFFFFF', fontWeight: '700' } 
                                            : { color: colors.textSecondary }
                                    ]}
                                >
                                    {cat}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* News List */}
            {loading && !refreshing ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={news}
                    keyExtractor={(item) => item.id}
                    renderItem={renderNewsItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchNews(true)}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="newspaper-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Nenhuma notícia encontrada com estes filtros.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Immersive Article Reader Modal */}
            <Modal
                visible={!!selectedArticle}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setSelectedArticle(null)}
            >
                {selectedArticle && (
                    <SafeAreaView style={[styles.modalRoot, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                        {/* Sticky Modal Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
                            <Pressable 
                                onPress={() => setSelectedArticle(null)} 
                                style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                            >
                                <Ionicons name="close" size={24} color={colors.textPrimary} />
                            </Pressable>
                            <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                {selectedArticle.sourceName}
                            </Text>
                            {selectedArticle.sourceUrl ? (
                                <Pressable 
                                    onPress={() => Linking.openURL(selectedArticle.sourceUrl!)}
                                    style={[styles.modalOpenBtn, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
                                >
                                    <Ionicons name="open-outline" size={20} color={colors.primary} />
                                </Pressable>
                            ) : (
                                <View style={{ width: 40 }} />
                            )}
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
                            {selectedArticle.imageUrl && (
                                <Image source={{ uri: selectedArticle.imageUrl }} style={styles.modalImage} resizeMode="cover" />
                            )}

                            <View style={styles.modalContentWrap}>
                                <View style={styles.modalMetaRow}>
                                    <View style={[styles.catBadge, { backgroundColor: getCategoryColor(selectedArticle.category) + '15' }]}>
                                        <Text style={[styles.catBadgeText, { color: getCategoryColor(selectedArticle.category) }]}>
                                            {selectedArticle.category}
                                        </Text>
                                    </View>
                                    <Text style={[styles.modalMetaText, { color: colors.textMuted }]}>
                                        {formatDate(selectedArticle.publishedAt)} • {getReadingTime(selectedArticle.content)}
                                    </Text>
                                </View>

                                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                                    {selectedArticle.title}
                                </Text>

                                <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />

                                {/* Render paragraph-by-paragraph text */}
                                {selectedArticle.content.split('\n\n').map((paragraph, index) => (
                                    <Text key={index} style={[styles.modalParagraph, { color: colors.textPrimary }]}>
                                        {paragraph.trim()}
                                    </Text>
                                ))}

                                {selectedArticle.sourceUrl && (
                                    <Pressable 
                                        onPress={() => Linking.openURL(selectedArticle.sourceUrl!)}
                                        style={[styles.sourceButton, { backgroundColor: colors.primary }]}
                                    >
                                        <Ionicons name="logo-chrome" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text style={styles.sourceButtonText}>Ler Artigo Original Completo</Text>
                                    </Pressable>
                                )}
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                )}
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    // Header
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    backBtn: {
        padding: 8,
        marginRight: 8,
        marginLeft: -8,
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Poppins_700Bold',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        marginTop: -2,
    },

    // Search
    searchSection: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 12,
        height: 50,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Poppins_400Regular',
        height: '100%',
        paddingVertical: 0,
    },
    clearBtn: {
        padding: 4,
    },

    // Category chips
    categoriesContainer: {
        marginBottom: 16,
    },
    categoriesScrollContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipText: {
        fontSize: 14,
        fontFamily: 'Poppins_500Medium',
    },

    // FlatList feed
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
        gap: 20,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardImage: {
        width: '100%',
        height: 180,
        backgroundColor: '#E5E5EA',
    },
    cardContent: {
        padding: 20,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    catBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    catBadgeText: {
        fontSize: 11,
        fontFamily: 'Poppins_700Bold',
        textTransform: 'uppercase',
    },
    cardMetaText: {
        fontSize: 12,
        fontFamily: 'Poppins_500Medium',
    },
    cardTitle: {
        fontSize: 18,
        fontFamily: 'Poppins_700Bold',
        lineHeight: 24,
        marginBottom: 8,
    },
    cardDesc: {
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 20,
        marginBottom: 16,
    },
    cardDivider: {
        height: 1,
        width: '100%',
        marginBottom: 14,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sourceWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    sourceName: {
        fontSize: 13,
        fontFamily: 'Poppins_700Bold',
    },
    cardDate: {
        fontSize: 12,
        fontFamily: 'Poppins_400Regular',
    },

    emptyWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
        opacity: 0.6,
    },
    emptyText: {
        fontSize: 15,
        fontFamily: 'Poppins_500Medium',
        textAlign: 'center',
        marginTop: 16,
        paddingHorizontal: 40,
    },

    // Modal view
    modalRoot: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    modalCloseBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalHeaderTitle: {
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
        maxWidth: width * 0.5,
    },
    modalOpenBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalScrollContent: {
        paddingBottom: 40,
    },
    modalImage: {
        width: '100%',
        height: 240,
        backgroundColor: '#E5E5EA',
    },
    modalContentWrap: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    modalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    modalMetaText: {
        fontSize: 13,
        fontFamily: 'Poppins_500Medium',
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: 'Poppins_700Bold',
        lineHeight: 32,
        marginBottom: 20,
    },
    modalDivider: {
        height: 1,
        width: '100%',
        marginBottom: 24,
    },
    modalParagraph: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 26,
        marginBottom: 20,
        textAlign: 'justify',
    },
    sourceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    sourceButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins_700Bold',
    },
});
