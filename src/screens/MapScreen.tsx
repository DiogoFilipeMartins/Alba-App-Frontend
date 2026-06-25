import React, { useState, useEffect, memo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, Platform, Modal, Pressable, Alert, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { apiService, Place } from '../services/apiService';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { favoritesService } from '../services/favoritesService';
import { FontSize, FontFamily } from '../theme/font';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Componente de Marcador Memoizado para Performance usando MarkerView do Mapbox
const PlaceMarker = memo(({ place, colors, onPress }: { place: any, colors: any, onPress: () => void }) => {
  const lat = parseFloat(place.latitude || place.lat);
  const lng = parseFloat(place.longitude || place.lng);

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Mapbox.MarkerView
      id={`marker-${place.id}`}
      coordinate={[lng, lat]}
    >
      <TouchableOpacity 
        onPress={onPress}
        style={[styles.customMarker, { backgroundColor: place.type === 'professional' ? colors.accent : '#3b82f6' }]}
      >
        <Ionicons name={place.type === 'professional' ? 'medical' : 'business'} size={14} color="#FFF" />
      </TouchableOpacity>
    </Mapbox.MarkerView>
  );
});

export default function MapScreen({ navigation, route }: Props) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { colors, isDark } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showSuggestBtn, setShowSuggestBtn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [smartResults, setSmartResults] = useState<Place[] | null>(null);
  const [smartSearching, setSmartSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const cameraRef = React.useRef<Mapbox.Camera | null>(null);

  useEffect(() => {
    if (mapboxToken) {
      Mapbox.setAccessToken(mapboxToken);
    }
  }, [mapboxToken]);

  const FILTERS = ['Todos', 'Profissional', 'Instituição', 'Favoritos', 'Próximos'];

  const loadFavorites = async () => {
    const ids = await favoritesService.getIds();
    setFavoriteIds(ids);
  };

  // Haversine distance in km between two lat/lng points
  const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const fetchData = async () => {
    try {
      console.log('[MapScreen] A pedir permissões de localização...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[MapScreen] Permissão de localização:', status);
      if (status !== 'granted') {
        setErrorMsg('Permissão de acesso à localização negada.');
        setLoading(false);
        setLocationLoading(false);
        loadPlaces();
        loadMapboxToken();
        return;
      }

      // Montar o mapa imediatamente (sem bloquear a tela com loading spinner)
      setLoading(false);

      // Carregar locais, localização e token em paralelo
      Promise.all([
        loadPlaces(),
        loadLocation(),
        loadMapboxToken()
      ]);

    } catch (error) {
      console.error('[MapScreen] Erro no carregamento inicial:', error);
      setErrorMsg('Ocorreu um erro ao carregar os dados.');
      setLoading(false);
    }
  };

  const loadMapboxToken = async () => {
    try {
      console.log('[MapboxDebug] A buscar token do Mapbox...');
      const res = await apiService.getMapboxToken();
      console.log('[MapboxDebug] Resposta do backend:', res);
      if (res && res.token && !res.token.startsWith('pk.mock_')) {
        console.log('[MapboxDebug] Token válido obtido com sucesso!');
        setMapboxToken(res.token);
      } else {
        console.warn('[MapboxDebug] Token recebido é inválido ou mock:', res?.token);
      }
    } catch (error) {
      console.error('[MapboxDebug] Erro ao obter token do Mapbox:', error);
    }
  };

  const loadPlaces = async () => {
    try {
      setPlacesLoading(true);
      const data = await apiService.getPlaces({ status: 'approved' });
      setPlaces(data);
    } catch (error) {
      console.error('[MapScreen] Erro ao buscar locais:', error);
    } finally {
      setPlacesLoading(false);
    }
  };

  const loadLocation = async () => {
    try {
      setLocationLoading(true);
      
      // 1. Obter a última localização conhecida (extremamente rápido, <50ms)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        setLocation(lastKnown);
        // Centrar suavemente no mapa
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: [lastKnown.coords.longitude, lastKnown.coords.latitude],
            zoomLevel: 14,
            animationDuration: 500,
          });
        }
      }

      // 2. Obter a localização atual precisa em background (pode demorar segundos)
      const freshLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(freshLoc);
      
      // Centrar na localização precisa atual
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [freshLoc.coords.longitude, freshLoc.coords.latitude],
          zoomLevel: 14,
          animationDuration: 800,
        });
      }
    } catch (error) {
      console.error('[MapScreen] Erro ao obter localização precisa:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadFavorites();
  }, []);

  // Efeito para focar num local específico quando navegado a partir do Perfil
  useEffect(() => {
    const focusPlaceId = route.params?.focusPlaceId;
    if (focusPlaceId && places.length > 0) {
      const foundPlace = places.find(p => p.id === focusPlaceId);
      if (foundPlace) {
        setSelectedPlace(foundPlace);
        const lat = Number(foundPlace.latitude);
        const lng = Number(foundPlace.longitude);
        if (!isNaN(lat) && !isNaN(lng) && cameraRef.current) {
          setTimeout(() => {
            cameraRef.current?.setCamera({
              centerCoordinate: [lng, lat],
              zoomLevel: 15,
              animationDuration: 800,
            });
          }, 200);
        }
        // Limpar parâmetros de rota para evitar que volte a focar acidentalmente
        navigation.setParams({ focusPlaceId: undefined } as any);
      }
    }
  }, [route.params?.focusPlaceId, places, navigation]);



  const handleSmartSearch = async () => {
    if (!searchQuery.trim()) {
      setSmartResults(null);
      return;
    }

    try {
      setSmartSearching(true);
      const results = await apiService.searchPlaces(searchQuery.trim());
      setSmartResults(results);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível executar a pesquisa inteligente.');
    } finally {
      setSmartSearching(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedPlace) {
      return;
    }

    const isFavoriteNow = await favoritesService.toggle(selectedPlace);
    await loadFavorites();
    Alert.alert(
      isFavoriteNow ? 'Local guardado' : 'Local removido',
      isFavoriteNow ? 'Este local foi adicionado aos teus favoritos.' : 'Este local foi removido dos teus favoritos.'
    );
  };

  const openDirections = async () => {
    if (!selectedPlace) {
      return;
    }

    const latitude = Number(selectedPlace.latitude);
    const longitude = Number(selectedPlace.longitude);
    const label = encodeURIComponent(selectedPlace.name);
    const primaryUrl = Platform.select({
      ios: `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    if (!primaryUrl) {
      return;
    }

    const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const supported = await Linking.canOpenURL(primaryUrl);
    await Linking.openURL(supported ? primaryUrl : fallbackUrl);
  };

  const placesToRender = smartResults ?? places;

  const filteredPlaces = (() => {
    const userLat = location?.coords.latitude;
    const userLng = location?.coords.longitude;

    let list = placesToRender.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const filterType = activeFilter === 'Profissional' ? 'professional' : activeFilter === 'Instituição' ? 'institution' : 'Todos';
      const matchesType = filterType === 'Todos' || p.type === filterType;
      const matchesFavorites = activeFilter !== 'Favoritos' || favoriteIds.includes(p.id);
      const matchesFilter = matchesType && matchesFavorites;
      return matchesSearch && matchesFilter;
    });

    // For 'Próximos', sort by distance and limit to 20 closest
    if (activeFilter === 'Próximos' && userLat !== undefined && userLng !== undefined) {
      list = list
        .map(p => ({
          ...p,
          _distKm: getDistanceKm(userLat, userLng, Number(p.latitude), Number(p.longitude)),
        }))
        .sort((a: any, b: any) => a._distKm - b._distKm)
        .slice(0, 20) as any[];
    }

    return list;
  })();

  const selectedAccessibility = selectedPlace?.place_accessibility?.[0];
  const accessibilityBadges = selectedPlace
    ? [
        selectedAccessibility?.wheelchair_accessible
          ? { key: 'wheelchair', label: 'Acesso adaptado', icon: 'accessibility', color: colors.accent, background: colors.accent + '15' }
          : null,
        selectedAccessibility?.low_noise
          ? { key: 'low-noise', label: 'Ruído reduzido', icon: 'volume-mute', color: colors.primary, background: colors.primary + '15' }
          : null,
        selectedAccessibility?.soft_lighting
          ? { key: 'soft-lighting', label: 'Luz suave', icon: 'sunny', color: '#f59e0b', background: '#f59e0b15' }
          : null,
        selectedPlace.city
          ? { key: 'city', label: selectedPlace.city, icon: 'location', color: '#3b82f6', background: '#3b82f615' }
          : null,
      ].filter(Boolean) as Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; background: string }>
    : [];

  const isSelectedFavorite = selectedPlace ? favoriteIds.includes(selectedPlace.id) : false;

  console.log(`[Frontend] Locais após filtro: ${filteredPlaces.length}`);

  const centerOnUser = async () => {
    if (location && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [location.coords.longitude, location.coords.latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    }
  };

  if (!mapboxToken || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.accent }]}>A carregar o mapa...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Mapbox.MapView
        style={styles.map}
        styleURL={isDark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street}
        onLongPress={(feature) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          setSelectedCoords({ latitude, longitude });
          setShowSuggestBtn(true);
        }}
        onPress={() => {
          setSelectedPlace(null);
          if (showSuggestBtn) setShowSuggestBtn(false);
        }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [-9.1393, 38.7223],
            zoomLevel: 11,
          }}
        />
        <Mapbox.UserLocation />
        {selectedCoords && showSuggestBtn && (
          <Mapbox.MarkerView
            id="selected-coords"
            coordinate={[selectedCoords.longitude, selectedCoords.latitude]}
          >
            <Ionicons name="pin" size={32} color="#FFD700" />
          </Mapbox.MarkerView>
        )}
        {filteredPlaces.map(p => (
          <PlaceMarker 
            key={p.id} 
            place={p} 
            colors={colors} 
            onPress={() => setSelectedPlace(p)}
          />
        ))}
      </Mapbox.MapView>

      {/* Painel de Detalhes (Bottom Sheet) */}
      {selectedPlace && (() => {
        const claimer = (selectedPlace as any).profiles?.[0];
        const isClaimedAndVerified = claimer?.verified === true;
        return (
          <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <Text style={[styles.sheetTitle, { color: colors.textPrimary, marginBottom: 0 }]}>{selectedPlace.name}</Text>
                  {isClaimedAndVerified && (
                    <Ionicons name="shield-checkmark" size={18} color="#22c55e" />
                  )}
                </View>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  {selectedPlace.type === 'professional' ? 'Profissional Especializado' : 'Instituição de Apoio'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPlace(null)} style={styles.closeSheet}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.badgesRow}>
              {isClaimedAndVerified && (
                <View style={[styles.badge, { backgroundColor: '#22c55e15' }]}>
                  <Ionicons name="shield" size={14} color="#22c55e" />
                  <Text style={[styles.badgeText, { color: '#22c55e' }]}>Página Oficial</Text>
                </View>
              )}
            {/* Distance badge when 'Próximos' filter is active */}
            {activeFilter === 'Próximos' && location && (() => {
              const dist = getDistanceKm(
                location.coords.latitude,
                location.coords.longitude,
                Number(selectedPlace.latitude),
                Number(selectedPlace.longitude),
              );
              const label = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
              return (
                <View style={[styles.badge, { backgroundColor: '#10b98115' }]}>
                  <Ionicons name="navigate-circle" size={16} color="#10b981" />
                  <Text style={[styles.badgeText, { color: '#10b981' }]}>{label}</Text>
                </View>
              );
            })()}
            {accessibilityBadges.length > 0 ? accessibilityBadges.map((badge) => (
              <View key={badge.key} style={[styles.badge, { backgroundColor: badge.background }] }>
                <Ionicons name={badge.icon} size={16} color={badge.color} />
                <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            )) : (
              <View style={[styles.badge, { backgroundColor: colors.border }] }>
                <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>Acessibilidade por confirmar</Text>
              </View>
            )}
          </View>

          <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
            {selectedPlace.description || 'Este local está preparado para receber pessoas com necessidades específicas, garantindo um ambiente seguro e acolhedor.'}
          </Text>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.mainAction, { backgroundColor: colors.primary }] } onPress={openDirections}>
              <Ionicons name="navigate" size={20} color="#FFF" />
              <Text style={styles.mainActionText}>Como chegar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryAction, { borderColor: colors.border }]}
              onPress={() => {
                const phone = selectedPlace?.phone;
                if (phone) {
                  Linking.openURL(`tel:${phone}`);
                } else {
                  Alert.alert('Sem contacto', 'Este local não tem número de telefone registado.');
                }
              }}
            >
              <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border }]} onPress={handleToggleFavorite}>
              <Ionicons name={isSelectedFavorite ? 'heart' : 'heart-outline'} size={20} color={isSelectedFavorite ? '#ef4444' : colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.secondaryAction, { borderColor: colors.border }]}
              onPress={() => {
                setSelectedPlace(null);
                navigation.navigate('PlaceProfile', { placeId: selectedPlace.id, place: selectedPlace });
              }}
            >
              <Ionicons name="information-circle-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        );
      })()}

      {/* Top UI: Search and Filters Button */}
      <View style={styles.topContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Pesquisar..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(value) => {
              setSearchQuery(value);
              if (!value.trim()) {
                setSmartResults(null);
              }
            }}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            onSubmitEditing={handleSmartSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSmartSearch} style={styles.filterBtn}>
            {smartSearching ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <MaterialCommunityIcons name="creation" size={20} color={smartResults ? colors.accent : colors.textSecondary} />
            )}
          </TouchableOpacity>
          <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 10 }} />
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
             <Ionicons name="options" size={20} color={activeFilter !== 'Todos' ? colors.accent : colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Indicador de carregamento em background discreto */}
        {(placesLoading || locationLoading) && (
          <View style={[styles.miniLoader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.miniLoaderText, { color: colors.textSecondary }]}>
              {placesLoading ? 'A obter locais...' : 'A obter localização...'}
            </Text>
          </View>
        )}

        {(smartResults || activeFilter === 'Favoritos' || activeFilter === 'Próximos') && (
          <View style={[styles.smartHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.smartHintText, { color: colors.textSecondary }]}>
              {smartResults
                ? `Pesquisa inteligente activa: ${filteredPlaces.length} resultado(s)`
                : activeFilter === 'Próximos'
                ? `${filteredPlaces.length} locais mais próximos`
                : `Filtro de favoritos activo: ${filteredPlaces.length} local(is)`}
            </Text>
          </View>
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowFilterModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Filtrar por tipo</Text>
            {FILTERS.map(f => (
              <TouchableOpacity 
                key={f} 
                onPress={() => {
                  setActiveFilter(f);
                  setShowFilterModal(false);
                }}
                style={[
                  styles.filterOption,
                  activeFilter === f && { backgroundColor: colors.background }
                ]}
              >
                <Text style={[
                  styles.filterOptionText, 
                  { color: activeFilter === f ? colors.accent : colors.textPrimary }
                ]}>{f}</Text>
                {activeFilter === f && <Ionicons name="checkmark" size={20} color={colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Side Actions */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} onPress={fetchData}>
          <Ionicons name="refresh" size={24} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.card }]} onPress={centerOnUser}>
          <Ionicons name="locate" size={24} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {showSuggestBtn && selectedCoords && (
        <View style={styles.suggestContainer}>
          <TouchableOpacity
            style={[styles.suggestButton, { backgroundColor: colors.accent }]}
            onPress={() => {
              setShowSuggestBtn(false);
              navigation.navigate('SuggestPlace', {
                pickedCoords: { lat: selectedCoords.latitude, lng: selectedCoords.longitude }
              });
            }}
          >
            <Ionicons name="add-circle" size={24} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.suggestButtonText}>Deseja sugerir local?</Text>
          </TouchableOpacity>
          <TouchableOpacity
             style={styles.closeSuggest}
             onPress={() => setShowSuggestBtn(false)}
          >
            <Ionicons name="close" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];



const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: FontSize.l, fontFamily: FontFamily.poppinsSemiBold },
  errorText: { fontSize: FontSize.l, color: '#FF5252', textAlign: 'center', padding: 30, fontFamily: FontFamily.poppinsRegular },
  
  topContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 55,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  smartHint: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  smartHintText: {
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsMedium,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.l,
    paddingVertical: 10,
    fontFamily: FontFamily.poppinsRegular,
  },
  filtersScroll: {
    marginTop: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
  },
  filterText: {
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsSemiBold,
  },
  sideActions: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    gap: 12,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    elevation: 4,
  },
  filterBtn: {
    padding: 10,
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.poppinsBold,
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 8,
  },
  filterOptionText: {
    fontSize: FontSize.l,
    fontFamily: FontFamily.poppinsSemiBold,
  },
  suggestContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  suggestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  suggestButtonText: {
    color: '#FFF',
    fontSize: FontSize.m,
    fontFamily: FontFamily.poppinsBold,
  },
  closeSuggest: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 45,
    height: 45,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Bottom Sheet Styles
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingTop: 12,
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    zIndex: 100,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FontSize.xxxl,
    fontFamily: FontFamily.poppinsBold,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsMedium,
    opacity: 0.7,
  },
  closeSheet: {
    padding: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsSemiBold,
  },
  sheetDesc: {
    fontSize: FontSize.s,
    lineHeight: 22,
    fontFamily: FontFamily.poppinsRegular,
    marginBottom: 24,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  mainAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 10,
  },
  mainActionText: {
    color: '#FFF',
    fontSize: FontSize.l,
    fontFamily: FontFamily.poppinsBold,
  },
  secondaryAction: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  miniLoaderText: {
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsMedium,
  },
});
