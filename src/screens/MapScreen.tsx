import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiService } from '../services/apiService';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { useTheme } from '../contexts/ThemeContext';

type Props = BottomTabScreenProps<MainTabParamList, 'Map'>;

interface Professional {
  id: string;
  name: string;
  specialty: string;
  latitude: number | null;
  longitude: number | null;
}

export default function MapScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permissão de acesso à localização negada.');
          setLoading(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);

        // Placeholder para exemplo
        setProfessionals([
          { id: '1', name: 'Dr. João', specialty: 'Terapia da Fala', latitude: loc.coords.latitude + 0.01, longitude: loc.coords.longitude + 0.01 },
          { id: '2', name: 'Dra. Maria', specialty: 'Psicologia', latitude: loc.coords.latitude - 0.01, longitude: loc.coords.longitude - 0.01 }
        ]);

      } catch (error) {
        console.error('Erro ao obter localização ou dados:', error);
        setErrorMsg('Ocorreu um erro ao carregar o mapa.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: location?.coords.latitude || 39.3999,
          longitude: location?.coords.longitude || -8.2245,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        customMapStyle={isDark ? darkMapStyle : []}
      >
        {professionals.map((prof: Professional) => (
          prof.latitude && prof.longitude ? (
            <Marker
              key={prof.id}
              coordinate={{ latitude: prof.latitude, longitude: prof.longitude }}
              title={prof.name}
              description={prof.specialty}
              pinColor={colors.accent}
            />
          ) : null
        ))}
      </MapView>
      <View style={[styles.header, { backgroundColor: colors.accent }]}>
         <Text style={styles.headerText}>Encontre Profissionais</Text>
      </View>
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
  container: { flex: 1, backgroundColor: '#020202' },
  map: { width: '100%', height: '100%' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020202' },
  loadingText: { marginTop: 10, fontSize: 18, color: '#16db65', fontWeight: 'bold' },
  errorText: { fontSize: 18, color: '#D8000C', fontWeight: 'bold', textAlign: 'center', padding: 20 },
  header: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: '#058c42', padding: 15, borderRadius: 12, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  headerText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }
});
