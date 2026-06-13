import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { apiService, Place } from '../services/apiService';
import { favoritesService } from '../services/favoritesService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Directory'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function DirectoryScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [places, setPlaces] = useState<Place[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Professional' | 'Institution' | 'Favorites'>('All');

  const fetchPlaces = async (showLoadingIndicator = true) => {
    try {
      if (showLoadingIndicator) setLoading(true);
      const data = await apiService.getPlaces({ status: 'approved' });
      setPlaces(data);
      const favs = await favoritesService.getIds();
      setFavoriteIds(favs);
    } catch (error) {
      console.error('[DirectoryScreen] Erro ao carregar locais:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload favorites and places when the screen gets focused
  useFocusEffect(
    useCallback(() => {
      fetchPlaces(false);
    }, [])
  );

  useEffect(() => {
    fetchPlaces(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlaces(false);
  };

  const handleToggleFavorite = async (place: Place) => {
    try {
      const isFav = await favoritesService.toggle(place);
      const favs = await favoritesService.getIds();
      setFavoriteIds(favs);
    } catch (error) {
      console.error('[DirectoryScreen] Erro ao alternar favorito:', error);
    }
  };

  const filteredPlaces = places.filter(place => {
    // Search query match
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      place.name.toLowerCase().includes(query) ||
      (place.description?.toLowerCase().includes(query) ?? false) ||
      (place.city?.toLowerCase().includes(query) ?? false);

    // Active filter match
    const isFavorite = favoriteIds.includes(place.id);
    const matchesFilter =
      activeFilter === 'All' ||
      (activeFilter === 'Professional' && place.type === 'professional') ||
      (activeFilter === 'Institution' && place.type === 'institution') ||
      (activeFilter === 'Favorites' && isFavorite);

    return matchesSearch && matchesFilter;
  });

  const renderPlaceItem = ({ item }: { item: Place }) => {
    const isFavorite = favoriteIds.includes(item.id);
    const accessibility = item.place_accessibility?.[0];

    const badges = [
      accessibility?.wheelchair_accessible && { label: 'Acesso adaptado', icon: 'accessibility' as const, color: '#6366f1' },
      accessibility?.low_noise && { label: 'Ruído reduzido', icon: 'volume-mute' as const, color: colors.primary },
      accessibility?.soft_lighting && { label: 'Luz suave', icon: 'sunny' as const, color: '#f59e0b' },
    ].filter(Boolean) as Array<{ label: string; icon: keyof typeof Ionicons.glyphMap; color: string }>;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => navigation.navigate('PlaceProfile', { placeId: item.id, place: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: item.type === 'professional' ? colors.primary + '18' : '#3b82f618' }]}>
            <Ionicons
              name={item.type === 'professional' ? 'medical' : 'business'}
              size={20}
              color={item.type === 'professional' ? colors.primary : '#3b82f6'}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.typeRow}>
              <Text style={[styles.typeLabel, { color: item.type === 'professional' ? colors.accent : '#3b82f6' }]}>
                {item.type === 'professional' ? 'Profissional' : 'Instituição'}
              </Text>
              {item.city ? (
                <>
                  <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
                  <Text style={[styles.city, { color: colors.textSecondary }]}>{item.city}</Text>
                </>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => handleToggleFavorite(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#ef4444' : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        {item.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {badges.length > 0 && (
          <View style={styles.badgesContainer}>
            {badges.map((badge, index) => (
              <View key={index} style={[styles.badge, { backgroundColor: badge.color + '10' }]}>
                <Ionicons name={badge.icon} size={12} color={badge.color} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Diretório</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Encontra profissionais e instituições adaptados
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Pesquisar por nome, cidade ou tipo..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersScroll}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'All', label: 'Todos' },
            { id: 'Professional', label: 'Profissionais' },
            { id: 'Institution', label: 'Instituições' },
            { id: 'Favorites', label: 'Favoritos' }
          ]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.filtersContainer}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.id;
            return (
              <TouchableOpacity
                onPress={() => setActiveFilter(item.id as any)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border
                  }
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: isActive ? '#fff' : colors.textPrimary }
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>A carregar diretório...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlaces}
          renderItem={renderPlaceItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={50} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sem resultados</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Não encontramos nenhum profissional ou instituição para os teus filtros atuais.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 15,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    paddingVertical: 8,
  },
  filtersScroll: {
    marginBottom: 15,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  dot: {
    marginHorizontal: 6,
    fontSize: 14,
  },
  city: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  favBtn: {
    paddingLeft: 10,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.8,
    lineHeight: 18,
  },
});
