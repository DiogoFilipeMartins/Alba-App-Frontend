import React, { useState, useEffect, memo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, TextInput, ScrollView, Platform, Modal, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiService, Place } from '../services/apiService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Props = BottomTabScreenProps<MainTabParamList, 'Map'>;

  // Removed Professional interface in favor of Place from apiService

// Componente de Marcador Memoizado para Performance
const PlaceMarker = memo(({ place, colors, onPress }: { place: any, colors: any, onPress: () => void }) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  // Desativar monitorização de mudanças após o render inicial para ganhar performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const lat = parseFloat(place.latitude || place.lat);
  const lng = parseFloat(place.longitude || place.lng);

  if (isNaN(lat) || isNaN(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
    >
      <View style={[styles.customMarker, { backgroundColor: place.type === 'professional' ? colors.accent : '#3b82f6' }]}>
        <Ionicons name={place.type === 'professional' ? 'medical' : 'business'} size={14} color="#FFF" />
      </View>
    </Marker>
  );
});

export default function MapScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showSuggestBtn, setShowSuggestBtn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const mapRef = React.useRef<MapView | null>(null);

  const FILTERS = ['Todos', 'Profissional', 'Instituição'];

  const fetchData = async () => {
    try {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão de acesso à localização negada.');
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const data = await apiService.getPlaces({ status: 'approved' });
      console.log('[Frontend] Dados recebidos do servidor:', data);
      setPlaces(data);

    } catch (error) {
      console.error('Erro ao obter localização ou dados:', error);
      setErrorMsg('Ocorreu um erro ao carregar os dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPlaces = places.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const filterType = activeFilter === 'Profissional' ? 'professional' : activeFilter === 'Instituição' ? 'institution' : 'Todos';
    const matchesFilter = filterType === 'Todos' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  console.log(`[Frontend] Locais após filtro: ${filteredPlaces.length}`);

  const centerOnUser = async () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    }
  };

  if (loading) {
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
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: 38.7223,
          longitude: -9.1393,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        customMapStyle={isDark ? darkMapStyle : []}
        onLongPress={(e) => {
          setSelectedCoords(e.nativeEvent.coordinate);
          setShowSuggestBtn(true);
        }}
        onPress={() => {
          setSelectedPlace(null);
          if (showSuggestBtn) setShowSuggestBtn(false);
        }}
      >
        {selectedCoords && showSuggestBtn && (
          <Marker
            coordinate={selectedCoords}
            pinColor="#FFD700"
            title="Local selecionado"
          />
        )}
        {filteredPlaces.map(p => (
          <PlaceMarker 
            key={p.id} 
            place={p} 
            colors={colors} 
            onPress={() => setSelectedPlace(p)}
          />
        ))}
      </MapView>

      {/* Painel de Detalhes (Bottom Sheet) */}
      {selectedPlace && (
        <View style={[styles.bottomSheet, { backgroundColor: colors.card }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{selectedPlace.name}</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                {selectedPlace.type === 'professional' ? 'Profissional Especializado' : 'Instituição de Apoio'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedPlace(null)} style={styles.closeSheet}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="volume-mute" size={16} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Silêncio</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: '#3b82f615' }]}>
              <Ionicons name="sunny" size={16} color="#3b82f6" />
              <Text style={[styles.badgeText, { color: '#3b82f6' }]}>Luz Suave</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="ribbon" size={16} color={colors.accent} />
              <Text style={[styles.badgeText, { color: colors.accent }]}>Acessível</Text>
            </View>
          </View>

          <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
            {selectedPlace.description || 'Este local está preparado para receber pessoas com necessidades específicas, garantindo um ambiente seguro e acolhedor.'}
          </Text>

          <View style={styles.sheetActions}>
            <TouchableOpacity style={[styles.mainAction, { backgroundColor: colors.primary }]}>
              <Ionicons name="navigate" size={20} color="#FFF" />
              <Text style={styles.mainActionText}>Como chegar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border }]}>
              <Ionicons name="heart-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: 10 }} />
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
             <Ionicons name="options" size={20} color={activeFilter !== 'Todos' ? colors.accent : colors.textSecondary} />
          </TouchableOpacity>
        </View>
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
  loadingText: { marginTop: 15, fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  errorText: { fontSize: 16, color: '#FF5252', textAlign: 'center', padding: 30, fontFamily: 'Poppins_400Regular' },
  
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
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
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
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
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
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
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
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
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
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
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
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
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  sheetDesc: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
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
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  secondaryAction: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
