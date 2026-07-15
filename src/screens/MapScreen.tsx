import React, { useState, useEffect, memo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, Platform, Pressable, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomAlertModal from '../components/CustomAlertModal';
import { Map, Camera, UserLocation, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { resolveMapboxStyle } from '../utils/mapUtils';
import * as Location from 'expo-location';
import { apiService, Place } from '../services/apiService';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { favoritesService } from '../services/favoritesService';
import { FontSize, FontFamily } from '../theme/font';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Componente de Marcador Memoizado para Performance usando Marker do MapLibre
const PlaceMarker = memo(({ place, colors, onPress }: { place: any, colors: any, onPress: () => void }) => {
  const lat = parseFloat(place.latitude || place.lat);
  const lng = parseFloat(place.longitude || place.lng);

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker
      id={`marker-${place.id}`}
      lngLat={[lng, lat]}
    >
      <TouchableOpacity 
        onPress={onPress}
        style={[styles.customMarker, { backgroundColor: place.type === 'professional' ? colors.accent : '#3b82f6' }]}
      >
        <Ionicons name={place.type === 'professional' ? 'medical' : 'business'} size={14} color="#FFF" />
      </TouchableOpacity>
    </Marker>
  );
});

export default function MapScreen({ navigation, route }: Props) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [styleJSON, setStyleJSON] = useState<any>(null);
  const [styleReloadKey, setStyleReloadKey] = useState(0);
  const { colors, isDark } = useTheme();
  const { profile, isInstitution } = useAuth();
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
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const cameraRef = React.useRef<CameraRef | null>(null);
  const lastMarkerPressRef = React.useRef<number>(0);

  const FILTERS = ['Todos', 'Profissional', 'Instituição', 'Favoritos', 'Próximos'];

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    primaryButton?: { text: string; onPress: () => void; destructive?: boolean };
    secondaryButton?: { text: string; onPress: () => void };
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    icon?: keyof typeof Ionicons.glyphMap,
    iconColor?: string,
    primaryButton?: { text: string; onPress: () => void; destructive?: boolean },
    secondaryButton?: { text: string; onPress: () => void }
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      icon,
      iconColor,
      primaryButton,
      secondaryButton,
    });
  };

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
      const { status } = await Location.requestForegroundPermissionsAsync();
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
    // O token vem SEMPRE do backend (não embeber tokens no bundle da app).
    try {
      const res = await apiService.getMapboxToken();
      if (res && res.token && !res.token.startsWith('pk.mock_')) {
        setMapboxToken(res.token);
      } else {
        console.warn('[Mapbox] Backend não devolveu token válido.');
      }
    } catch (error) {
      console.error('[Mapbox] Erro ao obter token do backend.', error);
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
          cameraRef.current.easeTo({
            center: [lastKnown.coords.longitude, lastKnown.coords.latitude],
            zoom: 14,
            duration: 500,
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
        cameraRef.current.easeTo({
          center: [freshLoc.coords.longitude, freshLoc.coords.latitude],
          zoom: 14,
          duration: 800,
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

  useEffect(() => {
    if (mapboxToken) {
      const styleId = isDark ? 'dark-v11' : 'streets-v12';
      const url = `https://api.mapbox.com/styles/v1/mapbox/${styleId}?access_token=${mapboxToken}`;
      fetch(url)
        .then(res => res.json())
        .then(json => {
          setStyleJSON(resolveMapboxStyle(json, mapboxToken));
          setErrorMsg(null);
        })
        .catch(err => {
          console.error('[MapScreen] Erro ao buscar style JSON:', err);
          setErrorMsg('Não foi possível carregar o mapa. Verifica a ligação à internet e tenta novamente.');
        });
    }
  }, [mapboxToken, isDark, styleReloadKey]);

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
            cameraRef.current?.easeTo({
              center: [lng, lat],
              zoom: 15,
              duration: 800,
            });
          }, 200);
        }
        // Limpar parâmetros de rota para evitar que volte a focar acidentalmente
        navigation.setParams({ focusPlaceId: undefined } as any);
      }
    }
  }, [route.params?.focusPlaceId, places, navigation]);

  // Foco por coordenadas — funciona mesmo que o local não esteja na lista
  // carregada (ex.: perfil de instituição cujo place ainda não está no mapa).
  useEffect(() => {
    const coords = route.params?.focusCoords;
    if (coords && cameraRef.current) {
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        setTimeout(() => {
          cameraRef.current?.easeTo({
            center: [lng, lat],
            zoom: 15,
            duration: 800,
          });
        }, 250);
        navigation.setParams({ focusCoords: undefined } as any);
      }
    }
  }, [route.params?.focusCoords, navigation]);



  const handleToggleFavorite = async () => {
    if (!selectedPlace) {
      return;
    }

    const isFavoriteNow = await favoritesService.toggle(selectedPlace);
    await loadFavorites();
    showAlert(
      isFavoriteNow ? 'Local guardado' : 'Local removido',
      isFavoriteNow ? 'Este local foi adicionado aos teus favoritos.' : 'Este local foi removido dos teus favoritos.',
      isFavoriteNow ? 'heart' : 'heart-dislike-outline',
      isFavoriteNow ? '#ef4444' : colors.textMuted
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

  const placesToRender = places;

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


  const centerOnUser = async () => {
    if (location && cameraRef.current) {
      cameraRef.current.easeTo({
        center: [location.coords.longitude, location.coords.latitude],
        zoom: 14,
        duration: 1000,
      });
    }
  };

  // Erro tem de vir antes do gate de loading: sem style o gate abaixo ficava preso
  // em spinner eterno quando o fetch do style Mapbox falhava.
  if (errorMsg && !styleJSON) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity
          onPress={() => { setErrorMsg(null); setStyleReloadKey(k => k + 1); }}
          style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.accent }}
        >
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!mapboxToken || loading || !styleJSON) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.accent }]}>A carregar o mapa...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Map
        style={styles.map}
        mapStyle={styleJSON}
        onLongPress={(event) => {
          const [longitude, latitude] = event.nativeEvent.lngLat;
          setSelectedCoords({ latitude, longitude });
          setShowSuggestBtn(true);
        }}
        onPress={() => {
          if (Date.now() - lastMarkerPressRef.current < 500) {
            console.log('[MapScreen] Ignorando onPress do mapa devido a click recente no marcador');
            return;
          }
          setSelectedPlace(null);
          if (showSuggestBtn) setShowSuggestBtn(false);
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [-9.1393, 38.7223],
            zoom: 11,
          }}
        />
        <UserLocation />
        {selectedCoords && showSuggestBtn && (
          <Marker
            id="selected-coords"
            lngLat={[selectedCoords.longitude, selectedCoords.latitude]}
          >
            <Ionicons name="pin" size={32} color="#FFD700" />
          </Marker>
        )}
        {filteredPlaces.map(p => (
          <PlaceMarker 
            key={p.id} 
            place={p} 
            colors={colors} 
            onPress={() => {
              lastMarkerPressRef.current = Date.now();
              setSelectedPlace(p);
            }}
          />
        ))}
      </Map>

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

          <View style={styles.sheetActionsContainer}>
            {/* Row 1: Directions and View Profile */}
            <View style={styles.sheetActionsRow}>
              <TouchableOpacity 
                style={[styles.mainActionBtn, { backgroundColor: colors.primary }]} 
                onPress={openDirections}
              >
                <Ionicons name="navigate" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.mainActionBtnText}>Como chegar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.outlineActionBtn, { borderColor: colors.border }]} 
                onPress={() => {
                  setSelectedPlace(null);
                  navigation.navigate('PlaceProfile', { placeId: selectedPlace.id, place: selectedPlace });
                }}
              >
                <Ionicons name="information-circle-outline" size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.outlineActionBtnText, { color: colors.textPrimary }]}>Ver Perfil</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: Contact & Favorite */}
            <View style={styles.sheetActionsRow}>
              <TouchableOpacity 
                style={[styles.outlineActionBtn, { borderColor: colors.border }]} 
                onPress={() => {
                  const phone = selectedPlace?.phone;
                  if (phone) {
                    Linking.openURL(`tel:${phone}`);
                  } else {
                    showAlert('Sem contacto', 'Este local não tem número de telefone registado.', 'call-outline', colors.textMuted);
                  }
                }}
              >
                <Ionicons name="call-outline" size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={[styles.outlineActionBtnText, { color: colors.textPrimary }]}>Ligar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.outlineActionBtn, { borderColor: colors.border }]} 
                onPress={handleToggleFavorite}
              >
                <Ionicons 
                  name={isSelectedFavorite ? 'heart' : 'heart-outline'} 
                  size={18} 
                  color={isSelectedFavorite ? '#ef4444' : colors.textPrimary} 
                  style={{ marginRight: 6 }} 
                />
                <Text style={[styles.outlineActionBtnText, { color: colors.textPrimary }]}>
                  {isSelectedFavorite ? 'Favorito' : 'Favoritar'}
                </Text>
              </TouchableOpacity>
            </View>
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
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('Chatbot', { initialMessage: searchQuery.trim() || undefined })}
            style={styles.filterBtn}
          >
            <MaterialCommunityIcons name="creation" size={20} color={colors.accent} />
          </TouchableOpacity>
          <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 10 }} />
          <TouchableOpacity onPress={() => setShowFilterModal(v => !v)} style={styles.filterBtn}>
             <Ionicons name="options" size={20} color={activeFilter !== 'Todos' ? colors.accent : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Filter dropdown */}
        {showFilterModal && (
          <>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowFilterModal(false)} />
            <View style={[styles.filterDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => { setActiveFilter(f); setShowFilterModal(false); }}
                  style={[styles.filterDropdownItem, activeFilter === f && { backgroundColor: colors.accent + '18' }]}
                >
                  <Text style={[styles.filterDropdownText, { color: activeFilter === f ? colors.accent : colors.textPrimary }]}>{f}</Text>
                  {activeFilter === f && <Ionicons name="checkmark" size={16} color={colors.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        
        {/* Indicador de carregamento em background discreto */}
        {(placesLoading || locationLoading) && (
          <View style={[styles.miniLoader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.miniLoaderText, { color: colors.textSecondary }]}>
              {placesLoading ? 'A obter locais...' : 'A obter localização...'}
            </Text>
          </View>
        )}

        {(activeFilter === 'Favoritos' || activeFilter === 'Próximos') && (
          <View style={[styles.smartHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.smartHintText, { color: colors.textSecondary }]}>
              {activeFilter === 'Próximos'
                ? `${filteredPlaces.length} locais mais próximos`
                : `Filtro de favoritos activo: ${filteredPlaces.length} local(is)`}
            </Text>
          </View>
        )}
      </View>


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
              if (isInstitution && profile?.verified !== true) {
                showAlert(
                  'Acesso Restrito',
                  'O seu perfil de Instituição ainda está pendente de aprovação por um administrador. Não pode sugerir locais até que a sua conta seja aprovada.',
                  'lock-closed-outline',
                  '#f59e0b'
                );
                return;
              }
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
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
        primaryButton={alertConfig.primaryButton}
        secondaryButton={alertConfig.secondaryButton}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
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
  filterDropdown: {
    position: 'absolute',
    top: 65,
    right: 20,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 6,
    minWidth: 180,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  filterDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 1,
  },
  filterDropdownText: {
    fontSize: FontSize.m,
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
  sheetActionsContainer: {
    gap: 10,
    marginBottom: 12,
    width: '100%',
  },
  sheetActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  mainActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
  },
  mainActionBtnText: {
    color: '#FFF',
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsBold,
  },
  outlineActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  outlineActionBtnText: {
    fontSize: FontSize.s,
    fontFamily: FontFamily.poppinsSemiBold,
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
