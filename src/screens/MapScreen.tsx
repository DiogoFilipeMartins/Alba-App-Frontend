import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiService } from '../services/apiService';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Map'>;

interface Professional {
  id: string;
  name: string;
  specialty: string;
  latitude: number | null;
  longitude: number | null;
}

export default function MapScreen({ navigation }: Props) {
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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16db65" />
        <Text style={styles.loadingText}>A carregar o mapa...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        customMapStyle={minimalistMapStyle}
      >
        {professionals.map((prof: Professional) => (
          prof.latitude && prof.longitude ? (
            <Marker
              key={prof.id}
              coordinate={{ latitude: prof.latitude, longitude: prof.longitude }}
              title={prof.name}
              description={prof.specialty}
              pinColor="#16db65"
            />
          ) : null
        ))}
      </MapView>
      <View style={styles.header}>
         <Text style={styles.headerText}>Encontre Profissionais</Text>
      </View>
    </View>
  );
}

const minimalistMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#020202" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#16db65" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#000000" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#058c42" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#020202" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#0d2818" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#058c42" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0d2818" }] }
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
